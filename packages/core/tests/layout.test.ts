import { describe, expect, test } from "vite-plus/test";
import { cellCount, layout, normalizeCode } from "../src/layout.ts";
import { SpecError } from "../src/spec.ts";

// The error of a layout that must fail
async function layoutError(input: unknown): Promise<SpecError> {
  const error = await layout(input).then(
    () => undefined,
    (caught: unknown) => caught,
  );
  if (!(error instanceof SpecError)) throw new Error("expected a SpecError");
  return error;
}

describe("normalizeCode", () => {
  test("should expand tabs to the next tab stop", () => {
    // Act
    const code = normalizeCode("\tx\nabc\td");

    // Assert
    expect(code).toBe("  x\nabc d");
  });

  test("should remove trailing empty lines and Windows line endings", () => {
    // Act
    const code = normalizeCode("a\r\nb\n\n\n");

    // Assert
    expect(code).toBe("a\nb");
  });
});

describe("cellCount", () => {
  test.each([
    ["a", 1],
    ["→", 1],
    ["日", 2],
    ["🚀", 2],
  ])("should count %s as %i cells", (char, expected) => {
    // Act
    const cells = cellCount(char);

    // Assert
    expect(cells).toBe(expected);
  });
});

describe("layout", () => {
  test("should size a single window from its code", async () => {
    // Arrange
    const code = "x".repeat(80);

    // Act
    const scene = await layout({
      padding: 32,
      windows: [{ titleBar: false, panes: [{ code: `${code}\n${code}` }] }],
    });

    // Assert
    const [window] = scene.windows;
    const width = 16 + 80 * scene.text.cellWidth + 16;
    expect(window!.width).toBeCloseTo(width);
    expect(window!.height).toBe(16 + 2 * 22.5 + 16);
    expect(scene.width).toBe(Math.ceil(width + 64));
  });

  test("should apply the minimum frame width of ray.so", async () => {
    // Act
    const scene = await layout({ padding: 64, windows: [{ panes: [{ code: "x" }] }] });

    // Assert
    expect(scene.width).toBe(520);
    expect(scene.windows[0]!.width).toBe(520 - 128);
  });

  test("should give a window without a frame the same padding on all sides", async () => {
    // Act
    const scene = await layout({
      padding: 16,
      windows: [{ frame: false, panes: [{ code: "x".repeat(10) }] }],
    });

    // Assert
    const window = scene.windows[0]!;
    const width = 16 + 10 * scene.text.cellWidth + 16;
    expect(window.width).toBeCloseTo(width);
    expect(window.x).toBe(16);
    expect(window.y).toBe(16);
    expect(scene.width).toBe(Math.ceil(width + 32));
    expect(scene.height).toBe(Math.ceil(16 + 22.5 + 16 + 32));
  });

  test("should not stretch a stacked window without a frame", async () => {
    // Act
    const scene = await layout({
      windows: [
        { panes: [{ code: "x".repeat(100) }] },
        { frame: false, panes: [{ code: "short" }] },
      ],
    });

    // Assert
    const second = scene.windows[1]!;
    expect(second.width).toBeCloseTo(16 + 5 * scene.text.cellWidth + 16);
  });

  test("should ignore the size of a pane when it is the only pane of its window", async () => {
    // Act
    const scene = await layout({
      windows: [{ frame: false, split: "column", panes: [{ code: "x", size: 71 }] }],
    });

    // Assert
    expect(scene.windows[0]!.height).toBe(16 + 22.5 + 16);
  });

  test("should give stacked windows the same width", async () => {
    // Act
    const scene = await layout({
      windows: [{ panes: [{ code: "x".repeat(100) }] }, { panes: [{ code: "short" }] }],
    });

    // Assert
    const [first, second] = scene.windows;
    expect(second!.width).toBe(first!.width);
    expect(second!.y).toBe(first!.y + first!.height + 24);
  });

  test("should give split panes the same height and the extra width to the last pane", async () => {
    // Act
    const scene = await layout({
      windows: [
        {
          tabs: true,
          title: "a much longer title than the code",
          panes: [
            { title: "a.ts", code: "a\nb\nc" },
            { title: "b.toml", code: "x = 1" },
          ],
        },
      ],
    });

    // Assert
    const [left, right] = scene.windows[0]!.panes;
    expect(right!.height).toBe(left!.height);
    expect(right!.x).toBeCloseTo(left!.x + left!.width + 1);
    expect(right!.x + right!.width).toBeCloseTo(scene.windows[0]!.x + scene.windows[0]!.width);
    expect(right!.tab?.height).toBe(40);
  });

  test("should infer the language from the pane title", async () => {
    // Act
    const scene = await layout({
      windows: [
        {
          panes: [
            { title: "plans.toml", code: "a = 1" },
            { title: "main.ts", language: "py", code: "x" },
          ],
        },
      ],
    });

    // Assert
    expect(scene.windows[0]!.panes.map((pane) => pane.language)).toEqual(["toml", "python"]);
  });

  test("should use the font of the theme, or the default for a font that is not bundled", async () => {
    // Act
    const vercel = await layout({ theme: "vercel", windows: [{ panes: [{ code: "x" }] }] });
    const openai = await layout({ theme: "openai", windows: [{ panes: [{ code: "x" }] }] });

    // Assert
    expect(vercel.font.id).toBe("geist-mono");
    expect(openai.font.id).toBe("jetbrains-mono");
  });

  test("should force the only mode of a theme", async () => {
    // Act
    const scene = await layout({
      theme: "stripe",
      mode: "light",
      windows: [{ panes: [{ code: "x" }] }],
    });

    // Assert
    expect(scene.mode).toBe("dark");
  });
});

