import { type SpecInput, SpecError } from "@tin.so/core";
import { afterEach, describe, expect, test } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { DEFAULT_SPEC } from "../../src/state.ts";
import {
  codeField,
  dataUrlBytes,
  mountApp,
  PNG_SIGNATURE,
  pngSize,
  previewSvg,
  specInUrl,
  unmountApp,
} from "./app.tsx";

const SPEC: SpecInput = {
  theme: "mono",
  windows: [{ panes: [{ title: "hello.py", code: 'print("hello")' }] }],
};

// The size of the preview image, which is the size of the image at scale 1
function previewSize(): { width: number; height: number } {
  const svg = previewSvg()!;
  return { width: Number(svg.getAttribute("width")), height: Number(svg.getAttribute("height")) };
}

afterEach(() => {
  unmountApp();
});

describe("window.tin", () => {
  test("should resolve ready after the first preview", async () => {
    // Arrange
    await mountApp();

    // Act
    await window.tin.ready;

    // Assert
    expect(window.tin.version).toBe(1);
    expect(previewSvg()).not.toBeNull();
    expect(window.tin.getSpec()).toEqual(DEFAULT_SPEC);
  });

  test("should show a spec from setSpec", async () => {
    // Arrange
    await mountApp();

    // Act
    await window.tin.setSpec(SPEC);

    // Assert
    expect(window.tin.getSpec()).toEqual(SPEC);
    await expect.element(codeField(1)).toHaveValue('print("hello")');
    // A link carries the version of the spec
    await expect.poll(() => specInUrl()).toEqual({ v: 1, ...SPEC });
  });

  test("should reject an invalid spec and keep the current spec", async () => {
    // Arrange
    await mountApp();
    const invalid = { theme: "no-such-theme", windows: [] } as unknown as SpecInput;

    // Act
    const result = window.tin.setSpec(invalid);

    // Assert
    await expect(result).rejects.toThrow(SpecError);
    expect(window.tin.getSpec()).toEqual(DEFAULT_SPEC);
    await expect.element(page.getByText(/theme/i).and(page.getByRole("listitem"))).toBeVisible();
  });

  test("should export a PNG data URL with the size of the scale", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec(SPEC);
    const size = previewSize();

    // Act
    const result = await window.tin.export({ format: "png", scale: 2 });

    // Assert
    expect(result.dataUrl.startsWith("data:image/png;base64,")).toBe(true);
    expect(result.width).toBe(size.width * 2);
    expect(result.height).toBe(size.height * 2);
    const bytes = dataUrlBytes(result.dataUrl);
    expect(bytes.slice(0, 8)).toEqual(PNG_SIGNATURE);
    expect(pngSize(bytes)).toEqual({ width: result.width, height: result.height });
  });

  test("should export an SVG data URL with embedded fonts", async () => {
    // Arrange
    await mountApp();
    await window.tin.setSpec(SPEC);
    const size = previewSize();

    // Act
    const result = await window.tin.export({ format: "svg" });

    // Assert
    expect(result.dataUrl.startsWith("data:image/svg+xml;base64,")).toBe(true);
    expect(result).toMatchObject(size);
    const svg = new TextDecoder().decode(dataUrlBytes(result.dataUrl));
    expect(svg).toContain("@font-face");
  });
});
