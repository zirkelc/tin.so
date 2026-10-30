import { describe, expect, test } from "vite-plus/test";
import { SPEC_SCHEMA_URL } from "../src/json-schema.ts";
import { stampSpecVersion } from "../src/migrate.ts";
import { expandLineRanges, LATEST_SPEC_VERSION, parseSpec, SpecError } from "../src/spec.ts";
import PINNED_IDS from "./spec-ids-v1.json" with { type: "json" };

const PANE = { code: "x" };

// The issues of a spec that must fail
function specIssues(input: unknown): Array<string> {
  try {
    parseSpec(input);
  } catch (caught) {
    if (caught instanceof SpecError) return caught.issues;
    throw caught;
  }
  throw new Error("expected a SpecError");
}

// A spec with one window and one pane with the given fields
function paneSpec(pane: Record<string, unknown>): unknown {
  return { windows: [{ panes: [{ ...PANE, ...pane }] }] };
}

describe("parseSpec", () => {
  test("should apply the defaults", () => {
    // Arrange
    const input = { windows: [{ panes: [{ code: "x" }] }] };

    // Act
    const spec = parseSpec(input);

    // Assert
    expect(spec).toEqual({
      v: 1,
      theme: "candy",
      mode: "dark",
      background: true,
      padding: 64,
      direction: "column",
      gap: 24,
      windows: [
        {
          frame: true,
          titleBar: true,
          controls: "gray",
          tabs: false,
          split: "row",
          panes: [
            {
              code: "x",
              language: "auto",
              icon: "auto",
              highlight: [],
              annotations: [],
              marks: [],
            },
          ],
        },
      ],
    });
  });

  test("should reject unknown keys", () => {
    // Arrange
    const input = { windows: [{ panes: [{ code: "x", lang: "ts" }] }] };

    // Act
    const parse = () => parseSpec(input);

    // Assert
    expect(parse).toThrow(SpecError);
  });

  test("should list the valid values of an unknown theme", () => {
    // Arrange
    const input = { theme: "dracula", windows: [{ panes: [{ code: "x" }] }] };

    // Act
    let error: SpecError | undefined;
    try {
      parseSpec(input);
    } catch (caught) {
      error = caught as SpecError;
    }

    // Assert
    expect(error?.issues.length).toBe(1);
    expect(error?.issues[0]).toMatch(/^theme: expected one of .*"candy"/);
    expect(error?.issues[0]).toMatch(/received "dracula"\. Check the value, or update tin\.so/);
  });

  test("should reject a window without panes", () => {
    // Arrange
    const input = { windows: [{ panes: [] }] };

    // Act
    const parse = () => parseSpec(input);

    // Assert
    expect(parse).toThrow(SpecError);
  });

  test("should reject an invalid line range", () => {
    // Arrange
    const input = { windows: [{ panes: [{ code: "x", highlight: ["2..4"] }] }] };

    // Act
    const parse = () => parseSpec(input);

    // Assert
    expect(parse).toThrow(SpecError);
  });
});

describe("expandLineRanges", () => {
  test("should expand numbers and ranges", () => {
    // Arrange
    const ranges = [1, "3-5", "8"];

    // Act
    const lines = expandLineRanges(ranges);

    // Assert
    expect([...lines]).toEqual([1, 3, 4, 5, 8]);
  });

  test("should stop a range at the last line", () => {
    // Arrange
    const ranges = ["2-30000000"];

    // Act
    const lines = expandLineRanges(ranges, 4);

    // Assert
    expect([...lines]).toEqual([2, 3, 4]);
  });
});

describe("limits", () => {
  test.each([["0:1"], ["1:0"], ["1:200"], ["200:1"]])(
    "should reject the aspect ratio %s",
    (aspectRatio) => {
      // Arrange
      const input = { aspectRatio, windows: [{ panes: [{ code: "x" }] }] };

      // Act
      const parse = () => parseSpec(input);

      // Assert
      expect(parse).toThrow(SpecError);
    },
  );

  test.each([["5-3"], ["1-30000000"], [30_000_000]])("should reject the highlight %s", (range) => {
    // Arrange
    const input = { windows: [{ panes: [{ code: "x", highlight: [range] }] }] };

    // Act
    const parse = () => parseSpec(input);

    // Assert
    expect(parse).toThrow(SpecError);
  });
});