describe("annotations", () => {
  test("should place the popover below the matched text", async () => {
    // Arrange
    const spec = {
      padding: 32,
      windows: [
        {
          titleBar: false,
          panes: [
            {
              code: "const a = b;\nconst c = a;",
              annotations: [{ line: 2, match: "a", code: "const a: number" }],
            },
          ],
        },
      ],
    };

    // Act
    const scene = await layout(spec);

    // Assert
    const pane = scene.windows[0]!.panes[0]!;
    const [annotation] = pane.annotations;
    const cell = scene.text.cellWidth;
    expect(annotation!.anchor.x).toBeCloseTo(pane.code.x + 16 + 10 * cell);
    expect(annotation!.anchor.width).toBeCloseTo(cell);
    expect(annotation!.anchor.y).toBe(pane.code.y + 16 + 2 * 22.5);
    expect(annotation!.box.y).toBe(annotation!.anchor.y + 6);
    expect(annotation!.lines.length).toBe(1);
  });

  test("should pick the given occurrence of the match", async () => {
    // Arrange
    const spec = {
      windows: [
        {
          panes: [
            { code: "a + a", annotations: [{ line: 1, match: "a", occurrence: 2, code: "x" }] },
          ],
        },
      ],
    };

    // Act
    const scene = await layout(spec);

    // Assert
    const pane = scene.windows[0]!.panes[0]!;
    expect(pane.annotations[0]!.anchor.x).toBeCloseTo(pane.code.x + 16 + 4 * scene.text.cellWidth);
  });

  test("should grow the image when the popover reaches below the windows", async () => {
    // Arrange
    const popover = Array.from({ length: 20 }, (_, index) => `line ${index}`).join("\n");
    const spec = {
      padding: 32,
      windows: [{ panes: [{ code: "x", annotations: [{ line: 1, match: "x", code: popover }] }] }],
    };

    // Act
    const scene = await layout(spec);

    // Assert
    const { box } = scene.windows[0]!.panes[0]!.annotations[0]!;
    expect(scene.height).toBe(Math.ceil(box.y + box.height + 32));
  });

  test("should reject a match that is not in the line", async () => {
    // Arrange
    const spec = {
      windows: [{ panes: [{ code: "abc", annotations: [{ line: 1, match: "x", code: "y" }] }] }],
    };

    // Act
    const result = layout(spec);

    // Assert
    await expect(result).rejects.toThrow(SpecError);
  });
});

