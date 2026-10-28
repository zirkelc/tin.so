import { readdir, readFile } from "node:fs/promises";
import { describe, expect, test } from "vite-plus/test";
import { layout } from "../src/layout.ts";
import { readImageSpec } from "../src/metadata.ts";
import { render, renderScene } from "../src/node.ts";
import { toSvg } from "../src/svg.ts";
import { THEMES } from "../src/themes/index.ts";

const FIXTURES = new URL("./fixtures/", import.meta.url);
const fixtures = (await readdir(FIXTURES))
  .filter((file) => file.endsWith(".json"))
  .map((file) => file.replace(".json", ""));

async function readFixture(name: string): Promise<unknown> {
  return JSON.parse(await readFile(new URL(`${name}.json`, FIXTURES), "utf8"));
}

function pngSize(png: Uint8Array): { width: number; height: number } {
  const view = new DataView(png.buffer, png.byteOffset);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

describe("toSvg", () => {
  test.each(fixtures)("should render the fixture %s", async (name) => {
    // Arrange
    const scene = await layout(await readFixture(name));

    // Act
    const svg = toSvg(scene);

    // Assert
    await expect(svg).toMatchFileSnapshot(`./__snapshots__/${name}.svg`);
  });

  test("should escape markup in code and titles", async () => {
    // Arrange
    const scene = await layout({
      windows: [{ panes: [{ title: "<a>.html", language: "text", code: "<b>&</b>" }] }],
    });

    // Act
    const svg = toSvg(scene);

    // Assert
    expect(svg).not.toContain("<b>");
    expect(svg).toContain("&#60;b&#62;&#38;&#60;/b&#62;");
    expect(svg).toContain("&#60;a&#62;.html");
  });

  test("should place every character on the cell grid", async () => {
    // Arrange
    const scene = await layout({
      padding: 0,
      windows: [{ titleBar: false, panes: [{ language: "text", code: "a 日b" }] }],
    });

    // Act
    const svg = toSvg(scene);

    // Assert
    const cell = scene.text.cellWidth;
    const xs = [...svg.matchAll(/<text x="([^"]+)"[^>]*>([^<]+)<\/text>/g)].map((match) => [
      match[1],
      match[2],
    ]);
    const round = (value: number) => String(Math.round(value * 100) / 100);
    expect(xs).toEqual([
      [round(16), "a"],
      [round(16 + 2 * cell), "日"],
      [round(16 + 4 * cell), "b"],
    ]);
  });
});

describe("renderScene", () => {
  test("should render the scene of a layout at its size", async () => {
    // Arrange
    const scene = await layout({ windows: [{ panes: [{ title: "a.ts", code: "x" }] }] });

    // Act
    const png = await renderScene(scene, { scale: 1 });

    // Assert
    expect(pngSize(png)).toEqual({ width: scene.width, height: scene.height });
  });
});

