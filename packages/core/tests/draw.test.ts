import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { Resvg } from "@resvg/resvg-wasm";
import { beforeAll, describe, expect, test } from "vite-plus/test";
import { blurredRect, roundedRect } from "../src/frames/draw.ts";
import { initPng } from "../src/png.ts";

const wasmPath = createRequire(import.meta.url).resolve("@resvg/resvg-wasm/index_bg.wasm");
const WIDTH = 600;
const HEIGHT = 400;

function pixels(content: string): Uint8Array {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}"><rect width="${WIDTH}" height="${HEIGHT}" fill="white"/>${content}</svg>`;
  const image = new Resvg(svg).render();
  const result = image.pixels.slice();
  image.free();
  return result;
}

function maxDifference(a: Uint8Array, b: Uint8Array): number {
  let max = 0;
  for (let i = 0; i < a.length; i++) max = Math.max(max, Math.abs(a[i]! - b[i]!));
  return max;
}

beforeAll(() => initPng(() => readFile(wasmPath)));

describe("blurredRect", () => {
  // The blur sizes of the default window shadow, from a sharp edge to a wide glow
  test.each([1.1, 5, 8.95, 40])("should look like a blur filter with a sigma of %s", (sigma) => {
    // Arrange
    const box = { x: 100.3, y: 80.6, width: 400.4, height: 220.3 };
    const filter = `<defs><filter id="f" filterUnits="userSpaceOnUse" x="0" y="0" width="${WIDTH}" height="${HEIGHT}"><feGaussianBlur stdDeviation="${sigma}"/></filter></defs>`;
    const expected = pixels(
      filter + roundedRect(box, 18, { fill: "black", "fill-opacity": 0.12, filter: "url(#f)" }),
    );

    // Act
    const result = pixels(blurredRect("s", box, 18, sigma, "black", 0.12));

    // Assert: 5 of 255 is below what the eye can see on a gradient
    expect(maxDifference(result, expected)).toBeLessThanOrEqual(5);
  });

  test("should draw no filter", () => {
    // Arrange
    const box = { x: 10, y: 10, width: 100, height: 50 };

    // Act
    const results = [2, 40].map((sigma) => blurredRect("s", box, 18, sigma, "black", 1));

    // Assert
    expect(results.some((svg) => svg.includes("<filter"))).toBe(false);
  });

  test("should draw a sharp rect without a blur", () => {
    // Arrange
    const box = { x: 10, y: 10, width: 100, height: 50 };

    // Act
    const result = blurredRect("s", box, 18, 0, "black", 0.5);

    // Assert
    expect(result).toBe(roundedRect(box, 18, { fill: "black", "fill-opacity": 0.5 }));
  });
});
