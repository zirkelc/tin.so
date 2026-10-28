import type { SpecInput } from "@tin.so/core";
import { describe, expect, test } from "vite-plus/test";
import {
  centerWindow,
  fitToPadding,
  fitToRatio,
  fittedPadding,
  alignScene,
  growForLargerWindows,
  moveLayer,
  clearMarks,
  type PaneInput,
  positionWindows,
  resetPositions,
  selectionLines,
  selectionParts,
  setLineNumbers,
  toggleHighlightRange,
  toggleMark,
  markColor,
  setMarkColor,
  withCode,
  withPopoverCode,
  withFormattedCode,
  alignWindows,
  distributeWindows,
  duplicateWindow,
  copyWindows,
  pasteWindows,
  readCopiedWindows,
  removeWindows,
  resizeImage,
  snapBox,
  windowsOnly,
  withoutMissingParts,
} from "../src/spec-edits.ts";

const CODE = "const a = 1;\n  const b = a + a;\n";

describe("selectionLines", () => {
  test("should give the first and the last line of a selection", () => {
    // Act
    const lines = selectionLines(CODE, 6, 20);

    // Assert
    expect(lines).toEqual([1, 2]);
  });

  test("should not include the line after a selection that ends with a line break", () => {
    // Act
    const lines = selectionLines(CODE, 0, 13);

    // Assert
    expect(lines).toEqual([1, 1]);
  });
});

describe("selectionParts", () => {
  test("should give the selected text of each line without the indentation", () => {
    // Act
    const parts = selectionParts(CODE, 6, 20);

    // Assert
    expect(parts).toEqual([
      { line: 1, match: "a = 1;", occurrence: 1 },
      { line: 2, match: "const", occurrence: 1 },
    ]);
  });

  test("should give the occurrence of a text that the line has twice", () => {
    // Arrange
    const start = CODE.lastIndexOf("a");

    // Act
    const parts = selectionParts(CODE, start, start + 1);

    // Assert
    expect(parts).toEqual([{ line: 2, match: "a", occurrence: 2 }]);
  });
});

describe("toggleHighlightRange", () => {
  test("should highlight all lines of the range", () => {
    // Act
    const pane = toggleHighlightRange({ code: CODE, highlight: [2] }, 1, 3);

    // Assert
    expect(pane.highlight).toEqual([1, 2, 3]);
  });

  test("should remove the highlight when all lines have it", () => {
    // Act
    const pane = toggleHighlightRange({ code: CODE, highlight: ["1-3", 5] }, 2, 3);

    // Assert
    expect(pane.highlight).toEqual([1, 5]);
  });
});

describe("toggleMark", () => {
  const part = { line: 1, match: "a", occurrence: 1 };

  test("should add a mark", () => {
    // Act
    const pane = toggleMark({ code: CODE }, [part], "strong");

    // Assert
    expect(pane.marks).toEqual([{ ...part, style: "strong" }]);
  });

  test("should remove a mark that the part has", () => {
    // Arrange
    const marked = toggleMark({ code: CODE }, [part], "strong");

    // Act
    const pane = toggleMark(marked, [part], "strong");

    // Assert
    expect(pane.marks).toEqual([]);
  });
});

describe("setMarkColor", () => {
  const part = { line: 1, match: "a", occurrence: 1 };

  test("should add a mark with the color", () => {
    // Act
    const pane = setMarkColor({ code: CODE }, [part], "color", "#ff5c57");

    // Assert
    expect(pane.marks).toEqual([{ ...part, color: "#ff5c57" }]);
  });

  test("should replace the color, and keep the style of the mark", () => {
    // Arrange
    const pane: PaneInput = { code: CODE, marks: [{ ...part, style: "strong", color: "#000000" }] };

    // Act
    const result = setMarkColor(pane, [part], "color", "#ff5c57");

    // Assert
    expect(result.marks).toEqual([
      { ...part, style: "strong" },
      { ...part, color: "#ff5c57" },
    ]);
  });

  test("should remove the fill, and the mark that has nothing else", () => {
    // Arrange
    const pane = setMarkColor({ code: CODE }, [part], "background", "#ff5c5740");

    // Act
    const result = setMarkColor(pane, [part], "background", undefined);

    // Assert
    expect(result.marks).toEqual([]);
  });
});