describe("input limits", () => {
  test.each([
    ["the code of a pane", paneSpec({ code: "x".repeat(100_001) })],
    [
      "the code of a popover",
      paneSpec({ annotations: [{ line: 1, match: "x", code: "x".repeat(100_001) }] }),
    ],
    ["the windows", { windows: Array.from({ length: 51 }, () => ({ panes: [PANE] })) }],
    ["the panes", { windows: [{ panes: Array.from({ length: 21 }, () => PANE) }] }],
    [
      "the annotations",
      paneSpec({
        annotations: Array.from({ length: 201 }, () => ({ line: 1, match: "x", code: "t" })),
      }),
    ],
    [
      "the marks",
      paneSpec({
        marks: Array.from({ length: 201 }, () => ({ line: 1, match: "x", style: "strong" })),
      }),
    ],
    ["the highlight entries", paneSpec({ highlight: Array.from({ length: 1_001 }, () => 1) })],
    ["the pane title", paneSpec({ title: "a".repeat(201) })],
    ["the window title", { windows: [{ title: "a".repeat(201), panes: [PANE] }] }],
  ])("should reject too many characters or entries in %s", (_, input) => {
    // Act
    const issues = specIssues(input);

    // Assert
    expect(issues.length).toBe(1);
  });

  test("should accept the largest number of characters and entries", () => {
    // Arrange
    const input = {
      windows: Array.from({ length: 50 }, () => ({
        title: "a".repeat(200),
        panes: Array.from({ length: 20 }, () => PANE),
      })),
    };

    // Act
    const spec = parseSpec(input);

    // Assert
    expect(spec.windows.length).toBe(50);
  });

  test("should say how long the code is", () => {
    // Act
    const issues = specIssues(paneSpec({ code: "x".repeat(100_001) }));

    // Assert
    expect(issues).toEqual([
      "windows.0.panes.0.code: The code has 100001 characters, at most 100,000",
    ]);
  });

  test.each([
    ["x", 8_193],
    ["x", -8_193],
    ["y", Number.POSITIVE_INFINITY],
    ["y", Number.NaN],
  ])("should reject the window position %s: %d", (field, value) => {
    // Arrange
    const input = { windows: [{ [field]: value, panes: [PANE] }] };

    // Act
    const issues = specIssues(input);

    // Assert
    expect(issues.length).toBe(1);
  });

  test.each([
    ["offsetX", 1e6],
    ["offsetY", 1e6],
    ["offsetY", Number.NEGATIVE_INFINITY],
    ["offsetX", Number.NaN],
  ])("should reject the popover offset %s: %d", (field, value) => {
    // Arrange
    const input = paneSpec({ annotations: [{ line: 1, match: "x", code: "t", [field]: value }] });

    // Act
    const issues = specIssues(input);

    // Assert
    expect(issues.length).toBe(1);
  });

  test("should accept the farthest positions", () => {
    // Arrange
    const input = { windows: [{ x: -8_192, y: 8_192, panes: [PANE] }] };

    // Act
    const spec = parseSpec(input);

    // Assert
    expect({ x: spec.windows[0]!.x, y: spec.windows[0]!.y }).toEqual({ x: -8_192, y: 8_192 });
  });
});

describe("aspect ratio with a size", () => {
  test.each([[{ width: 1_600 }], [{ height: 900 }]])(
    "should accept an aspect ratio with %o",
    (size) => {
      // Arrange
      const input = { aspectRatio: "16:9", ...size, windows: [{ panes: [PANE] }] };

      // Act
      const spec = parseSpec(input);

      // Assert
      expect(spec.aspectRatio).toBe("16:9");
    },
  );

  test("should reject an aspect ratio with a width and a height", () => {
    // Arrange
    const input = { aspectRatio: "16:9", width: 1_600, height: 900, windows: [{ panes: [PANE] }] };

    // Act
    const issues = specIssues(input);

    // Assert
    expect(issues).toEqual([
      "aspectRatio: Use aspectRatio with width or with height, not with both. Remove one of the three fields",
    ]);
  });

  test("should give one message for an aspect ratio in a bad format", () => {
    // Arrange
    const input = { aspectRatio: "wide", windows: [{ panes: [PANE] }] };

    // Act
    const issues = specIssues(input);

    // Assert
    expect(issues).toEqual(['aspectRatio: Use a ratio such as "16:9"']);
  });

  test("should give one message for a highlight in a bad format", () => {
    // Act
    const issues = specIssues(paneSpec({ highlight: ["a-b"] }));

    // Assert
    expect(issues.length).toBe(1);
  });
});

