import { readdir, readFile } from "node:fs/promises";
import { describe, expect, test } from "vite-plus/test";
import { layout } from "../src/layout.ts";
import { readImageSpec } from "../src/metadata.ts";
import { render, renderScene } from "../src/node.ts";
import { toSvg } from "../src/svg.ts";
import { themeBackground } from "../src/backgrounds.ts";
import { resolveMode, THEMES } from "../src/themes/index.ts";

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
    const spec = { ...((await readFixture("split-toml")) as object), theme: "github" };
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
  const spec = { theme: "github", windows: [{ panes: [{ title: "a.ts", code: "<b>&</b>" }] }] };

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

describe("theme frames", () => {
  test("should fill the window of an editor theme with the background of its mode", async () => {
    // Arrange
    const spec = { theme: "solarized", windows: [{ panes: [{ code: "x" }] }] };

    // Act
    const dark = await layout({ ...spec, mode: "dark" });
    const light = await layout({ ...spec, mode: "light" });

    // Assert
    expect(dark.frame.background).toBe("#002b36");
    expect(light.frame.background).toBe("#fdf6e3");
    expect(light.frame.divider).toBe("#ddd6c1");
    expect(toSvg(dark)).toContain('fill="#002b36"');
  });

  test("should use the dark window of an editor theme with only a dark mode", async () => {
    // Act
    const scene = await layout({
      theme: "nord",
      mode: "light",
      windows: [{ panes: [{ code: "x" }] }],
    });

    // Assert
    expect(scene.mode).toBe("dark");
    expect(scene.frame.background).toBe("#2e3440");
    expect(scene.frame.lineNumber).toBe("#4c566a");
    expect(scene.frame.title).toBe("#d8dee9");
  });

  test.each([
    { theme: "dracula", background: "#fffbeb", keyword: "#a3144d" },
    { theme: "tokyo-night", background: "#e6e7ed", keyword: "#65359d" },
  ])(
    "should use the official light variant of $theme in light mode",
    async ({ theme, background, keyword }) => {
      // Act
      const scene = await layout({
        theme,
        mode: "light",
        windows: [{ panes: [{ code: "if (x) {}", language: "ts" }] }],
      });
      const svg = toSvg(scene);

      // Assert
      expect(scene.mode).toBe("light");
      expect(scene.frame.background).toBe(background);
      expect(svg.toLowerCase()).toContain(`fill="${keyword}"`);
    },
  );

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

describe("background colors", () => {
  const popover = { line: 1, match: "a", code: "const a: number" };

  test("should fill a window with its own background color", async () => {
    // Arrange
    const scene = await layout({
      windows: [
        { background: "#123456", panes: [{ code: "const a = 1;" }] },
        { panes: [{ code: "b" }] },
      ],
    });

    // Act
    const svg = toSvg(scene);

    // Assert
    expect([...svg.matchAll(/fill="#123456"/g)].length).toBe(1);
  });

  test("should fill a popover with its own background color", async () => {
    // Arrange
    const scene = await layout({
      windows: [
        { panes: [{ code: "const a = 1;", annotations: [{ ...popover, background: "#334455" }] }] },
      ],
    });

    // Act
    const svg = toSvg(scene);

    // Assert
    expect(svg).toContain('fill="#334455" stroke=');
  });

  test("should give a popover the background of its window, raised", async () => {
    // Arrange
    const scene = await layout({
      windows: [
        { background: "#000000", panes: [{ code: "const a = 1;", annotations: [popover] }] },
      ],
    });

    // Act
    const svg = toSvg(scene);

    // Assert
    expect(svg).toContain('fill="rgb(20, 20, 20)" stroke=');
  });

  test("should make a popover lighter than the window in dark mode and darker in light mode", async () => {
    // Arrange
    const spec = {
      theme: "solarized",
      windows: [{ panes: [{ code: "const a = 1;", annotations: [popover] }] }],
    };

    // Act
    const dark = toSvg(await layout({ ...spec, mode: "dark" }));
    const light = toSvg(await layout({ ...spec, mode: "light" }));

    // Assert
    expect(dark).toContain('fill="rgb(20, 60, 70)" stroke=');
    expect(light).toContain('fill="rgb(243, 236, 218)" stroke=');
  });
});

describe("image background", () => {
  const windows = [
    { panes: [{ code: "const a = 1;", annotations: [{ line: 1, match: "a", code: "number" }] }] },
  ];

  test("should fill the image with a solid color in place of the theme gradient", async () => {
    // Arrange
    const scene = await layout({ background: "#123456", windows });

    // Act
    const svg = toSvg(scene);

    // Assert
    expect(scene.frame.backdrop).toEqual({ from: "#123456", to: "#123456" });
    expect(svg).toContain(
      `<rect x="0" y="0" width="${scene.width}" height="${scene.height}" fill="#123456"/>`,
    );
  });

  test("should draw a linear gradient along the line of its CSS angle", async () => {
    // Arrange
    const scene = await layout({
      background: "linear-gradient(90deg, #112233 25%, #445566)",
      width: 400,
      height: 200,
      windows,
    });

    // Act
    const svg = toSvg(scene);

    // Assert
    expect(svg).toContain(
      '<linearGradient id="frame-background-linear" gradientUnits="userSpaceOnUse" x1="0" y1="100" x2="400" y2="100"><stop offset="0.25" stop-color="#112233"/><stop offset="1" stop-color="#445566"/></linearGradient>',
    );
  });

  test("should spread the stops without a position between their neighbors", async () => {
    // Arrange
    const scene = await layout({
      background: "linear-gradient(90deg, #111111, #222222, #333333 80%, #444444)",
      windows,
    });

    // Act
    const svg = toSvg(scene);

    // Assert
    const offsets = [...svg.matchAll(/<stop offset="([\d.]+)" stop-color="#[1-4]{6}"/g)].map(
      (match) => Number(match[1]),
    );
    expect(offsets).toEqual([0, 0.4, 0.8, 1]);
  });

  test("should point a gradient to a corner so that its middle goes through the other corners", async () => {
    // Arrange
    const scene = await layout({
      background: "linear-gradient(to right top, #112233, #445566)",
      width: 400,
      height: 200,
      windows,
    });

    // Act
    const svg = toSvg(scene);

    // Assert
    expect(svg).toContain('x1="120" y1="260" x2="280" y2="-60"');
  });

  test("should fade to transparent in the color of the next stop, as a browser does", async () => {
    // Arrange
    const scene = await layout({
      background: "radial-gradient(at 0% 0%, #7c3aed 0px, transparent 50%), #0b0820",
      width: 400,
      height: 200,
      windows,
    });

    // Act
    const svg = toSvg(scene);

    // Assert
    expect(svg).toContain(
      '<radialGradient id="frame-background-radial" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="565.69" gradientTransform="translate(0 0) scale(1 0.5)"><stop offset="0" stop-color="#7c3aed"/><stop offset="0.5" stop-color="#7c3aed" stop-opacity="0"/></radialGradient>',
    );
    expect(svg.indexOf('fill="#0b0820"')).toBeLessThan(
      svg.indexOf('fill="url(#frame-background-radial)"'),
    );
  });

  test("should draw the background with its opacity", async () => {
    // Arrange
    const scene = await layout({ background: "#123456", backgroundOpacity: 0.4, windows });

    // Act
    const svg = toSvg(scene);

    // Assert
    expect(svg).toContain(
      `<g opacity="0.4"><rect x="0" y="0" width="${scene.width}" height="${scene.height}" fill="#123456"/></g>`,
    );
  });

  test.each(
    THEMES.flatMap((theme) =>
      (["dark", "light"] as const)
        .filter((mode) => resolveMode(theme, mode) === mode)
        .map((mode) => [theme.id, mode] as const),
    ),
  )("should have a background preset for the theme %s in the mode %s", (id, mode) => {
    // Arrange
    const theme = THEMES.find((theme) => theme.id === id)!;

    // Act
    const preset = themeBackground(theme, mode);

    // Assert
    expect(preset).toBeDefined();
  });

  test.each([
    { mode: "dark", base: "#0d1117", glow: "#1f6feb" },
    { mode: "light", base: "#fdfcfb", glow: "#ffd6a5" },
  ] as const)(
    "should draw the background preset of the theme in the mode $mode by default",
    async ({ mode, base, glow }) => {
      // Arrange
      const scene = await layout({ theme: "vscode", mode, windows });

      // Act
      const svg = toSvg(scene);

      // Assert
      expect(scene.frame.backdrop).toEqual({ from: base, to: base });
      expect(svg).toContain(`stop-color="${glow}"`);
    },
  );

  test("should draw the background preset of the only mode of a theme", async () => {
    // Arrange
    const scene = await layout({ theme: "synthwave-84", mode: "light", windows });

    // Act
    const svg = toSvg(scene);

    // Assert
    expect(svg).toContain('stop-color="#ff6ec7"');
  });

  test("should leave the image transparent at the opacity 0", async () => {
    // Act
    const scene = await layout({ backgroundOpacity: 0, windows });

    // Assert
    expect(scene.background).toBe(false);
  });
});

// The ambient backgrounds are not enabled yet
describe.skip("ambient backgrounds", () => {
  const windows = [
    { panes: [{ language: "typescript", code: 'const greeting = "hello world";' }] },
  ];

  test.each([
    {
      mode: "dark",
      css: "radial-gradient(at 0% 0%, #d96961 0px, transparent 55%), radial-gradient(at 100% 100%, #8cb6d9 0px, transparent 50%), radial-gradient(at 100% 0%, #b38fd9 0px, transparent 45%), #080b0f",
    },
    {
      mode: "light",
      css: "radial-gradient(at 0% 0%, #e5858c 0px, transparent 55%), radial-gradient(at 100% 100%, #788dad 0px, transparent 50%), radial-gradient(at 100% 0%, #ba9fed 0px, transparent 45%), #f5f5f5",
    },
  ] as const)("should make a mesh of the theme colors in the mode $mode", async ({ mode, css }) => {
    // Arrange
    const expected = await layout({ theme: "github", mode, background: css, windows });

    // Act
    const scene = await layout({ theme: "github", mode, background: "ambient-theme", windows });

    // Assert
    expect(scene.customBackground).toEqual(expected.customBackground);
  });

  test("should put the color that the code uses most in the first corner", async () => {
    // Arrange
    const code = 'const a = "a long string with many characters";';

    // Act
    const scene = await layout({
      theme: "github",
      background: "ambient-code",
      windows: [{ panes: [{ language: "typescript", code }] }],
    });
    const svg = toSvg(scene);

    // Assert
    // The string color #a5d6ff of the theme, 15 % darker
    expect(svg).toContain('stop-color="#8cb6d9"');
    expect(scene.frame.backdrop).toEqual({ from: "#080b0f", to: "#080b0f" });
  });

  test("should draw a blurred copy of the code behind the window", async () => {
    // Act
    const scene = await layout({ theme: "github", background: "ambient-blur", windows });
    const svg = toSvg(scene);

    // Assert
    expect(scene.ambientBlur).toBe(true);
    expect(svg).toContain('<g filter="url(#ambient-blur)">');
    expect(svg.indexOf("ambient-blur)")).toBeLessThan(svg.indexOf("greeting"));
  });

  test("should draw no blurred copy for the other backgrounds", async () => {
    // Act
    const scene = await layout({ theme: "github", windows });
    const svg = toSvg(scene);

    // Assert
    expect(scene.ambientBlur).toBe(false);
    expect(svg).not.toContain("ambient-blur");
  });
});