describe("markColor", () => {
  const a = { line: 1, match: "a", occurrence: 1 };
  const b = { line: 2, match: "b", occurrence: 1 };

  test("should give the color that all parts have", () => {
    // Arrange
    const pane = setMarkColor({ code: CODE }, [a, b], "color", "#ff5c57");

    // Act
    const result = markColor(pane, [a, b], "color");

    // Assert
    expect(result).toBe("#ff5c57");
  });

  test("should give no color when the parts differ", () => {
    // Arrange
    const pane = setMarkColor({ code: CODE }, [a], "color", "#ff5c57");

    // Act
    const result = markColor(pane, [a, b], "color");

    // Assert
    expect(result).toBe(undefined);
  });
});

describe("clearMarks", () => {
  test("should remove only the marks that overlap the selection", () => {
    // Arrange
    const pane: PaneInput = {
      code: CODE,
      marks: [
        { line: 1, match: "const", style: "strong" },
        { line: 2, match: "b", style: "underline" },
      ],
    };

    // Act
    const result = clearMarks(pane, 0, 3);

    // Assert
    expect(result.marks).toEqual([{ line: 2, match: "b", style: "underline" }]);
  });
});

describe("withFormattedCode", () => {
  test("should set the formatted code when the code did not change", () => {
    // Arrange
    const pane = { code: "a=1" };

    // Act
    const result = withFormattedCode(pane, "a=1", "a = 1;");

    // Assert
    expect(result.code).toBe("a = 1;");
  });

  test("should keep the code that the user changed while the formatter ran", () => {
    // Arrange
    const pane = { code: "a=1\nb=2" };

    // Act
    const result = withFormattedCode(pane, "a=1", "a = 1;");

    // Assert
    expect(result).toBe(pane);
  });
});

describe("withCode", () => {
  test("should move highlights, marks and popovers below a new line", () => {
    // Arrange
    const pane: PaneInput = {
      code: "a\nb\nc",
      highlight: [1, 3],
      marks: [{ line: 3, match: "c", style: "strong" }],
      annotations: [{ line: 3, match: "c", code: "C" }],
    };

    // Act
    const result = withCode(pane, "a\nnew\nb\nc");

    // Assert
    expect(result.highlight).toEqual([1, 4]);
    expect(result.marks![0]!.line).toBe(4);
    expect(result.annotations![0]!.line).toBe(4);
  });
});

describe("withoutMissingParts", () => {
  test("should remove the marks and popovers whose text is not in their line", () => {
    // Arrange
    const spec = {
      windows: [
        {
          panes: [
            {
              code: "a\nb",
              marks: [
                { line: 1, match: "a", style: "strong" as const },
                { line: 2, match: "x", style: "strong" as const },
              ],
              annotations: [{ line: 3, match: "a", code: "A" }],
            },
          ],
        },
      ],
    };

    // Act
    const result = withoutMissingParts(spec);

    // Assert
    const pane = result.windows[0]!.panes[0]!;
    expect(pane.marks).toEqual([{ line: 1, match: "a", style: "strong" }]);
    expect(pane.annotations).toEqual([]);
  });

  test("should remove the marks of a popover whose text is not in the popover code", () => {
    // Arrange
    const popover = {
      line: 1,
      match: "a",
      code: "type A",
      marks: [
        { line: 1, match: "A", color: "#ff0000" },
        { line: 1, match: "B", color: "#ff0000" },
      ],
    };
    const spec = { windows: [{ panes: [{ code: "a", annotations: [popover] }] }] };

    // Act
    const result = withoutMissingParts(spec);

    // Assert
    const [kept] = result.windows[0]!.panes[0]!.annotations!;
    expect(kept!.marks).toEqual([{ line: 1, match: "A", color: "#ff0000" }]);
  });
});