describe("annotations in split panes", () => {
  test("should make the pane wide enough for its popover", async () => {
    // Arrange
    const popover = "x".repeat(60);
    const spec = {
      windows: [
        {
          panes: [
            { code: "a b", annotations: [{ line: 1, match: "b", code: popover }] },
            { code: "next" },
          ],
        },
      ],
    };

    // Act
    const scene = await layout(spec);

    // Assert
    const [first, second] = scene.windows[0]!.panes;
    const { box } = first!.annotations[0]!;
    expect(second!.x).toBeGreaterThan(box.x + box.width);
  });
});

describe("window parts", () => {
  test("should put a title at the left after the controls and the title gap of the frame", async () => {
    // Act
    const scene = await layout({
      theme: "auth0",
      windows: [{ panes: [{ title: "main.ts", language: "typescript", code: "a" }] }],
    });

    // Assert
    const window = scene.windows[0]!;
    const bar = window.titleBar!;
    expect(bar.align).toBe("left");
    expect(bar.title.x).toBe(window.header!.x + 16 + 60 + 8);
    expect(bar.language?.text).toBe("TypeScript");
    expect(bar.language?.x).toBe(window.header!.x + window.header!.width - 16);
  });

  test("should put the tabs below the title bar", async () => {
    // Act
    const scene = await layout({
      windows: [{ title: "Plans", tabs: true, panes: [{ title: "a.ts", code: "a" }] }],
    });

    // Assert
    const window = scene.windows[0]!;
    const pane = window.panes[0]!;
    expect(window.header?.height).toBe(44);
    expect(window.title).toBe("Plans");
    expect(pane.tab?.y).toBe(window.y + 44);
    expect(pane.code.y).toBe(window.y + 44 + 40);
  });

  test("should give the title bar no space below the title when no tabs follow", async () => {
    // Act
    const scene = await layout({ windows: [{ panes: [{ title: "a.ts", code: "a" }] }] });

    // Assert
    const window = scene.windows[0]!;
    expect(window.header?.height).toBe(34);
    expect(window.panes[0]!.code.y).toBe(window.y + 34);
  });

  test("should not give the pane title to the title bar when the pane has a tab", async () => {
    // Act
    const scene = await layout({
      windows: [{ tabs: true, panes: [{ title: "a.ts", code: "a" }] }],
    });

    // Assert
    expect(scene.windows[0]!.title).toBeUndefined();
  });

  test("should draw no title bar and no tabs without a frame", async () => {
    // Act
    const scene = await layout({
      windows: [{ frame: false, tabs: true, panes: [{ title: "a.ts", code: "a" }] }],
    });

    // Assert
    const window = scene.windows[0]!;
    expect(window.frame).toBe(false);
    expect(window.header).toBeUndefined();
    expect(window.panes[0]!.tab).toBeUndefined();
    expect(window.height).toBe(16 + 22.5 + 16);
  });
});

describe("icons", () => {
  test.each([
    ["auto", "main.ts", "typescript"],
    ["auto", "plans.toml", "toml"],
    ["auto", "notes.unknown", "file"],
    ["rust", "main.ts", "rust"],
    ["none", "main.ts", undefined],
  ])("should resolve the icon %s of %s to %s", async (icon, title, expected) => {
    // Act
    const scene = await layout({ windows: [{ tabs: true, panes: [{ title, icon, code: "x" }] }] });

    // Assert
    expect(scene.windows[0]!.panes[0]!.icon?.id).toBe(expected);
  });

  test("should reject an unknown icon", async () => {
    // Act
    const result = layout({ windows: [{ panes: [{ icon: "cobol", code: "x" }] }] });

    // Assert
    await expect(result).rejects.toThrow(SpecError);
  });
});

