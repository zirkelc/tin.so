import { describe, expect, test } from "vite-plus/test";
import { composite, oklabLightness } from "../src/color.ts";
import { getFrameColors, resolveMode, THEMES } from "../src/themes/index.ts";

const MODES = ["dark", "light"] as const;
const PAIRS = THEMES.flatMap((theme) =>
  MODES.filter((mode) => resolveMode(theme, mode) === mode).map((mode) => ({ theme, mode })),
);

describe("oklabLightness", () => {
  test("should give 0 for black and 1 for white", () => {
    // Act
    const black = oklabLightness("#000000");
    const white = oklabLightness("#ffffff");

    // Assert
    expect(black).toBe(0);
    expect(Math.round(white * 1_000)).toBe(1_000);
  });
});

describe("composite", () => {
  test("should put a translucent color over an opaque one", () => {
    // Act
    const color = composite("rgba(255, 255, 255, 0.5)", "#000000");

    // Assert
    expect(color).toBe("#808080");
  });
});

describe("getFrameColors", () => {
  test("should give a highlighted line a clear contrast to the window in every theme and mode", () => {
    // Arrange
    const weak: Array<string> = [];

    // Act
    for (const { theme, mode } of PAIRS) {
      const frame = getFrameColors(theme, mode);
      const window = oklabLightness(frame.background);
      const line = oklabLightness(composite(frame.highlight, frame.background));
      if (Math.abs(line - window) < 0.06) weak.push(`${theme.id} ${mode}`);
    }

    // Assert
    expect(weak).toEqual([]);
  });

  test("should keep a highlight that already has a clear contrast", () => {
    // Arrange
    const dracula = THEMES.find((theme) => theme.id === "dracula")!;

    // Act
    const frame = getFrameColors(dracula, "dark");

    // Assert
    expect(frame.highlight).toBe("#44475a");
  });
});