describe("withPopoverCode", () => {
  test("should move the marks of the popover with their lines", () => {
    // Arrange
    const popover = {
      code: "type A = {\n  b: B;\n}",
      marks: [{ line: 2, match: "B", style: "strong" as const }],
    };

    // Act
    const result = withPopoverCode(popover, "// note\ntype A = {\n  b: B;\n}");

    // Assert
    expect(result.marks).toEqual([{ line: 3, match: "B", style: "strong" }]);
  });
});

describe("positionWindows", () => {
  test("should give every window its place and the image its size", () => {
    // Arrange
    const spec = { aspectRatio: "16:9", windows: [{ panes: [{ code: "a" }] }] };
    const scene = {
      width: 1_600,
      height: 900,
      windows: [
        { x: 100.4, y: 50.6, width: 300, height: 200, natural: { width: 300, height: 200 } },
      ],
    };

    // Act
    const result = positionWindows(spec, scene);

    // Assert
    expect(result.width).toBe(1_600);
    expect(result.height).toBeUndefined();
    expect(result.windows[0]).toEqual({ x: 100, y: 51, panes: [{ code: "a" }] });
  });

  test("should remove the places again", () => {
    // Arrange
    const spec = { width: 800, height: 600, windows: [{ x: 1, y: 2, panes: [{ code: "a" }] }] };

    // Act
    const result = resetPositions(spec);

    // Assert
    expect(result).toEqual({ windows: [{ panes: [{ code: "a" }] }] });
  });
});

describe("centerWindow", () => {
  const scene = {
    width: 1_000,
    height: 600,
    windows: [{ x: 10, y: 20, width: 400, height: 200, natural: { width: 400, height: 200 } }],
  };

  test("should keep the size of a window that the layout made larger than its code", () => {
    // Arrange
    const spec = { windows: [{ panes: [{ code: "a" }] }] };
    const stretched = {
      ...scene,
      windows: [{ x: 64, y: 64, width: 392, height: 200, natural: { width: 268, height: 200 } }],
    };

    // Act
    const result = centerWindow(spec, stretched, 0, "horizontal");

    // Assert
    expect(result.windows[0]).toEqual({ x: 304, y: 64, width: 392, panes: [{ code: "a" }] });
  });

  test("should center a window horizontally and keep its top", () => {
    // Arrange
    const spec = { width: 1_000, height: 600, windows: [{ x: 10, y: 20, panes: [{ code: "a" }] }] };

    // Act
    const result = centerWindow(spec, scene, 0, "horizontal");

    // Assert
    expect(result.windows[0]).toEqual({ x: 300, y: 20, panes: [{ code: "a" }] });
  });

  test("should keep the size of an image that a moved window made larger", () => {
    // Arrange
    const spec = {
      width: 1_000,
      height: 600,
      windows: [{ x: 10, y: 900, panes: [{ code: "a" }] }],
    };
    const tall = {
      width: 1_000,
      height: 1_200,
      windows: [{ x: 10, y: 900, width: 400, height: 200, natural: { width: 400, height: 200 } }],
    };

    // Act
    const result = centerWindow(spec, tall, 0, "vertical");

    // Assert
    expect(result.height).toBe(1_200);
    expect(result.windows[0]).toEqual({ x: 10, y: 500, panes: [{ code: "a" }] });
  });

  test("should not change a window that follows the padding and is already centered", () => {
    // Arrange
    const spec = { windows: [{ panes: [{ code: "a" }] }] };
    const centered = {
      ...scene,
      windows: [{ x: 300, y: 200, width: 400, height: 200, natural: { width: 400, height: 200 } }],
    };

    // Act
    const result = centerWindow(spec, centered, 0, "horizontal");

    // Assert
    expect(result).toBe(spec);
  });

  test("should give a window that follows the padding a place before it centers it", () => {
    // Arrange
    const spec = { windows: [{ panes: [{ code: "a" }] }] };

    // Act
    const result = centerWindow(spec, scene, 0, "vertical");

    // Assert
    expect(result.width).toBe(1_000);
    expect(result.windows[0]).toEqual({ x: 10, y: 200, panes: [{ code: "a" }] });
  });
});