describe("marks", () => {
  test("should split the tokens at the edges of a mark and style the marked part", async () => {
    // Act
    const scene = await layout({
      windows: [
        {
          panes: [
            {
              language: "text",
              code: "hello world",
              marks: [
                { line: 1, match: "lo wo", style: "strong" },
                { line: 1, match: "world", style: "underline" },
              ],
            },
          ],
        },
      ],
    });

    // Assert
    const tokens = scene.windows[0]!.panes[0]!.lines[0]!.map((token) => ({
      content: token.content,
      bold: token.bold,
      underline: token.underline,
    }));
    expect(tokens).toEqual([
      { content: "hel", bold: false, underline: false },
      { content: "lo ", bold: true, underline: false },
      { content: "wo", bold: true, underline: true },
      { content: "rld", bold: false, underline: true },
    ]);
  });

  test("should give the marked part its text color and fill", async () => {
    // Act
    const scene = await layout({
      windows: [
        {
          panes: [
            {
              language: "text",
              code: "hello world",
              marks: [
                { line: 1, match: "world", color: "#ff0000" },
                { line: 1, match: "lo wo", background: "#00ff00" },
              ],
            },
          ],
        },
      ],
    });

    // Assert
    const tokens = scene.windows[0]!.panes[0]!.lines[0]!.map((token) => [
      token.content,
      token.color === "#ff0000",
      token.background,
    ]);
    expect(tokens).toEqual([
      ["hel", false, undefined],
      ["lo ", false, "#00ff00"],
      ["wo", true, "#00ff00"],
      ["rld", true, undefined],
    ]);
  });

  test("should style and color the marked part of a popover", async () => {
    // Act
    const scene = await layout({
      windows: [
        {
          panes: [
            {
              language: "text",
              code: "plans",
              annotations: [
                {
                  line: 1,
                  match: "plans",
                  code: "type Plans",
                  language: "text",
                  marks: [{ line: 1, match: "Plans", style: "strong", background: "#00ff00" }],
                },
              ],
            },
          ],
        },
      ],
    });

    // Assert
    const tokens = scene.windows[0]!.panes[0]!.annotations[0]!.lines[0]!.map((token) => [
      token.content,
      token.bold,
      token.background,
    ]);
    expect(tokens).toEqual([
      ["type ", false, undefined],
      ["Plans", true, "#00ff00"],
    ]);
  });

  test("should reject a mark whose text is not in the line", async () => {
    // Act
    const result = layout({
      windows: [{ panes: [{ code: "a", marks: [{ line: 1, match: "b", style: "emphasis" }] }] }],
    });

    // Assert
    await expect(result).rejects.toThrow(SpecError);
  });
});