describe("language", () => {
  test("should reject an unknown language and say how to find the ids", () => {
    // Act
    const issues = specIssues(paneSpec({ language: "pythonn" }));

    // Assert
    expect(issues).toEqual([
      'windows.0.panes.0.language: unknown language "pythonn". Run "tin languages" to list the ids, or use "auto" or "text"',
    ]);
  });

  test("should reject an unknown language of a popover", () => {
    // Arrange
    const input = paneSpec({
      annotations: [{ line: 1, match: "x", code: "t", language: "typescriptt" }],
    });

    // Act
    const issues = specIssues(input);

    // Assert
    expect(issues.length).toBe(1);
    expect(issues[0]).toMatch(/^windows\.0\.panes\.0\.annotations\.0\.language: unknown language/);
  });

  test.each([["auto"], ["text"], ["plaintext"], ["ts"], ["TypeScript"], ["py"], ["mjs"], ["txt"]])(
    "should accept the language %s",
    (language) => {
      // Act
      const spec = parseSpec(paneSpec({ language }));

      // Assert
      expect(spec.windows[0]!.panes[0]!.language).toBe(language);
    },
  );
});

describe("issue messages", () => {
  test("should name an unknown field", () => {
    // Act
    const issues = specIssues(paneSpec({ lang: "ts" }));

    // Assert
    expect(issues).toEqual([
      "windows.0.panes.0.lang: unknown field. Check the name, or update tin.so, because a newer version can support it",
    ]);
  });

  test("should name a missing required field", () => {
    // Act
    const issues = specIssues({ windows: [{ panes: [{ title: "a.ts" }] }] });

    // Assert
    expect(issues).toEqual(["windows.0.panes.0.code: required field missing"]);
  });
});

describe("spec version", () => {
  test("should read a spec without a version as version 1", () => {
    // Act
    const spec = parseSpec({ windows: [{ panes: [PANE] }] });

    // Assert
    expect(spec.v).toBe(1);
  });

  test("should accept version 1", () => {
    // Act
    const spec = parseSpec({ v: 1, windows: [{ panes: [PANE] }] });

    // Assert
    expect(spec.v).toBe(1);
  });

  test("should support version 1 as the latest version", () => {
    // Assert
    expect(LATEST_SPEC_VERSION).toBe(1);
  });

  test("should ask for an update for a newer version", () => {
    // Act
    const issues = specIssues({ v: 2, windows: [{ panes: [PANE] }] });

    // Assert
    expect(issues).toEqual([
      "v: This spec has version 2, but this tin.so supports up to version 1. Update tin.so.",
    ]);
  });

  test.each([[0], [-1], [1.5], ["1"], [null], [Number.NaN]])(
    "should reject the version %s",
    (version) => {
      // Act
      const issues = specIssues({ v: version, windows: [{ panes: [PANE] }] });

      // Assert
      expect(issues.length).toBe(1);
      expect(issues[0]).toMatch(/^v: the version must be a whole number from 1, received /);
    },
  );

  test("should change the chrome field of older specs to the window parts", () => {
    // Arrange
    const input = {
      windows: [
        { chrome: "tabs", panes: [PANE] },
        { chrome: "none", panes: [PANE] },
      ],
    };

    // Act
    const spec = parseSpec(input);

    // Assert
    const parts = spec.windows.map(({ titleBar, tabs }) => ({ titleBar, tabs }));
    expect(parts).toEqual([
      { titleBar: false, tabs: true },
      { titleBar: false, tabs: false },
    ]);
  });

  test("should reject an unknown chrome value", () => {
    // Act
    const issues = specIssues({ windows: [{ chrome: "round", panes: [PANE] }] });

    // Assert
    expect(issues.length).toBe(1);
  });
});

describe("mark colors", () => {
  const withMark = (mark: Record<string, unknown>) => ({
    windows: [{ panes: [{ code: "a", marks: [{ line: 1, match: "a", ...mark }] }] }],
  });

  test.each([
    { color: "#ff0000" },
    { background: "#0af" },
    { style: "strong", color: "#ff000080" },
  ])("should accept the mark %o", (mark) => {
    // Act
    const result = parseSpec(withMark(mark));

    // Assert
    expect(result.windows[0]!.panes[0]!.marks.length).toBe(1);
  });

  test.each([{}, { color: "red" }, { background: "#12345" }])(
    "should reject the mark %o",
    (mark) => {
      // Act
      const result = () => parseSpec(withMark(mark));

      // Assert
      expect(result).toThrow(SpecError);
    },
  );
});

describe("$schema", () => {
  test("should accept the URL of the JSON Schema and keep it", () => {
    // Act
    const result = parseSpec({ $schema: SPEC_SCHEMA_URL, windows: [{ panes: [PANE] }] });

    // Assert
    expect(result.$schema).toBe(SPEC_SCHEMA_URL);
  });
});