const box = (x: number, y: number, width: number, height: number) => ({
  x,
  y,
  width,
  height,
  natural: { width, height },
});

describe("fitToPadding", () => {
  test("should fit the image to the windows with the padding and keep their arrangement", () => {
    // Arrange
    const spec = {
      width: 1_000,
      height: 800,
      windows: [
        { x: 0, y: 300, panes: [{ code: "a" }] },
        { x: 500, y: 400, panes: [{ code: "b" }] },
      ],
    };
    const scene = {
      width: 1_000,
      height: 800,
      windows: [box(0, 300, 400, 200), box(500, 400, 300, 300)],
    };

    // Act
    const result = fitToPadding(spec, scene, 32);

    // Assert
    expect(result.padding).toBe(32);
    expect({ width: result.width, height: result.height }).toEqual({ width: 864, height: 464 });
    expect(result.windows.map((window) => [window.x, window.y])).toEqual([
      [32, 32],
      [532, 132],
    ]);
  });

  test("should grow the fitted image to the aspect ratio and center the windows", () => {
    // Arrange
    const spec = {
      aspectRatio: "1:1",
      width: 500,
      windows: [{ x: 10, y: 10, panes: [{ code: "a" }] }],
    };
    const scene = { width: 500, height: 500, windows: [box(10, 10, 400, 200)] };

    // Act
    const result = fitToPadding(spec, scene, 50);

    // Assert
    expect(result.width).toBe(500);
    expect(result.height).toBeUndefined();
    expect(result.windows[0]).toEqual({ x: 50, y: 150, panes: [{ code: "a" }] });
  });
});

describe("fitToRatio", () => {
  test("should grow the image to the ratio around the windows and keep them in place", () => {
    // Arrange
    const spec = { width: 600, height: 400, windows: [{ x: 100, y: 100, panes: [{ code: "a" }] }] };
    const scene = { width: 600, height: 400, windows: [box(100, 100, 400, 200)] };

    // Act
    const result = fitToRatio(spec, scene, "1:1");

    // Assert
    expect({ ratio: result.aspectRatio, width: result.width, height: result.height }).toEqual({
      ratio: "1:1",
      width: 600,
      height: undefined,
    });
    expect(result.windows[0]).toEqual({ x: 100, y: 200, panes: [{ code: "a" }] });
  });

  test("should keep the image size when the ratio goes back to auto", () => {
    // Arrange
    const spec = {
      aspectRatio: "1:1",
      width: 600,
      windows: [{ x: 1, y: 2, panes: [{ code: "a" }] }],
    };
    const scene = { width: 600, height: 600, windows: [box(1, 2, 400, 200)] };

    // Act
    const result = fitToRatio(spec, scene, undefined);

    // Assert
    expect({ ratio: result.aspectRatio, width: result.width, height: result.height }).toEqual({
      ratio: undefined,
      width: 600,
      height: 600,
    });
  });
});

