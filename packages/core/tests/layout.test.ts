import { describe, expect, onTestFinished, test } from "vite-plus/test";
import { cellCount, layout, minWindowWidth, normalizeCode } from "../src/layout.ts";
import { SpecError } from "../src/spec.ts";
import { DEFAULT_THEME, getTheme } from "../src/themes/index.ts";

/** Lets the default theme show windows without a frame for one test, as a theme that allows them */
function allowWindowsWithoutFrame() {
  const theme = getTheme(DEFAULT_THEME);
  theme.frameless = true;
  onTestFinished(() => {
    delete theme.frameless;
  });
}

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

  test("should draw the horizontal line extension of test runners as a box line", () => {
    // Act
    const code = normalizeCode(" ⎯⎯ Failed Tests 1 ⎯⎯");

    // Assert
    expect(code).toBe(" ── Failed Tests 1 ──");
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
    expect(window!.height).toBe(16 + 2 * 21 + 16);
    expect(scene.width).toBe(Math.ceil(width + 64));
  });

  test("should apply the minimum frame width", async () => {
    // Act
    const scene = await layout({ padding: 64, windows: [{ panes: [{ code: "x" }] }] });

    // Assert
    expect(scene.width).toBe(520);
    expect(scene.windows[0]!.width).toBe(520 - 128);
  });

  test("should give a window without a frame the same padding on all sides", async () => {
    // Arrange
    allowWindowsWithoutFrame();

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
    expect(scene.height).toBe(Math.ceil(16 + 21 + 16 + 32));
  });

  test("should not stretch a stacked window without a frame", async () => {
    // Arrange
    allowWindowsWithoutFrame();

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
    // Arrange
    allowWindowsWithoutFrame();

    // Act
    const scene = await layout({
      windows: [{ frame: false, split: "column", panes: [{ code: "x", size: 71 }] }],
    });

    // Assert
    expect(scene.windows[0]!.height).toBe(16 + 21 + 16);
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
    expect(annotation!.anchor.y).toBe(pane.code.y + 16 + 2 * 21);
    expect(annotation!.box.y).toBe(annotation!.anchor.y + 6);
    expect(annotation!.lines.length).toBe(1);
  });

  test("should keep the padding of the spec at the sides of a popover, and 4 px less above and below its code", async () => {
    // Arrange
    const spec = {
      windows: [
        {
          panes: [
            {
              code: "const a = b;",
              annotations: [{ line: 1, match: "a", code: "const a: number", padding: 8 }],
            },
          ],
        },
      ],
    };

    // Act
    const scene = await layout(spec);

    // Assert
    const annotation = scene.windows[0]!.panes[0]!.annotations[0]!;
    expect(annotation.box.width).toBeCloseTo(2 * 8 + 15 * scene.popoverText.cellWidth);
    expect(annotation.box.height).toBe(2 * 4 + 20);
    expect(annotation.padding).toEqual({ x: 8, y: 4 });
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
    expect(scene.height).toBe(Math.ceil(box.y + box.height));
  });

  test("should keep the image size for a popover with a place below the image", async () => {
    // Arrange
    const spec = (annotations: Array<Record<string, unknown>>) => ({
      windows: [{ panes: [{ code: "const a = 1;", annotations }] }],
    });
    const before = await layout(spec([]));

    // Act
    const scene = await layout(spec([{ line: 1, x: 0, y: 300, code: "number" }]));

    // Assert
    expect({ width: scene.width, height: scene.height }).toEqual({
      width: before.width,
      height: before.height,
    });
  });

  test("should keep the image size for a popover with a place right of the image", async () => {
    // Arrange
    const spec = (annotations: Array<Record<string, unknown>>) => ({
      windows: [{ panes: [{ code: "const a = 1;", annotations }] }],
    });
    const before = await layout(spec([]));

    // Act
    const scene = await layout(spec([{ line: 1, x: 400, y: 0, code: "number" }]));

    // Assert
    expect({ width: scene.width, height: scene.height }).toEqual({
      width: before.width,
      height: before.height,
    });
  });

  test("should not grow the image for a popover inside the padding", async () => {
    // Arrange
    const spec = (annotations: Array<Record<string, unknown>>) => ({
      padding: 64,
      windows: [{ panes: [{ code: "const a = 1;\nconst b = 2;", annotations }] }],
    });
    const before = await layout(spec([]));

    // Act
    const scene = await layout(spec([{ line: 2, match: "b", code: "number" }]));

    // Assert
    const { box } = scene.windows[0]!.panes[0]!.annotations[0]!;
    expect(box.y + box.height).toBeGreaterThan(scene.windows[0]!.y + scene.windows[0]!.height);
    expect({ width: scene.width, height: scene.height }).toEqual({
      width: before.width,
      height: before.height,
    });
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

describe("popovers without a match", () => {
  const scene = (annotation: Record<string, unknown>, code = "const a = b;\n  const c = a;") =>
    layout({
      padding: 32,
      windows: [
        { titleBar: false, panes: [{ code, annotations: [{ code: "x", ...annotation }] }] },
      ],
    });

  test("should place a popover with only a line below the start of that line", async () => {
    // Act
    const result = await scene({ line: 2 });

    // Assert
    const pane = result.windows[0]!.panes[0]!;
    const { box } = pane.annotations[0]!;
    expect(box.x).toBeCloseTo(pane.code.x + 16);
    expect(box.y).toBe(pane.code.y + 16 + 2 * 21 + 6);
  });

  test("should place a popover at the column of its line", async () => {
    // Act
    const result = await scene({ line: 2, column: 9 });

    // Assert
    const pane = result.windows[0]!.panes[0]!;
    expect(pane.annotations[0]!.box.x).toBeCloseTo(pane.code.x + 16 + 8 * result.text.cellWidth);
  });

  test("should keep a popover with a place in the pane there when lines come before it", async () => {
    // Arrange
    const before = await scene({ line: 2, x: 120, y: 30 });

    // Act
    const result = await scene({ line: 3, x: 120, y: 30 }, "// new\nconst a = b;\n  const c = a;");

    // Assert
    const pane = result.windows[0]!.panes[0]!;
    const old = before.windows[0]!.panes[0]!;
    expect({
      x: pane.annotations[0]!.box.x - pane.code.x,
      y: pane.annotations[0]!.box.y - pane.code.y,
    }).toEqual({ x: 120, y: 30 });
    expect(pane.annotations[0]!.box.y - pane.code.y).toBe(old.annotations[0]!.box.y - old.code.y);
  });

  test("should place a popover without a line in a pane without code", async () => {
    // Act
    const result = await scene({}, "");

    // Assert
    const pane = result.windows[0]!.panes[0]!;
    const { box } = pane.annotations[0]!;
    expect({ x: box.x, y: box.y }).toEqual({ x: pane.code.x, y: pane.code.y });
  });
});

describe("annotations in split panes", () => {
  test("should not make the pane wider for its popover", async () => {
    // Arrange
    const popover = "x".repeat(60);
    const at = (annotations: Array<{ line: number; match: string; code: string }>) => ({
      windows: [{ panes: [{ code: "a b", annotations }, { code: "next" }] }],
    });

    // Act
    const [plain, annotated] = await Promise.all([
      layout(at([])),
      layout(at([{ line: 1, match: "b", code: popover }])),
    ]);

    // Assert
    expect(annotated.windows[0]!.panes[0]!.width).toBe(plain.windows[0]!.panes[0]!.width);
  });
});

describe("window parts", () => {
  test("should put the tabs below the title bar", async () => {
    // Act
    const scene = await layout({
      windows: [{ title: "Plans", tabs: true, panes: [{ title: "a.ts", code: "a" }] }],
    });

    // Assert
    const window = scene.windows[0]!;
    const pane = window.panes[0]!;
    expect(window.header?.height).toBe(40);
    expect(window.title).toBe("Plans");
    expect(pane.tab?.y).toBe(window.y + 40);
    expect(pane.code.y).toBe(window.y + 40 + 40);
  });

  test("should give the title bar the same height without tabs", async () => {
    // Act
    const scene = await layout({ windows: [{ panes: [{ title: "a.ts", code: "a" }] }] });

    // Assert
    const window = scene.windows[0]!;
    expect(window.header?.height).toBe(40);
    expect(window.panes[0]!.code.y).toBe(window.y + 40);
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
    // Arrange
    allowWindowsWithoutFrame();

    // Act
    const scene = await layout({
      windows: [{ frame: false, tabs: true, panes: [{ title: "a.ts", code: "a" }] }],
    });

    // Assert
    const window = scene.windows[0]!;
    expect(window.frame).toBe(false);
    expect(window.header).toBeUndefined();
    expect(window.panes[0]!.tab).toBeUndefined();
    expect(window.height).toBe(16 + 21 + 16);
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

  test("should give the size of the code of a window with set sizes", async () => {
    // Arrange
    const code = "const answer = 42;";
    const fitted = await layout({ padding: 0, windows: [{ panes: [{ code }, { code }] }] });

    // Act
    const scene = await layout({
      padding: 0,
      windows: [{ width: 900, height: 300, panes: [{ code, size: 100 }, { code }] }],
    });

    // Assert
    expect(scene.windows[0]!.fit).toEqual(fitted.windows[0]!.natural);
  });

  test("should give the smallest width of a window in the flow, without the padding", () => {
    // Act
    const width = minWindowWidth(32);

    // Assert
    expect(width).toBe(456);
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
    expect(window.panes[0]!.code.y).toBe(80 + 40);
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

  describe("in an image with an aspect ratio", () => {
    const code =
      'export const plans = ["free", "pro", "team", "enterprise"] as const satisfies Array<string>;\nexport type Plan = (typeof plans)[number];';
    const wide = (offsetY: number) => ({
      aspectRatio: "16:9",
      padding: 32,
      windows: [
        {
          panes: [
            {
              code,
              annotations: [{ line: 1, match: "plans", code: "a long type of plans", offsetY }],
            },
          ],
        },
      ],
    });

    test("should keep the window in place when its popover moves down", async () => {
      // Arrange
      const before = await layout(wide(0));

      // Act
      const scene = await layout(wide(30));

      // Assert
      expect(scene.windows[0]!.y).toBe(before.windows[0]!.y);
    });

    test("should move the window only as far as the popover needs to reach the edge of the image", async () => {
      // Act
      const scene = await layout(wide(200));

      // Assert
      const box = scene.windows[0]!.panes[0]!.annotations[0]!.box;
      expect(box.y + box.height).toBeCloseTo(scene.height, 0);
    });

    test("should keep the window in place when a popover with a place reaches past the edge of the image", async () => {
      // Arrange
      const fixed = (y: number) => {
        const spec = wide(0);
        const pane = spec.windows[0]!.panes[0]!;
        return {
          ...spec,
          windows: [
            { panes: [{ ...pane, annotations: [{ line: 1, x: 0, y, code: "a long type" }] }] },
          ],
        };
      };
      const before = await layout(fixed(0));

      // Act
      const scene = await layout(fixed(400));

      // Assert
      expect(scene.windows[0]!.y).toBe(before.windows[0]!.y);
    });
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

describe("space above the code", () => {
  test.each([
    ["a transparent title bar", { controls: "color" as const }, 10],
    ["a solid title bar", { titleBar: "solid" as const }, 10],
    ["tabs", { tabs: true }, 10],
    ["no title bar", { titleBar: false }, 16],
  ])("should start the first line at its space below %s", async (_, window, expected) => {
    // Arrange
    const spec = { windows: [{ ...window, panes: [{ title: "a.ts", code: "x" }] }] };

    // Act
    const scene = await layout(spec);

    // Assert
    const pane = scene.windows[0]!.panes[0]!;
    expect(pane.codeTop).toBe(expected);
  });

  test("should keep the space of a pane below another pane in a column split", async () => {
    // Arrange
    const spec = {
      windows: [{ split: "column" as const, panes: [{ code: "a" }, { code: "b" }] }],
    };

    // Act
    const scene = await layout(spec);

    // Assert
    const tops = scene.windows[0]!.panes.map((pane) => pane.codeTop);
    expect(tops).toEqual([10, 16]);
  });

  test("should give a solid title bar the size and the code place of a transparent one", async () => {
    // Arrange
    const pane = { title: "a.ts", code: "x\ny" };

    // Act
    const transparent = (await layout({ windows: [{ panes: [pane] }] })).windows[0]!;
    const solid = (await layout({ windows: [{ titleBar: "solid", panes: [pane] }] })).windows[0]!;

    // Assert
    const firstLine = (window: typeof solid) =>
      window.panes[0]!.code.y + window.panes[0]!.codeTop - window.y;
    expect(solid.height).toBe(transparent.height);
    expect(firstLine(solid)).toBe(firstLine(transparent));
    expect(firstLine(transparent)).toBe(50);
  });
});

describe("windows without a frame", () => {
  test("should keep the frame of a window when the theme does not allow a window without one", async () => {
    // Act
    const scene = await layout({
      theme: "nord",
      windows: [{ frame: false, panes: [{ code: "a" }] }],
    });

    // Assert
    expect(scene.windows[0]!.frame).toBe(true);
    expect(scene.warnings).toEqual([
      {
        path: "windows.0.frame",
        message: "The theme Nord always shows the window, so the image ignores frame: false.",
      },
    ]);
  });

  test("should give no warning for a window without a frame when the theme allows it", async () => {
    // Arrange
    allowWindowsWithoutFrame();

    // Act
    const scene = await layout({ windows: [{ frame: false, panes: [{ code: "a" }] }] });

    // Assert
    expect(scene.windows[0]!.frame).toBe(false);
    expect(scene.warnings).toEqual([]);
  });
});