describe("sizes and positions", () => {
  const twoPanes = (sizes: Array<number | undefined>) => ({
    padding: 0,
    windows: [
      {
        titleBar: false,
        panes: sizes.map((size) => ({ code: "x", ...(size !== undefined && { size }) })),
      },
    ],
  });

  test("should give a pane the size of the spec", async () => {
    // Act
    const scene = await layout(twoPanes([400, 200]));

    // Assert
    const window = scene.windows[0]!;
    expect(window.panes.map((pane) => pane.width)).toEqual([400, 200]);
    expect(window.width).toBe(601);
  });

  test("should cut off the code of a pane that is smaller than its code", async () => {
    // Act
    const scene = await layout({
      windows: [{ panes: [{ code: "a very long line of code", size: 40 }, { code: "x" }] }],
    });

    // Assert
    expect(scene.windows[0]!.panes.map((pane) => pane.clipped)).toEqual([true, false]);
  });

  test("should give a window the size of the spec", async () => {
    // Act
    const scene = await layout({
      padding: 10,
      windows: [{ width: 700, height: 300, panes: [{ code: "x" }] }],
    });

    // Assert
    const window = scene.windows[0]!;
    expect({ width: window.width, height: window.height }).toEqual({ width: 700, height: 300 });
    expect({ width: scene.width, height: scene.height }).toEqual({ width: 720, height: 320 });
  });

  test("should put a window with a position at that position", async () => {
    // Act
    const scene = await layout({
      width: 1_000,
      height: 600,
      windows: [{ x: 120, y: 80, width: 400, height: 200, panes: [{ code: "x" }] }],
    });

    // Assert
    const window = scene.windows[0]!;
    expect({ x: window.x, y: window.y }).toEqual({ x: 120, y: 80 });
    expect(window.panes[0]!.code.y).toBe(80 + 34);
    expect({ width: scene.width, height: scene.height }).toEqual({ width: 1_000, height: 600 });
  });

  test("should grow the image to the aspect ratio and center the windows", async () => {
    // Act
    const scene = await layout({
      aspectRatio: "1:1",
      padding: 0,
      windows: [{ width: 600, height: 200, panes: [{ code: "x" }] }],
    });

    // Assert
    expect({ width: scene.width, height: scene.height }).toEqual({ width: 600, height: 600 });
    expect({ x: scene.windows[0]!.x, y: scene.windows[0]!.y }).toEqual({ x: 0, y: 200 });
  });

  test("should take the height from the width and the aspect ratio", async () => {
    // Act
    const scene = await layout({
      aspectRatio: "16:9",
      width: 1_600,
      windows: [{ panes: [{ code: "x" }] }],
    });

    // Assert
    expect({ width: scene.width, height: scene.height }).toEqual({ width: 1_600, height: 900 });
  });

  test("should reject an aspect ratio that makes the image larger than the largest size", async () => {
    // Act
    const error = await layoutError({
      aspectRatio: "1:10",
      padding: 0,
      windows: [{ width: 2_000, height: 100, panes: [{ code: "x" }] }],
    });

    // Assert
    expect(error.issues).toEqual([
      "aspectRatio: The ratio 1:10 makes an image of 2000 x 20000 px, at most 8192 px on each side. Use a ratio nearer to the shape of the windows, or a smaller width or height.",
    ]);
  });

  test("should take the width from the height and the aspect ratio", async () => {
    // Act
    const scene = await layout({
      aspectRatio: "2:1",
      height: 400,
      windows: [{ panes: [{ code: "x" }] }],
    });

    // Assert
    expect({ width: scene.width, height: scene.height }).toEqual({ width: 800, height: 400 });
  });

  test("should cut off windows that do not fit into the size from the width and the ratio", async () => {
    // Act
    const scene = await layout({
      aspectRatio: "1:1",
      width: 300,
      padding: 0,
      windows: [{ width: 600, height: 200, panes: [{ code: "x" }] }],
    });

    // Assert
    expect({ width: scene.width, height: scene.height }).toEqual({ width: 300, height: 300 });
    expect({ x: scene.windows[0]!.x, y: scene.windows[0]!.y }).toEqual({ x: -150, y: 50 });
  });

  test("should reject a width from the height and the ratio above the largest size", async () => {
    // Act
    const error = await layoutError({
      aspectRatio: "10:1",
      height: 1_000,
      windows: [{ panes: [{ code: "x" }] }],
    });

    // Assert
    expect(error.issues).toEqual([
      "aspectRatio: The ratio 10:1 makes an image of 10000 x 1000 px, at most 8192 px on each side. Use a ratio nearer to the shape of the windows, or a smaller width or height.",
    ]);
  });
});