describe("growForLargerWindows", () => {
  test("should grow the image when a window gets larger and reaches past the edge", () => {
    // Arrange
    const spec = { width: 600, height: 400, windows: [{ x: 100, y: 100, panes: [{ code: "a" }] }] };
    const before = { width: 600, height: 400, windows: [box(100, 100, 400, 200)] };
    const after = { width: 600, height: 400, windows: [box(100, 100, 520, 260)] };

    // Act
    const result = growForLargerWindows(spec, before, after);

    // Assert
    expect({ width: result.width, height: result.height }).toEqual({ width: 720, height: 460 });
  });

  test("should grow the image only once when the window reaches past the edge by a fraction", () => {
    // Arrange
    const spec = { width: 600, height: 400, windows: [{ x: 100, y: 100, panes: [{ code: "a" }] }] };
    const before = { width: 600, height: 400, windows: [box(100, 100, 400, 200)] };
    const after = { width: 600, height: 400, windows: [box(100, 100, 492.4, 200)] };
    const grown = growForLargerWindows(spec, before, after);

    // Act
    const result = growForLargerWindows(grown, before, { ...after, width: grown.width! });

    // Assert
    expect(result).toBe(grown);
  });

  test("should not grow the image for a window that only moved", () => {
    // Arrange
    const spec = { width: 600, height: 400, windows: [{ x: 500, y: 100, panes: [{ code: "a" }] }] };
    const before = { width: 600, height: 400, windows: [box(100, 100, 400, 200)] };
    const after = { width: 600, height: 400, windows: [box(500, 100, 400, 200)] };

    // Act
    const result = growForLargerWindows(spec, before, after);

    // Assert
    expect(result).toBe(spec);
  });
});

describe("fittedPadding", () => {
  test("should give the padding of windows that a padding fitted", () => {
    // Arrange
    const spec = { padding: 32, windows: [{ x: 32, y: 32, panes: [{ code: "a" }] }] };
    const scene = { width: 464, height: 264, windows: [box(32, 32, 400, 200)] };

    // Act
    const padding = fittedPadding(spec, scene);

    // Assert
    expect(padding).toBe(32);
  });

  test("should give no padding after a window moved", () => {
    // Arrange
    const spec = { padding: 32, windows: [{ x: 50, y: 32, panes: [{ code: "a" }] }] };
    const scene = { width: 464, height: 264, windows: [box(50, 32, 400, 200)] };

    // Act
    const padding = fittedPadding(spec, scene);

    // Assert
    expect(padding).toBeUndefined();
  });
});

describe("setLineNumbers", () => {
  test("should turn off the line numbers of all panes, also when the theme shows them", () => {
    // Arrange
    const spec = {
      windows: [{ panes: [{ code: "a", lineNumbers: true }, { code: "b" }] }],
    };

    // Act
    const result = setLineNumbers(spec, false);

    // Assert
    expect(result).toEqual({
      lineNumbers: false,
      windows: [{ panes: [{ code: "a" }, { code: "b" }] }],
    });
  });
});

describe("moveLayer", () => {
  const spec: SpecInput = {
    windows: [
      { x: 0, y: 0, panes: [{ code: "a" }] },
      { x: 10, y: 10, panes: [{ code: "b" }] },
      { x: 20, y: 20, panes: [{ code: "c" }] },
    ],
  };
  const order = (result: { spec: SpecInput }) =>
    result.spec.windows.map((window) => window.panes[0]!.code).join("");

  test("should bring a window to the front", () => {
    // Act
    const result = moveLayer(spec, 0, "front");

    // Assert
    expect(order(result)).toBe("bca");
    expect(result.index).toBe(2);
  });

  test("should send a window to the back", () => {
    // Act
    const result = moveLayer(spec, 2, "back");

    // Assert
    expect(order(result)).toBe("cab");
    expect(result.index).toBe(0);
  });

  test("should move a window one layer forward and backward", () => {
    // Act
    const forward = moveLayer(spec, 0, "forward");
    const backward = moveLayer(spec, 1, "backward");

    // Assert
    expect(order(forward)).toBe("bac");
    expect(forward.index).toBe(1);
    expect(order(backward)).toBe("bac");
    expect(backward.index).toBe(0);
  });

  test("should keep the spec when the window is already at the front", () => {
    // Act
    const result = moveLayer(spec, 2, "forward");

    // Assert
    expect(result.spec).toBe(spec);
    expect(result.index).toBe(2);
  });
});