describe("render", () => {
  test("should render code with control characters", async () => {
    // Arrange
    const spec = { windows: [{ panes: [{ code: "\u001b[31mred\u001b[0m\fnext\u0000" }] }] };

    // Act
    const png = render(spec);

    // Assert
    await expect(png).resolves.toBeInstanceOf(Uint8Array);
  });

  test("should render a PNG at the scale", async () => {
    // Arrange
    const spec = await readFixture("split-toml");
    const scene = await layout(spec);

    // Act
    const png = await render(spec, { scale: 2 });

    // Assert
    expect(pngSize(png)).toEqual({ width: scene.width * 2, height: scene.height * 2 });
  });

  test("should embed the fonts in an SVG", async () => {
    // Arrange
    const spec = { windows: [{ panes: [{ title: "a.ts", code: "x" }] }] };

    // Act
    const svg = new TextDecoder().decode(await render(spec, { format: "svg" }));

    // Assert
    const faces = [
      ...svg.matchAll(/@font-face\{font-family:(ci-[a-z-]+);font-weight:(\d+);font-style:(\w+)/g),
    ].map((match) => match.slice(1).join(" "));
    expect(faces).toEqual([
      "ci-jetbrains-mono 500 normal",
      "ci-jetbrains-mono 700 normal",
      "ci-jetbrains-mono 500 italic",
      "ci-inter 400 normal",
      "ci-inter 500 normal",
    ]);
  });

  test("should reject an invalid spec", async () => {
    // Act
    const result = render({ windows: [] });

    // Assert
    await expect(result).rejects.toThrow();
  });
});

describe("metadata", () => {
  const spec = { theme: "vercel", windows: [{ panes: [{ title: "a.ts", code: "<b>&</b>" }] }] };

  test("should round trip the spec in a PNG", async () => {
    // Arrange
    const png = await render(spec, { scale: 1 });

    // Act
    const read = await readImageSpec(png);

    // Assert
    expect(read).toEqual({ v: 1, ...spec });
  });

  test("should round trip the spec in an SVG", async () => {
    // Arrange
    const svg = await render(spec, { format: "svg", appUrl: "https://example.com/" });

    // Act
    const read = await readImageSpec(new TextDecoder().decode(svg));

    // Assert
    expect(read).toEqual({ v: 1, ...spec });
    expect(new TextDecoder().decode(svg)).toContain('source="https://example.com/"');
  });

  test("should write no metadata when it is off", async () => {
    // Arrange
    const options = [{ metadata: false }, { metadata: false, format: "svg" }] as const;

    // Act
    const images = await Promise.all(options.map((option) => render(spec, option)));

    // Assert
    const specs = await Promise.all(images.map((image) => readImageSpec(image)));
    expect(specs).toEqual([undefined, undefined]);
  });

  test("should write no metadata for a scene without its spec", async () => {
    // Arrange
    const scene = await layout(spec);

    // Act
    const png = await renderScene(scene, { scale: 1 });

    // Assert
    expect(await readImageSpec(png)).toBe(undefined);
  });
});

describe("window-less", () => {
  test("should draw the code without window, shadow and border", async () => {
    // Arrange
    const scene = await layout({ windows: [{ frame: false, panes: [{ code: "x" }] }] });

    // Act
    const svg = toSvg(scene);

    // Assert
    expect(svg).not.toContain('clip-path="url(#window-0)"');
    expect(svg).not.toContain("shadow-0");
    expect(svg).toContain(">x</text>");
  });
});

describe("window controls", () => {
  test.each([
    ["gray", ["rgba(255, 255, 255, 0.2)", "rgba(255, 255, 255, 0.2)", "rgba(255, 255, 255, 0.2)"]],
    ["color", ["#ff5f57", "#febc2e", "#28c840"]],
  ])("should draw %s window controls", async (controls, expected) => {
    // Arrange
    const scene = await layout({ windows: [{ controls, panes: [{ code: "x" }] }] });

    // Act
    const svg = toSvg(scene);

    // Assert
    const fills = [...svg.matchAll(/<circle [^>]*fill="([^"]+)"/g)].map((match) => match[1]);
    expect(fills).toEqual(expected);
  });
});

describe("marks", () => {
  test("should draw bold text and lines for underline and strikethrough", async () => {
    // Arrange
    const scene = await layout({
      windows: [
        {
          panes: [
            {
              language: "text",
              code: "a b c",
              marks: [
                { line: 1, match: "a", style: "strong" },
                { line: 1, match: "b", style: "underline" },
                { line: 1, match: "c", style: "strikethrough" },
              ],
            },
          ],
        },
      ],
    });

    // Act
    const svg = toSvg(scene);

    // Assert
    expect(svg).toMatch(/font-weight="700"[^>]*>a<\/text>/);
    const lines = [...svg.matchAll(/<rect [^>]*height="1"[^>]*\/>/g)];
    expect(lines.length).toBe(2);
  });
});

describe("mark colors", () => {
  test("should draw the fill of a mark behind its text, in the text color of the mark", async () => {
    // Arrange
    const scene = await layout({
      windows: [
        {
          panes: [
            {
              language: "text",
              code: "a b",
              marks: [{ line: 1, match: "b", color: "#ff0000", background: "#00ff00" }],
            },
          ],
        },
      ],
    });

    // Act
    const svg = toSvg(scene);

    // Assert
    const fill = svg.indexOf('fill="#00ff00"');
    const text = svg.search(/fill="#ff0000"[^>]*>b<\/text>/);
    expect(fill).toBeGreaterThan(-1);
    expect(text).toBeGreaterThan(fill);
  });
});

describe("clipped panes", () => {
  test("should cut off the code of a pane that is smaller than its code", async () => {
    // Arrange
    const scene = await layout({
      windows: [{ panes: [{ code: "a very long line of code", size: 40 }, { code: "x" }] }],
    });

    // Act
    const svg = toSvg(scene);

    // Assert
    expect(svg).toContain('<clipPath id="pane-0-0">');
    expect(svg).not.toContain('<clipPath id="pane-0-1">');
  });
});

describe("partner frame without a window", () => {
  test("should draw the Vercel frame: a black background, grid lines and brackets", async () => {
    // Arrange
    const scene = await layout({
      theme: "vercel",
      windows: [{ frame: false, panes: [{ code: "x" }] }],
    });

    // Act
    const svg = toSvg(scene);

    // Assert
    expect(svg).toContain(`<rect width="${scene.width}" height="${scene.height}" fill="#000000"/>`);
    expect([...svg.matchAll(/<line [^>]*stroke="#1a1a1a"/g)].length).toBe(4);
    expect([...svg.matchAll(/<path [^>]*stroke="#515356"/g)].length).toBe(2);
  });

  test("should keep the gradient of a theme without a partner frame", async () => {
    // Arrange
    const scene = await layout({
      theme: "candy",
      windows: [{ frame: false, panes: [{ code: "x" }] }],
    });

    // Act
    const svg = toSvg(scene);

    // Assert
    expect(svg).toContain('fill="url(#frame-background)"');
    expect(svg).not.toContain("<path ");
  });
});

describe("theme frames", () => {
  test("should draw the outline of the ElevenLabs window also without a frame", async () => {
    // Arrange
    const pane = { title: "a.ts", code: "x" };
    const framed = await layout({ theme: "elevenlabs", windows: [{ panes: [pane] }] });
    const frameless = await layout({
      theme: "elevenlabs",
      windows: [{ frame: false, panes: [pane] }],
    });
    const outline = (svg: string) => svg.match(/<rect [^>]*fill="none" stroke="#353535"\/>/g) ?? [];

    // Act
    const result = outline(toSvg(frameless));

    // Assert
    expect(result.length).toBe(1);
    expect(outline(toSvg(framed)).length).toBe(1);
  });

  test("should draw the shadow of a window without a blur filter", async () => {
    // Arrange
    const scene = await layout({ windows: [{ panes: [{ title: "a.ts", code: "x" }] }] });

    // Act
    const svg = toSvg(scene);

    // Assert
    expect(svg.includes("feGaussianBlur")).toBe(false);
  });

  const cases = THEMES.flatMap((theme) =>
    (["dark", "light"] as const).map((mode) => [theme.id, mode] as const),
  );

  test.each(cases)(
    "should draw the frame of %s in %s mode with unique ids",
    async (theme, mode) => {
      // Arrange
      const pane = { title: "main.ts", language: "typescript", code: "const a = 1;" };
      const scene = await layout({
        theme,
        mode,
        windows: [
          { panes: [pane] },
          { tabs: true, titleBar: false, panes: [pane, pane] },
          { frame: false, panes: [pane] },
        ],
      });

      // Act
      const svg = toSvg(scene);

      // Assert
      const ids = [...svg.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]);
      expect(new Set(ids).size).toBe(ids.length);
    },
  );
});