describe("popover place and size", () => {
  const spec = (annotation: Record<string, unknown>) => ({
    windows: [
      {
        panes: [
          {
            code: "const plans = 1;",
            annotations: [{ line: 1, match: "plans", code: "a long type of plans", ...annotation }],
          },
        ],
      },
    ],
  });

  test("should move the popover by its offset", async () => {
    // Arrange
    const before = await layout(spec({}));

    // Act
    const scene = await layout(spec({ offsetX: 30, offsetY: -10 }));

    // Assert
    const box = scene.windows[0]!.panes[0]!.annotations[0]!.box;
    const old = before.windows[0]!.panes[0]!.annotations[0]!.box;
    expect({ x: box.x, y: box.y }).toEqual({ x: old.x + 30, y: old.y - 10 });
  });

  test("should give the popover the size of the spec and cut off its code", async () => {
    // Act
    const scene = await layout(spec({ width: 80, height: 40 }));

    // Assert
    const annotation = scene.windows[0]!.panes[0]!.annotations[0]!;
    expect({ width: annotation.box.width, height: annotation.box.height }).toEqual({
      width: 80,
      height: 40,
    });
    expect(annotation.clipped).toBe(true);
  });
});

describe("trailing lines", () => {
  const spec = { windows: [{ panes: [{ code: "a\n\n" }] }] };

  test("should remove empty lines at the end of the code", async () => {
    // Act
    const scene = await layout(spec);

    // Assert
    expect(scene.windows[0]!.panes[0]!.lines.length).toBe(1);
  });

  test("should keep empty lines at the end of the code for an editor", async () => {
    // Act
    const scene = await layout(spec, { keepTrailingLines: true });

    // Assert
    expect(scene.windows[0]!.panes[0]!.lines.length).toBe(3);
  });
});

describe("image size", () => {
  test("should keep a set size and cut off a window outside of it", async () => {
    // Act
    const scene = await layout({
      padding: 20,
      width: 300,
      height: 200,
      windows: [{ x: 100, y: 50, width: 400, height: 300, panes: [{ code: "x" }] }],
    });

    // Assert
    expect({ width: scene.width, height: scene.height }).toEqual({ width: 300, height: 200 });
  });
});

describe("largest image size", () => {
  test("should reject an image with too many lines", async () => {
    // Arrange
    const code = Array.from({ length: 5_000 }, (_, index) => `line ${index}`).join("\n");

    // Act
    const error = await layoutError({ windows: [{ panes: [{ code, language: "text" }] }] });

    // Assert
    expect(error.issues.length).toBe(1);
    expect(error.issues[0]).toMatch(
      /^The image is \d+ px high, at most 8192 px\. Use fewer lines or set a height\.$/,
    );
  });

  test("should reject an image with a too long line", async () => {
    // Arrange
    const code = "x".repeat(20_000);

    // Act
    const error = await layoutError({ windows: [{ panes: [{ code, language: "text" }] }] });

    // Assert
    expect(error.issues.length).toBe(1);
    expect(error.issues[0]).toMatch(
      /^The image is \d+ px wide, at most 8192 px\. Shorten the code or set a width\.$/,
    );
  });

  test("should reject a window at a far position", async () => {
    // Act
    const error = await layoutError({ windows: [{ x: 8_192, panes: [{ code: "x" }] }] });

    // Assert
    expect(error.issues.length).toBe(1);
    expect(error.issues[0]).toMatch(/^The image is \d+ px wide, at most 8192 px/);
  });

  test("should reject a popover at a far offset", async () => {
    // Arrange
    const annotation = { line: 1, match: "x", code: "type", offsetY: 8_192 };

    // Act
    const error = await layoutError({
      windows: [{ panes: [{ code: "x", annotations: [annotation] }] }],
    });

    // Assert
    expect(error.issues.length).toBe(1);
    expect(error.issues[0]).toMatch(/^The image is \d+ px high, at most 8192 px/);
  });

  test("should keep a set size for code larger than the largest size", async () => {
    // Arrange
    const code = "x".repeat(20_000);

    // Act
    const scene = await layout({
      width: 800,
      windows: [{ panes: [{ code, language: "text" }] }],
    });

    // Assert
    expect(scene.width).toBe(800);
  });

  test("should accept an image of the largest size", async () => {
    // Act
    const scene = await layout({
      width: 8_192,
      height: 8_192,
      windows: [{ panes: [{ code: "x" }] }],
    });

    // Assert
    expect({ width: scene.width, height: scene.height }).toEqual({ width: 8_192, height: 8_192 });
  });
});