describe("alignScene", () => {
  test("should give each window its box from before a layer change", () => {
    // Arrange
    const front = { panes: [{ code: "a" }] };
    const back = { panes: [{ code: "b" }] };
    const before = { width: 600, height: 400, windows: [box(0, 0, 100, 50), box(10, 10, 200, 80)] };

    // Act
    const result = alignScene(before, { windows: [front, back] }, { windows: [back, front] });

    // Assert
    expect(result.windows).toEqual([box(10, 10, 200, 80), box(0, 0, 100, 50)]);
  });

  test("should keep the boxes by index for windows that changed", () => {
    // Arrange
    const before = { width: 600, height: 400, windows: [box(0, 0, 100, 50)] };

    // Act
    const result = alignScene(
      before,
      { windows: [{ panes: [{ code: "a" }] }] },
      { windows: [{ panes: [{ code: "ab" }] }] },
    );

    // Assert
    expect(result.windows).toEqual([box(0, 0, 100, 50)]);
  });
});

describe("windowsOnly", () => {
  test("should keep one window and remove the positions and the image size", () => {
    // Arrange
    const spec: SpecInput = {
      windows: [{ panes: [{ code: "a" }] }, { width: 400, panes: [{ code: "b" }] }],
    };
    const scene = {
      width: 900,
      height: 600,
      windows: [box(64, 64, 300, 200), box(64, 300, 400, 200)],
    };

    // Act
    const result = windowsOnly(spec, scene, [1]);

    // Assert
    expect(result).toEqual({ windows: [{ width: 400, panes: [{ code: "b" }] }] });
  });

  test("should keep the places of the windows to each other in the free layout", () => {
    // Arrange
    const spec: SpecInput = {
      width: 900,
      height: 600,
      padding: 32,
      windows: [
        { x: 100, y: 50, panes: [{ code: "a" }] },
        { x: 10, y: 10, panes: [{ code: "b" }] },
        { x: 300, y: 200, panes: [{ code: "c" }] },
      ],
    };
    const scene = {
      width: 900,
      height: 600,
      windows: [box(100, 50, 200, 100), box(10, 10, 50, 50), box(300, 200, 200, 100)],
    };

    // Act
    const result = windowsOnly(spec, scene, [2, 0]);

    // Assert
    expect(result).toEqual({
      padding: 32,
      windows: [
        { x: 32, y: 32, panes: [{ code: "a" }] },
        { x: 232, y: 182, panes: [{ code: "c" }] },
      ],
    });
  });
});

describe("removeWindows", () => {
  test("should remove all windows of the indexes", () => {
    // Arrange
    const spec: SpecInput = {
      windows: [{ panes: [{ code: "a" }] }, { panes: [{ code: "b" }] }, { panes: [{ code: "c" }] }],
    };

    // Act
    const result = removeWindows(spec, [0, 2]);

    // Assert
    expect(result.windows).toEqual([{ panes: [{ code: "b" }] }]);
  });
});

describe("duplicateWindow", () => {
  test("should put a moved copy in front of the window", () => {
    // Arrange
    const spec: SpecInput = {
      windows: [
        { x: 10, y: 20, panes: [{ code: "a" }] },
        { x: 0, y: 0, panes: [{ code: "b" }] },
      ],
    };

    // Act
    const result = duplicateWindow(spec, 0);

    // Assert
    expect(result.index).toBe(1);
    expect(result.spec.windows).toEqual([
      { x: 10, y: 20, panes: [{ code: "a" }] },
      { x: 34, y: 44, panes: [{ code: "a" }] },
      { x: 0, y: 0, panes: [{ code: "b" }] },
    ]);
  });

  test("should not share the panes of the copy with the window", () => {
    // Arrange
    const spec: SpecInput = { windows: [{ panes: [{ code: "a" }] }] };

    // Act
    const result = duplicateWindow(spec, 0);

    // Assert
    expect(result.spec.windows[1]).toEqual({ panes: [{ code: "a" }] });
    expect(result.spec.windows[1]!.panes).not.toBe(spec.windows[0]!.panes);
  });
});

