import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readImageSpec, readLink, SPEC_SCHEMA_URL } from "@tin.so/core";
import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { type Io, main } from "../src/main.ts";

vi.mock(import("node:child_process"));

type TestIo = Io & { output: () => string; errors: () => string };

let cwd: string;

/** An Io for a test. Without stdin text, stdin is a terminal. With it, stdin is a pipe. */
function createIo(
  stdin?: string,
  system: { platform?: string; env?: Record<string, string>; color?: boolean } = {},
): TestIo {
  let stdout = "";
  let stderr = "";
  return {
    cwd,
    env: { TIN_APP_URL: "https://example.com/", ...system.env },
    platform: system.platform ?? "darwin",
    color: system.color ?? false,
    stdinIsTTY: stdin === undefined,
    readStdin: async () => stdin ?? "",
    stdout: (text) => (stdout += text),
    stderr: (text) => (stderr += text),
    output: () => stdout,
    errors: () => stderr,
  };
}

function pngSize(png: Uint8Array): { width: number; height: number } {
  const view = new DataView(png.buffer, png.byteOffset);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

type ToolRun = { command: string; args: Array<string>; data: Buffer | undefined };

/**
 * Replaces the clipboard and browser tools with fakes. Only the installed tools start. Each one
 * records its arguments and the data that it gets on stdin or from the file in its arguments or
 * its environment.
 */
function fakeTools(installed: Array<string>): Array<ToolRun> {
  const runs: Array<ToolRun> = [];
  vi.mocked(spawn).mockImplementation(((command: string, args: Array<string>, options: any) => {
    const child = new EventEmitter() as any;
    child.stderr = null;
    child.stdin = null;
    const finish = (data: Buffer | undefined) => {
      runs.push({ command, args, data });
      child.emit("exit", 0, null);
    };
    if (!installed.includes(command)) {
      const error = Object.assign(new Error(`spawn ${command} ENOENT`), { code: "ENOENT" });
      setImmediate(() => child.emit("error", error));
    } else if (options.stdio[0] === "pipe") {
      child.stdin = {
        on: () => {},
        end: (data: Uint8Array) => setImmediate(() => finish(Buffer.from(data))),
      };
    } else {
      const file =
        options.env?.TIN_CLIPBOARD_FILE ?? (command === "osascript" ? args.at(-1) : undefined);
      setImmediate(() => finish(file ? readFileSync(file) : undefined));
    }
    return child;
  }) as any);
  return runs;
}

beforeEach(async () => {
  vi.mocked(spawn).mockReset();
  cwd = await mkdtemp(join(tmpdir(), "tin-cli-"));
  await writeFile(join(cwd, "main.ts"), 'import plans from "./plans.toml";\n');
  await writeFile(join(cwd, "plans.toml"), "[free]\nprice = 0\n");
});

describe("render", () => {
  test("should render code files as panes of one window", async () => {
    // Arrange
    const io = createIo();

    // Act
    const code = await main(
      ["render", "main.ts", "plans.toml", "--tabs", "--controls", "color", "--json"],
      io,
    );

    // Assert
    expect(code).toBe(0);
    const result = JSON.parse(io.output());
    expect(result.file).toBe(join(cwd, "main.png"));
    const png = await readFile(result.file);
    expect(pngSize(png)).toEqual({ width: result.width, height: result.height });
    const spec = (await readLink(result.link)) as any;
    expect(spec.windows.length).toBe(1);
    expect(spec.windows[0].tabs).toBe(true);
    expect(spec.windows[0].controls).toBe("color");
    expect(spec.windows[0].panes.map((pane: any) => pane.title)).toEqual(["main.ts", "plans.toml"]);
  });

  test("should put each file in its own window", async () => {
    // Arrange
    const io = createIo();

    // Act
    await main(
      [
        "render",
        "main.ts",
        "plans.toml",
        "--windows",
        "--theme",
        "midnight",
        "--aspect-ratio",
        "16:9",
        "--json",
      ],
      io,
    );

    // Assert
    const result = JSON.parse(io.output());
    expect(result.width / result.height).toBeCloseTo(16 / 9, 2);
    const spec = (await readLink(result.link)) as any;
    expect(spec.theme).toBe("midnight");
    expect(spec.windows.length).toBe(2);
  });

  test("should render a spec from stdin to an SVG", async () => {
    // Arrange
    const io = createIo(
      JSON.stringify({
        $schema: SPEC_SCHEMA_URL,
        windows: [{ panes: [{ title: "a.py", code: "print(1)" }] }],
      }),
    );

    // Act
    const code = await main(["render", "-", "-o", "out.svg"], io);

    // Assert
    expect(code).toBe(0);
    const svg = await readFile(join(cwd, "out.svg"), "utf8");
    expect(svg.startsWith("<svg")).toBe(true);
    expect(io.output()).toContain("Edit: https://example.com/#spec=");
  });

  test("should let options override the spec", async () => {
    // Arrange
    await writeFile(
      join(cwd, "spec.json"),
      JSON.stringify({ theme: "candy", windows: [{ panes: [{ code: "x" }] }] }),
    );
    const io = createIo();

    // Act
    await main(["render", "spec.json", "--theme", "noir", "--no-background", "--json"], io);

    // Assert
    const result = JSON.parse(io.output());
    expect(result.file).toBe(join(cwd, "spec.png"));
    const spec = (await readLink(result.link)) as any;
    expect(spec.theme).toBe("noir");
    expect(spec.background).toBe(false);
  });

  test("should report every issue of an invalid spec", async () => {
    // Arrange
    const io = createIo(
      JSON.stringify({
        $schema: SPEC_SCHEMA_URL,
        theme: "nope",
        windows: [{ panes: [{ code: "x", color: "red" }] }],
      }),
    );

    // Act
    const code = await main(["render", "-"], io);

    // Assert
    expect(code).toBe(1);
    expect(io.errors()).toContain("theme: expected one of");
    expect(io.errors()).toContain("windows.0.panes.0.color");
  });

  test("should report a file that does not exist", async () => {
    // Arrange
    const io = createIo();

    // Act
    const code = await main(["render", "missing.ts"], io);

    // Assert
    expect(code).toBe(1);
    expect(io.errors()).toContain("missing.ts");
  });

  test("should report an unknown option", async () => {
    // Arrange
    const io = createIo();

    // Act
    const code = await main(["render", "main.ts", "--colour", "red"], io);

    // Assert
    expect(code).toBe(1);
    expect(io.errors()).toContain("--colour");
  });

  test.each(["0", "-1"])("should report a scale of %s", async (scale) => {
    // Arrange
    const io = createIo();

    // Act
    const code = await main(["render", "main.ts", "--scale", scale], io);

    // Assert
    expect(code).toBe(1);
    expect(io.errors()).toContain("--scale");
  });

  test("should not write the image over its input file", async () => {
    // Arrange
    const source = '<svg xmlns="http://www.w3.org/2000/svg"/>\n';
    await writeFile(join(cwd, "logo.svg"), source);
    const io = createIo();

    // Act
    const code = await main(["render", "logo.svg", "--format", "svg"], io);

    // Assert
    expect(code).toBe(1);
    expect(io.errors()).toContain("-o");
    expect(await readFile(join(cwd, "logo.svg"), "utf8")).toBe(source);
  });
});

describe("render metadata", () => {
  test("should write the spec into the image", async () => {
    // Arrange
    const io = createIo();

    // Act
    await main(["render", "main.ts", "--json"], io);

    // Assert
    const result = JSON.parse(io.output());
    const spec = (await readImageSpec(await readFile(result.file))) as any;
    expect(spec.windows[0].panes[0].title).toBe("main.ts");
  });

  test("should write no spec into the image with --no-metadata", async () => {
    // Arrange
    const io = createIo();

    // Act
    await main(["render", "main.ts", "--no-metadata", "--json"], io);

    // Assert
    const result = JSON.parse(io.output());
    const spec = await readImageSpec(await readFile(result.file));
    expect(spec).toBe(undefined);
  });
});

describe("render --code", () => {
  test("should render code from stdin with the title as file name", async () => {
    // Arrange
    const io = createIo("const a = 1;\n");

    // Act
    const code = await main(
      ["render", "--code", "-", "--title", "main.ts", "--tabs", "--json"],
      io,
    );

    // Assert
    expect(code).toBe(0);
    const result = JSON.parse(io.output());
    expect(result.file).toBe(join(cwd, "main.png"));
    const png = await readFile(result.file);
    expect(pngSize(png)).toEqual({ width: result.width, height: result.height });
    const spec = (await readLink(result.link)) as any;
    expect(spec.windows).toEqual([
      { tabs: true, panes: [{ title: "main.ts", code: "const a = 1;\n" }] },
    ]);
  });

  test("should set the language of code without a title", async () => {
    // Arrange
    const io = createIo("print(1)");

    // Act
    const code = await main(["render", "--code", "-", "--language", "python"], io);

    // Assert
    expect(code).toBe(0);
    const files = await readdir(cwd);
    expect(files.includes("tin.png")).toBe(true);
    expect(io.output()).toContain("Edit: https://example.com/#spec=");
  });

  test("should render the text of the option as code", async () => {
    // Arrange
    const io = createIo();

    // Act
    await main(["render", "--code", "x = 1", "--language", "py", "--json"], io);

    // Assert
    const result = JSON.parse(io.output());
    const spec = (await readLink(result.link)) as any;
    expect(spec.windows[0].panes).toEqual([{ language: "py", code: "x = 1" }]);
  });

  test("should read the text of --code - as code, also a spec", async () => {
    // Arrange
    const text = JSON.stringify({ $schema: SPEC_SCHEMA_URL, windows: [] });
    const io = createIo(text);

    // Act
    const code = await main(["--code", "-", "--json"], io);

    // Assert
    expect(code).toBe(0);
    const spec = (await readLink(JSON.parse(io.output()).link)) as any;
    expect(spec.windows[0].panes).toEqual([{ language: "json", code: text }]);
  });

  test("should reject --code together with input files", async () => {
    // Arrange
    const io = createIo("x");

    // Act
    const code = await main(["render", "main.ts", "--code", "-"], io);

    // Assert
    expect(code).toBe(1);
    expect(io.errors()).toContain("--code cannot be used with input files");
  });
});

describe("render --copy", () => {
  test("should copy the PNG to the clipboard on macOS and write no file", async () => {
    // Arrange
    const copies = fakeTools(["osascript"]);
    const io = createIo("const a = 1;", { platform: "darwin" });

    // Act
    const code = await main(["render", "--code", "-", "--title", "a.ts", "--copy", "--json"], io);

    // Assert
    expect(code).toBe(0);
    const result = JSON.parse(io.output());
    expect(result.file).toBe(null);
    expect(result.copied).toBe(true);
    expect(result.link.startsWith("https://example.com/#spec=")).toBe(true);
    expect((await readdir(cwd)).sort()).toEqual(["main.ts", "plans.toml"]);
    expect(copies.length).toBe(1);
    expect(copies[0]!.command).toBe("osascript");
    expect(pngSize(copies[0]!.data!)).toEqual({ width: result.width, height: result.height });
  });

  test("should write the file and copy the image with -o", async () => {
    // Arrange
    const copies = fakeTools(["powershell.exe"]);
    const io = createIo("", { platform: "win32" });

    // Act
    const code = await main(["render", "main.ts", "--copy", "-o", "out.png"], io);

    // Assert
    expect(code).toBe(0);
    const png = await readFile(join(cwd, "out.png"));
    expect(copies[0]!.data!.equals(png)).toBe(true);
    const lines = io.output().split("\n");
    expect(lines[0]!.startsWith(`Saved ${join(cwd, "out.png")}`)).toBe(true);
    expect(lines[1]!.startsWith("Copied the image to the clipboard")).toBe(true);
    expect(lines[2]!.startsWith("Edit: https://example.com/#spec=")).toBe(true);
  });

  test("should use xclip on Wayland when wl-copy is not installed", async () => {
    // Arrange
    const copies = fakeTools(["xclip"]);
    const io = createIo("", { platform: "linux", env: { WAYLAND_DISPLAY: "wayland-0" } });

    // Act
    const code = await main(["render", "main.ts", "--copy"], io);

    // Assert
    expect(code).toBe(0);
    const commands = vi.mocked(spawn).mock.calls.map((call) => call[0]);
    expect(commands).toEqual(["wl-copy", "xclip"]);
    expect(copies.map((copy) => copy.command)).toEqual(["xclip"]);
  });

  test("should fail when no clipboard tool is installed", async () => {
    // Arrange
    fakeTools([]);
    const io = createIo("", { platform: "linux" });

    // Act
    const code = await main(["render", "main.ts", "--copy"], io);

    // Assert
    expect(code).toBe(1);
    expect(io.errors()).toContain("install wl-clipboard (Wayland) or xclip (X11)");
  });

  test("should reject --copy for an SVG", async () => {
    // Arrange
    const io = createIo();

    // Act
    const code = await main(["render", "main.ts", "--copy", "-o", "out.svg"], io);

    // Assert
    expect(code).toBe(1);
    expect(io.errors()).toContain("--copy needs a PNG");
    expect(vi.mocked(spawn).mock.calls.length).toBe(0);
  });
});

describe("link", () => {
  test("should print a link for code from stdin", async () => {
    // Arrange
    const io = createIo("[free]\nprice = 0\n");

    // Act
    const code = await main(["link", "--code", "-", "--title", "plans.toml"], io);

    // Assert
    expect(code).toBe(0);
    const spec = (await readLink(io.output().trim())) as any;
    expect(spec.windows[0].panes).toEqual([{ title: "plans.toml", code: "[free]\nprice = 0\n" }]);
  });
});

describe("default command", () => {
  test("should render code files without the render command", async () => {
    // Arrange
    const io = createIo();

    // Act
    const code = await main(["main.ts", "plans.toml", "--json"], io);

    // Assert
    expect(code).toBe(0);
    const result = JSON.parse(io.output());
    expect(result.file).toBe(join(cwd, "main.png"));
    const spec = (await readLink(result.link)) as any;
    expect(spec.windows[0].panes.map((pane: any) => pane.title)).toEqual(["main.ts", "plans.toml"]);
  });

  test("should render code from stdin without an input argument", async () => {
    // Arrange
    const io = createIo("const a = 1;\n");

    // Act
    const code = await main(["--title", "main.ts", "--json"], io);

    // Assert
    expect(code).toBe(0);
    const result = JSON.parse(io.output());
    expect(result.file).toBe(join(cwd, "main.png"));
    const spec = (await readLink(result.link)) as any;
    expect(spec.windows).toEqual([{ panes: [{ title: "main.ts", code: "const a = 1;\n" }] }]);
  });

  test("should accept options before the input", async () => {
    // Arrange
    const copies = fakeTools(["osascript"]);
    const io = createIo();

    // Act
    const code = await main(["--theme", "vercel", "--copy", "main.ts", "--json"], io);

    // Assert
    expect(code).toBe(0);
    const result = JSON.parse(io.output());
    expect(result.copied).toBe(true);
    expect(copies.length).toBe(1);
    const spec = (await readLink(result.link)) as any;
    expect(spec.theme).toBe("vercel");
    expect(spec.windows[0].panes[0].title).toBe("main.ts");
  });

  test("should run the command when a file has the name of the command", async () => {
    // Arrange
    await writeFile(join(cwd, "themes"), "candy\n");
    const command = createIo();
    const file = createIo();

    // Act
    const commandCode = await main(["themes"], command);
    const fileCode = await main(["./themes", "--json"], file);

    // Assert
    expect(commandCode).toBe(0);
    const lines = command.output().split("\n");
    expect(lines.some((line) => line.startsWith("candy "))).toBe(true);
    expect(fileCode).toBe(0);
    expect(JSON.parse(file.output()).file).toBe(join(cwd, "themes.png"));
  });

  test("should fail without input when stdin is a terminal", async () => {
    // Arrange
    const io = createIo();

    // Act
    const code = await main(["--theme", "vercel"], io);

    // Assert
    expect(code).toBe(1);
    expect(io.errors()).toContain("No input.");
  });

  test("should reject --title for code files", async () => {
    // Arrange
    const io = createIo();

    // Act
    const code = await main(["main.ts", "--title", "a.ts"], io);

    // Assert
    expect(code).toBe(1);
    expect(io.errors()).toContain("--title and --language are for code from stdin or --code");
  });
});

describe("spec detection", () => {
  test("should read JSON on stdin with the tin $schema as a spec", async () => {
    // Arrange
    const hosted = createIo(
      JSON.stringify({ $schema: SPEC_SCHEMA_URL, windows: [{ panes: [{ code: "x" }] }] }),
    );
    const app = createIo(
      JSON.stringify({
        $schema: "https://example.com/schema/v1.json",
        windows: [{ panes: [{ code: "y" }] }],
      }),
    );

    // Act
    await main(["--json"], hosted);
    await main(["--json"], app);

    // Assert
    const hostedSpec = (await readLink(JSON.parse(hosted.output()).link)) as any;
    const appSpec = (await readLink(JSON.parse(app.output()).link)) as any;
    expect(hostedSpec.windows[0].panes).toEqual([{ code: "x" }]);
    expect(appSpec.windows[0].panes).toEqual([{ code: "y" }]);
  });

  test("should read other JSON on stdin as code with the language json", async () => {
    // Arrange
    const text = '{\n  "name": "tin.so"\n}\n';
    const io = createIo(text);

    // Act
    const code = await main(["--json"], io);

    // Assert
    expect(code).toBe(0);
    const result = JSON.parse(io.output());
    expect(result.file).toBe(join(cwd, "tin.png"));
    const spec = (await readLink(result.link)) as any;
    expect(spec.windows[0].panes).toEqual([{ language: "json", code: text }]);
  });

  test("should take the language of JSON on stdin from the title", async () => {
    // Arrange
    const io = createIo('{ "name": "tin.so" }');

    // Act
    await main(["--title", "package.json", "--json"], io);

    // Assert
    const spec = (await readLink(JSON.parse(io.output()).link)) as any;
    expect(spec.windows[0].panes).toEqual([
      { title: "package.json", code: '{ "name": "tin.so" }' },
    ]);
  });

  test("should read a spec on stdin without $schema as code and give a hint", async () => {
    // Arrange
    const io = createIo(JSON.stringify({ windows: [{ panes: [{ code: "x" }] }] }));

    // Act
    const code = await main(["--json"], io);

    // Assert
    expect(code).toBe(0);
    const spec = (await readLink(JSON.parse(io.output()).link)) as any;
    expect(spec.windows[0].panes[0].language).toBe("json");
    expect(io.errors()).toContain("--spec");
  });

  test("should read a .json file with windows and without $schema as a spec", async () => {
    // Arrange
    await writeFile(
      join(cwd, "old.json"),
      JSON.stringify({ windows: [{ panes: [{ code: "x" }] }] }),
    );
    const io = createIo();

    // Act
    const code = await main(["old.json", "--json"], io);

    // Assert
    expect(code).toBe(0);
    const result = JSON.parse(io.output());
    expect(result.file).toBe(join(cwd, "old.png"));
    const spec = (await readLink(result.link)) as any;
    expect(spec.windows[0].panes).toEqual([{ code: "x" }]);
  });

  test("should read a .json file that is not a spec as code", async () => {
    // Arrange
    await writeFile(join(cwd, "package.json"), '{ "name": "tin.so" }\n');
    const io = createIo();

    // Act
    const code = await main(["package.json", "--json"], io);

    // Assert
    expect(code).toBe(0);
    const result = JSON.parse(io.output());
    expect(result.file).toBe(join(cwd, "package.png"));
    const spec = (await readLink(result.link)) as any;
    expect(spec.windows[0].panes).toEqual([
      { title: "package.json", code: '{ "name": "tin.so" }\n' },
    ]);
  });

  test("should read stdin and files as a spec with --spec", async () => {
    // Arrange
    const json = JSON.stringify({ windows: [{ panes: [{ code: "x" }] }] });
    await writeFile(join(cwd, "spec.txt"), json);
    const stdin = createIo(json);
    const file = createIo();

    // Act
    await main(["--spec", "--json"], stdin);
    await main(["spec.txt", "--spec", "--json"], file);

    // Assert
    const stdinSpec = (await readLink(JSON.parse(stdin.output()).link)) as any;
    const fileSpec = (await readLink(JSON.parse(file.output()).link)) as any;
    expect(stdinSpec.windows[0].panes).toEqual([{ code: "x" }]);
    expect(fileSpec.windows[0].panes).toEqual([{ code: "x" }]);
  });

  test("should say that the input is not JSON with --spec", async () => {
    // Arrange
    const io = createIo("const a = 1;");

    // Act
    const code = await main(["--spec"], io);

    // Assert
    expect(code).toBe(1);
    expect(io.errors()).toContain("--spec needs a JSON spec, but stdin is not valid JSON");
  });

  test("should read a spec as code with --no-spec", async () => {
    // Arrange
    const json = JSON.stringify({ $schema: SPEC_SCHEMA_URL, windows: [] });
    await writeFile(join(cwd, "spec.json"), json);
    const stdin = createIo(json);
    const file = createIo();

    // Act
    await main(["--no-spec", "--json"], stdin);
    await main(["spec.json", "--no-spec", "--json"], file);

    // Assert
    const stdinSpec = (await readLink(JSON.parse(stdin.output()).link)) as any;
    const fileSpec = (await readLink(JSON.parse(file.output()).link)) as any;
    expect(stdinSpec.windows[0].panes).toEqual([{ language: "json", code: json }]);
    expect(fileSpec.windows[0].panes).toEqual([{ title: "spec.json", code: json }]);
  });
});

describe("link actions", () => {
  test("should copy the link text on macOS", async () => {
    // Arrange
    const runs = fakeTools(["pbcopy"]);
    const io = createIo(undefined, { platform: "darwin" });

    // Act
    const code = await main(["link", "main.ts", "--copy"], io);

    // Assert
    expect(code).toBe(0);
    const link = io.output().trim();
    expect(link.startsWith("https://example.com/#spec=")).toBe(true);
    expect(runs.length).toBe(1);
    expect(runs[0]!.command).toBe("pbcopy");
    expect(runs[0]!.data!.toString()).toBe(link);
    expect(io.errors()).toBe("Copied the link to the clipboard\n");
  });

  test("should copy the link text with xclip on Linux", async () => {
    // Arrange
    const runs = fakeTools(["xclip"]);
    const io = createIo(undefined, { platform: "linux" });

    // Act
    const code = await main(["link", "main.ts", "-c"], io);

    // Assert
    expect(code).toBe(0);
    expect(runs.length).toBe(1);
    expect(runs[0]!.args).toEqual(["-selection", "clipboard", "-in"]);
    expect(runs[0]!.data!.toString()).toBe(io.output().trim());
  });

  test("should open the link in the browser on macOS", async () => {
    // Arrange
    fakeTools(["open"]);
    const io = createIo(undefined, { platform: "darwin" });

    // Act
    const code = await main(["link", "main.ts", "--open"], io);

    // Assert
    expect(code).toBe(0);
    const [command, args] = vi.mocked(spawn).mock.calls[0]!;
    expect([command, args]).toEqual(["open", [io.output().trim()]]);
  });

  test("should open the link in the browser on Linux", async () => {
    // Arrange
    fakeTools(["xdg-open"]);
    const io = createIo(undefined, { platform: "linux" });

    // Act
    const code = await main(["link", "main.ts", "--open"], io);

    // Assert
    expect(code).toBe(0);
    const [command, args] = vi.mocked(spawn).mock.calls[0]!;
    expect([command, args]).toEqual(["xdg-open", [io.output().trim()]]);
  });

  test("should print the link and fail when the browser cannot open", async () => {
    // Arrange
    fakeTools([]);
    const io = createIo(undefined, { platform: "linux" });

    // Act
    const code = await main(["link", "main.ts", "--open"], io);

    // Assert
    expect(code).toBe(1);
    expect(io.output().startsWith("https://example.com/#spec=")).toBe(true);
    expect(io.errors()).toBe("Cannot open the browser: xdg-open is not installed.\n");
  });

  test("should print the link and the actions as JSON", async () => {
    // Arrange
    fakeTools(["pbcopy"]);
    const plain = createIo();
    const copied = createIo();

    // Act
    await main(["link", "main.ts", "--json"], plain);
    await main(["link", "main.ts", "--copy", "--json"], copied);

    // Assert
    const result = JSON.parse(plain.output());
    expect(Object.keys(result)).toEqual(["link", "copied", "opened"]);
    expect(result.link.startsWith("https://example.com/#spec=")).toBe(true);
    expect([result.copied, result.opened]).toEqual([false, false]);
    expect(JSON.parse(copied.output()).copied).toBe(true);
    expect(copied.errors()).toBe("");
  });
});

describe("schema", () => {
  test("should print the JSON Schema of the spec", async () => {
    // Arrange
    const io = createIo();

    // Act
    await main(["schema"], io);

    // Assert
    const schema = JSON.parse(io.output());
    expect(schema.required).toEqual(["windows"]);
    expect(schema.additionalProperties).toBe(false);
  });
});

describe("skill", () => {
  test("should print the command that adds the skill and the link to its folder", async () => {
    // Arrange
    const io = createIo();

    // Act
    await main(["skill"], io);

    // Assert
    const output = io.output();
    expect(output).toContain("  npx skills add zirkelc/tin.so\n");
    expect(output).toContain("https://github.com/zirkelc/tin.so/tree/main/skills/tin");
    expect(output).toContain("~/.claude/skills/tin");
    expect(output).toContain("~/.agents/skills/tin");
  });

  test("should print the skill with a note on its references", async () => {
    // Arrange
    const io = createIo();

    // Act
    await main(["skill", "--print"], io);

    // Assert
    const output = io.output();
    expect(output.startsWith("---\nname: tin\n")).toBe(true);
    expect(output).toContain("- references/spec.md: tin skill --print spec");
  });

  test("should print a reference of the skill", async () => {
    // Arrange
    const io = createIo();

    // Act
    await main(["skill", "--print", "spec"], io);

    // Assert
    expect(io.output().startsWith("# The tin.so spec\n")).toBe(true);
  });

  test("should name the references for an unknown reference", async () => {
    // Arrange
    const io = createIo();

    // Act
    const code = await main(["skill", "--print", "nope"], io);

    // Assert
    expect(code).toBe(1);
    expect(io.errors()).toBe('Unknown reference "nope". The references are: spec\n');
  });

  test("should list the skill command in the help", async () => {
    // Arrange
    const io = createIo();

    // Act
    await main(["--help"], io);

    // Assert
    expect(io.output()).toContain("Show how to add the tin skill to a coding agent");
  });
});

describe("themes", () => {
  test("should list the font that a theme uses", async () => {
    // Arrange
    const io = createIo();

    // Act
    await main(["themes"], io);

    // Assert
    const openai = io
      .output()
      .split("\n")
      .find((line) => line.startsWith("openai"));
    expect(openai?.trim().endsWith("jetbrains-mono")).toBe(true);
  });
});

describe("help", () => {
  test("should show the usage of render first, then the commands with examples", async () => {
    // Arrange
    const io = createIo();

    // Act
    const code = await main(["--help"], io);

    // Assert
    expect(code).toBe(0);
    const output = io.output();
    expect(output).toContain("USAGE tin [OPTIONS] [INPUT]");
    expect(output.indexOf("--theme") < output.indexOf("COMMANDS")).toBe(true);
    expect(output).toContain("default command: `tin main.ts` is `tin render main.ts`");
    expect(output).toContain("pbpaste | tin --title main.ts --copy");
    expect(output).toContain("tin link main.ts --open");
    expect(output).toContain(`"$schema":"${SPEC_SCHEMA_URL}"`);
    expect(output).toContain("TIN_APP_URL");
  });

  test("should show the root help without arguments", async () => {
    // Arrange
    const terminal = createIo();
    const emptyPipe = createIo("");

    // Act
    const terminalCode = await main([], terminal);
    const emptyPipeCode = await main([], emptyPipe);

    // Assert
    expect(terminalCode).toBe(0);
    expect(emptyPipeCode).toBe(0);
    expect(terminal.output()).toContain("USAGE tin [OPTIONS] [INPUT]");
    expect(emptyPipe.output()).toBe(terminal.output());
  });

  test("should show the root help with the help command", async () => {
    // Arrange
    const io = createIo();

    // Act
    const code = await main(["help"], io);

    // Assert
    expect(code).toBe(0);
    expect(io.output()).toContain("COMMANDS");
  });

  test("should show only the options of the command", async () => {
    // Arrange
    const io = createIo();

    // Act
    const code = await main(["link", "--help"], io);

    // Assert
    expect(code).toBe(0);
    expect(io.output()).toContain("USAGE tin link [OPTIONS] [INPUT]");
    expect(io.output()).toContain("--no-title-bar");
    expect(io.output()).toContain("-m, --mode=<dark|light>");
    expect(io.output()).toContain("--open");
    expect(io.output().includes("--output")).toBe(false);
    expect(io.output().includes("--format")).toBe(false);
  });

  test("should show the help of a command with the help command", async () => {
    // Arrange
    const io = createIo();

    // Act
    const code = await main(["help", "render"], io);

    // Assert
    expect(code).toBe(0);
    expect(io.output()).toContain("USAGE tin render [OPTIONS] [INPUT]");
    expect(io.output()).toContain("-c, --copy");
  });

  test("should show the help before it checks the options", async () => {
    // Arrange
    const io = createIo();

    // Act
    const code = await main(["render", "--colour", "-h"], io);

    // Assert
    expect(code).toBe(0);
    expect(io.output()).toContain("USAGE tin render");
  });
});

describe("arguments", () => {
  test("should suggest the closest option for an unknown option", async () => {
    // Arrange
    const io = createIo();

    // Act
    const code = await main(["render", "main.ts", "--them", "midnight"], io);

    // Assert
    expect(code).toBe(1);
    expect(io.errors()).toBe(
      "Unknown option --them for render, did you mean --theme?\nRun tin render --help for the options.\n",
    );
  });

  test("should reject an option of another command", async () => {
    // Arrange
    const io = createIo();

    // Act
    const code = await main(["themes", "--tabs"], io);

    // Assert
    expect(code).toBe(1);
    expect(io.errors()).toContain(
      "Unknown option --tabs for themes: it is an option of render, link",
    );
    expect(io.output()).toBe("");
  });

  test("should reject the options of render for link", async () => {
    // Arrange
    const options = [["-o", "a.png"], ["--format", "svg"], ["--scale", "3"], ["--no-metadata"]];

    // Act
    const runs = await Promise.all(
      options.map(async (option) => {
        const io = createIo();
        const code = await main(["link", "main.ts", ...option], io);
        return { code, errors: io.errors() };
      }),
    );

    // Assert
    expect(runs.map((run) => run.code)).toEqual([1, 1, 1, 1]);
    expect(runs.map((run) => run.errors.split("\n")[0])).toEqual([
      "Unknown option -o for link: it is an option of render",
      "Unknown option --format for link: it is an option of render",
      "Unknown option --scale for link: it is an option of render",
      "Unknown option --no-metadata for link: it is an option of render",
    ]);
  });

  test("should reject an unknown short option", async () => {
    // Arrange
    const io = createIo();

    // Act
    const code = await main(["render", "main.ts", "-x"], io);

    // Assert
    expect(code).toBe(1);
    expect(io.errors()).toContain("Unknown option -x for render");
  });

  test("should reject an invalid value of an enum option", async () => {
    // Arrange
    const io = createIo();

    // Act
    const code = await main(["render", "main.ts", "--mode", "dim"], io);

    // Assert
    expect(code).toBe(1);
    expect(io.errors()).toContain(
      "Invalid value for argument: --mode (dim). Expected one of: dark, light.",
    );
  });

  test("should suggest the closest theme for an unknown theme", async () => {
    // Arrange
    const io = createIo();

    // Act
    const code = await main(["render", "main.ts", "--theme", "candi"], io);

    // Assert
    expect(code).toBe(1);
    expect(io.errors()).toContain('Unknown theme "candi", did you mean candy?');
  });

  test("should reject an option without its value", async () => {
    // Arrange
    const io = createIo();

    // Act
    const code = await main(["render", "main.ts", "-o"], io);

    // Assert
    expect(code).toBe(1);
    expect(io.errors()).toBe("Option -o needs a value\n");
  });

  test("should suggest the closest command for an unknown command", async () => {
    // Arrange
    const io = createIo();

    // Act
    const code = await main(["rendr", "main.ts"], io);

    // Assert
    expect(code).toBe(1);
    expect(io.errors()).toContain('Unknown command or file "rendr", did you mean render?');
  });

  test("should turn off the title bar and the frame with the negative options", async () => {
    // Arrange
    const io = createIo();

    // Act
    await main(["link", "main.ts", "--no-title-bar", "--no-frame", "--split", "column"], io);

    // Assert
    const spec = (await readLink(io.output().trim())) as any;
    expect(spec.windows[0].titleBar).toBe(false);
    expect(spec.windows[0].frame).toBe(false);
    expect(spec.windows[0].split).toBe("column");
  });
});

describe("colors", () => {
  /** Loads the CLI again with an environment where the argument parser uses colors */
  async function loadWithColors() {
    vi.stubEnv("TEST", "");
    vi.stubEnv("CI", "");
    vi.stubEnv("NO_COLOR", "");
    vi.stubEnv("TERM", "xterm-256color");
    vi.resetModules();
    const module = await import("../src/main.ts");
    vi.unstubAllEnvs();
    return module.main;
  }
  const ESC = String.fromCharCode(27);

  test("should strip the color codes from the help when color is off", async () => {
    // Arrange
    const run = await loadWithColors();
    const colored = createIo("", { color: true });
    const io = createIo("", { color: false });

    // Act
    await run(["render", "--help"], colored);
    await run(["render", "--help"], io);

    // Assert
    expect(colored.output().includes(ESC)).toBe(true);
    expect(io.output().includes(ESC)).toBe(false);
    expect(io.output()).toContain("-f, --format=<png|svg>");
  });

  test("should strip the color codes from errors when color is off", async () => {
    // Arrange
    const run = await loadWithColors();
    const io = createIo("", { color: false });

    // Act
    const code = await run(["render", "main.ts", "--format", "gif"], io);

    // Assert
    expect(code).toBe(1);
    expect(io.errors().includes(ESC)).toBe(false);
    expect(io.errors()).toContain("--format (gif). Expected one of: png, svg.");
  });
});
