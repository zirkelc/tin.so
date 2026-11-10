import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { describe, expect, test } from "vite-plus/test";
import { initPng } from "../src/png.ts";

const wasmPath = createRequire(import.meta.url).resolve("@resvg/resvg-wasm/index_bg.wasm");

describe("initPng", () => {
  test("should load again after a failed load, and only once after a good load", async () => {
    // Arrange
    let loads = 0;
    const load = () => {
      loads++;
      return readFile(wasmPath);
    };

    // Act
    const failed = initPng(() => Promise.reject(new Error("offline")));
    await expect(failed).rejects.toThrow();
    await initPng(load);
    await initPng(load);

    // Assert
    expect(loads).toBe(1);
  });
});