describe("alignWindows", () => {
  const spec: SpecInput = {
    windows: [
      { x: 10, y: 10, panes: [{ code: "a" }] },
      { x: 200, y: 100, panes: [{ code: "b" }] },
      { x: 500, y: 300, panes: [{ code: "c" }] },
    ],
  };
  const scene = {
    width: 900,
    height: 600,
    windows: [box(10, 10, 100, 50), box(200, 100, 300, 100), box(500, 300, 100, 100)],
  };

  test("should align the right edges of the windows and keep the other windows", () => {
    // Act
    const result = alignWindows(spec, scene, [0, 1], "right");

    // Assert
    expect(result.windows.map((window) => [window.x, window.y])).toEqual([
      [400, 10],
      [200, 100],
      [500, 300],
    ]);
  });

  test("should align the middles of the windows", () => {
    // Act
    const result = alignWindows(spec, scene, [0, 1], "middle");

    // Assert
    expect(result.windows.map((window) => [window.x, window.y])).toEqual([
      [10, 80],
      [200, 55],
      [500, 300],
    ]);
  });
});

describe("distributeWindows", () => {
  test("should put the same space between the windows", () => {
    // Arrange
    const spec: SpecInput = {
      windows: [
        { x: 0, y: 0, panes: [{ code: "a" }] },
        { x: 500, y: 0, panes: [{ code: "b" }] },
        { x: 120, y: 0, panes: [{ code: "c" }] },
      ],
    };
    const scene = {
      width: 900,
      height: 600,
      windows: [box(0, 0, 100, 50), box(500, 0, 100, 50), box(120, 0, 200, 50)],
    };

    // Act
    const result = distributeWindows(spec, scene, [0, 1, 2], "horizontal");

    // Assert
    expect(result.windows.map((window) => window.x)).toEqual([0, 500, 200]);
  });
});

describe("snapBox", () => {
  const image = { width: 1_000, height: 800 };
  const other = { x: 100, y: 100, width: 200, height: 100 };

  test("should snap the left edge to the left edge of another window", () => {
    // Arrange
    const box = { x: 104, y: 280, width: 150, height: 100 };

    // Act
    const result = snapBox(box, [other], image, 8);

    // Assert
    expect(result).toEqual({
      dx: -4,
      dy: 0,
      guides: [{ axis: "vertical", kind: "window", at: 100, from: 100, to: 380 }],
    });
  });

  test("should snap the center to the center of the image", () => {
    // Arrange
    const box = { x: 447, y: 600, width: 100, height: 100 };

    // Act
    const result = snapBox(box, [], image, 8);

    // Assert
    expect(result).toEqual({
      dx: 3,
      dy: 0,
      guides: [{ axis: "vertical", kind: "center", at: 500, from: 0, to: 800 }],
    });
  });

  test("should show one line where a window center is on the image center", () => {
    // Arrange
    const centered = { x: 400, y: 100, width: 200, height: 100 };
    const box = { x: 402, y: 300, width: 200, height: 100 };

    // Act
    const result = snapBox(box, [centered], image, 8, { x: [0.5], y: [] });

    // Assert
    expect(result.guides).toEqual([
      { axis: "vertical", kind: "center", at: 500, from: 0, to: 800 },
    ]);
  });

  test("should not snap when no line is near", () => {
    // Arrange
    const box = { x: 600, y: 500, width: 100, height: 100 };

    // Act
    const result = snapBox(box, [other], image, 8);

    // Assert
    expect(result).toEqual({ dx: 0, dy: 0, guides: [] });
  });

  test("should snap only the given sides", () => {
    // Arrange
    const box = { x: 98, y: 500, width: 205, height: 100 };

    // Act
    const result = snapBox(box, [other], image, 8, { x: [1], y: [] });

    // Assert
    expect(result).toEqual({
      dx: -3,
      dy: 0,
      guides: [{ axis: "vertical", kind: "window", at: 300, from: 100, to: 600 }],
    });
  });
});