describe("version from $schema", () => {
  const schemaUrl = (version: number) => `https://tin.so/schema/v${version}.json`;

  test("should read the version of the $schema URL without v", () => {
    // Act
    const spec = parseSpec({ $schema: schemaUrl(1), windows: [{ panes: [PANE] }] });

    // Assert
    expect(spec.v).toBe(1);
  });

  test("should ask for an update for a newer version in the $schema URL", () => {
    // Act
    const issues = specIssues({ $schema: schemaUrl(2), windows: [{ panes: [PANE] }] });

    // Assert
    expect(issues).toEqual([
      "$schema: This spec has version 2, but this tin.so supports up to version 1. Update tin.so.",
    ]);
  });

  test("should reject a v that is not the version of the $schema URL", () => {
    // Act
    const issues = specIssues({ $schema: schemaUrl(2), v: 1, windows: [{ panes: [PANE] }] });

    // Assert
    expect(issues).toEqual([
      "v: the spec has version 1, but its $schema URL names version 2. Make them the same, or remove one",
    ]);
  });

  test("should read a $schema URL without a version as version 1", () => {
    // Act
    const spec = parseSpec({
      $schema: "https://example.com/spec.json",
      windows: [{ panes: [PANE] }],
    });

    // Assert
    expect(spec.v).toBe(1);
  });

  test("should stamp the version of the $schema URL", () => {
    // Act
    const result = stampSpecVersion({ $schema: schemaUrl(2), windows: [] });

    // Assert
    expect(result).toEqual({ v: 2, $schema: schemaUrl(2), windows: [] });
  });
});

describe("extension keys", () => {
  test("should ignore the keys that start with x- in every object", () => {
    // Arrange
    const input = {
      "x-editor": { zoom: 2 },
      windows: [
        {
          "x-id": "w1",
          panes: [
            {
              code: "a",
              "x-note": "keep",
              marks: [{ line: 1, match: "a", style: "strong", "x-by": "me" }],
              annotations: [{ line: 1, match: "a", code: "A", "x-pinned": true }],
            },
          ],
        },
      ],
    };

    // Act
    const spec = parseSpec(input);

    // Assert
    const pane = spec.windows[0]!.panes[0]!;
    expect(Object.keys(spec).some((key) => key.startsWith("x-"))).toBe(false);
    expect(Object.keys(pane).some((key) => key.startsWith("x-"))).toBe(false);
    expect(pane.marks[0]).toEqual({ line: 1, match: "a", occurrence: 1, style: "strong" });
    expect(pane.annotations[0]!.code).toBe("A");
  });
});

describe("annotation type", () => {
  test("should make an annotation without a type a popover", () => {
    // Act
    const spec = parseSpec(
      paneSpec({ code: "a", annotations: [{ line: 1, match: "a", code: "A" }] }),
    );

    // Assert
    expect(spec.windows[0]!.panes[0]!.annotations[0]!.type).toBe("popover");
  });

  test("should reject an unknown annotation type", () => {
    // Act
    const issues = specIssues(
      paneSpec({ code: "a", annotations: [{ type: "arrow", line: 1, match: "a", code: "A" }] }),
    );

    // Assert
    expect(issues.length).toBe(1);
    expect(issues[0]).toMatch(
      /^windows\.0\.panes\.0\.annotations\.0\.type: expected one of "popover"/,
    );
  });
});

/**
 * Specs in links and images use these ids, so each id that a version accepted must stay valid.
 * A dependency update that removes an id fails here: keep the old id as an alias instead. New ids
 * go into the list when they are added.
 */
describe("pinned ids", () => {
  test.each(PINNED_IDS.themes)("should accept the theme %s", (theme) => {
    // Act
    const spec = parseSpec({ theme, windows: [{ panes: [PANE] }] });

    // Assert
    expect(spec.theme).toBe(theme);
  });

  test.each(PINNED_IDS.fonts)("should accept the font %s", (font) => {
    // Act
    const spec = parseSpec({ font, windows: [{ panes: [PANE] }] });

    // Assert
    expect(spec.font).toBe(font);
  });

  test.each(PINNED_IDS.icons)("should accept the icon %s", (icon) => {
    // Act
    const spec = parseSpec(paneSpec({ icon }));

    // Assert
    expect(spec.windows[0]!.panes[0]!.icon).toBe(icon);
  });

  test("should accept all pinned languages", () => {
    // Act
    const rejected = PINNED_IDS.languages.filter((language) => {
      try {
        parseSpec(paneSpec({ language }));
        return false;
      } catch {
        return true;
      }
    });

    // Assert
    expect(rejected).toEqual([]);
  });
});