describe("resizeImage", () => {
  // A window of 400 x 200 in the center of an image with the default padding of 64
  const scene = { width: 528, height: 328, windows: [box(64, 64, 400, 200)] };
  const spec: SpecInput = { windows: [{ panes: [{ code: "x" }] }] };

  test("should set the width and the height of the corner", () => {
    // Act
    const result = resizeImage(spec, scene, { width: 800, height: 600 });

    // Assert
    expect([result.width, result.height]).toEqual([800, 600]);
  });

  test("should keep the windows and the padding in the image", () => {
    // Act
    const result = resizeImage(spec, scene, { width: 100, height: 100 });

    // Assert
    expect([result.width, result.height]).toEqual([528, 328]);
  });

  test("should set only the dragged side with an aspect ratio", () => {
    // Arrange
    const ratio: SpecInput = { ...spec, aspectRatio: "16:9", height: 400 };

    // Act
    const result = resizeImage(ratio, scene, { width: 1_600, height: 500 });

    // Assert
    expect([result.width, result.height, result.aspectRatio]).toEqual([1_600, undefined, "16:9"]);
  });

  test("should keep the windows in the image with an aspect ratio", () => {
    // Arrange
    const ratio: SpecInput = { ...spec, aspectRatio: "1:1" };

    // Act
    const result = resizeImage(ratio, scene, { height: 100 });

    // Assert
    expect([result.width, result.height]).toEqual([undefined, 528]);
  });

  test("should keep a window of the free layout at its place", () => {
    // Arrange
    const free: SpecInput = { windows: [{ x: 300, y: 64, panes: [{ code: "x" }] }] };
    const moved = { width: 800, height: 400, windows: [box(300, 64, 400, 200)] };

    // Act
    const result = resizeImage(free, moved, { width: 100 });

    // Assert
    expect(result.width).toBe(764);
  });
});

describe("copyWindows", () => {
  test("should copy the windows as a spec that can be read again", () => {
    // Arrange
    const spec: SpecInput = {
      theme: "mono",
      windows: [
        { panes: [{ title: "a.ts", code: "a" }] },
        { panes: [{ title: "b.ts", code: "b" }] },
      ],
    };

    // Act
    const result = readCopiedWindows(copyWindows(spec, [1]));

    // Assert
    expect(result).toEqual([{ panes: [{ title: "b.ts", code: "b" }] }]);
  });
});

describe("readCopiedWindows", () => {
  test.each(["const a = 1;", "{}", '{"windows":[]}', '{"windows":[{"panes":[]}]}', "[1]"])(
    "should read no windows from %s",
    (text) => {
      // Act
      const result = readCopiedWindows(text);

      // Assert
      expect(result).toBe(undefined);
    },
  );
});

describe("pasteWindows", () => {
  const pasted = [{ x: 100, y: 50, panes: [{ code: "p" }] }];

  test("should add the windows without places to the normal layout", () => {
    // Arrange
    const spec: SpecInput = { windows: [{ panes: [{ code: "a" }] }] };

    // Act
    const result = pasteWindows(spec, pasted);

    // Assert
    expect(result.spec.windows[1]).toEqual({ panes: [{ code: "p" }] });
    expect(result.indexes).toEqual([1]);
  });

  test("should put the windows next to their old places in the free layout", () => {
    // Arrange
    const spec: SpecInput = { windows: [{ x: 0, y: 0, panes: [{ code: "a" }] }] };

    // Act
    const result = pasteWindows(spec, [...pasted, { panes: [{ code: "q" }] }]);

    // Assert
    expect(result.spec.windows.map((window) => [window.x, window.y])).toEqual([
      [0, 0],
      [124, 74],
      [88, 88],
    ]);
    expect(result.indexes).toEqual([1, 2]);
  });
});
