import { describe, expect, test } from "vite-plus/test";
import { cached } from "../src/cache.ts";

describe("cached", () => {
  test("should load a key once", async () => {
    // Arrange
    const cache = new Map<string, Promise<number>>();
    let loads = 0;
    const load = async () => ++loads;

    // Act
    await cached(cache, "a", load);
    const result = await cached(cache, "a", load);

    // Assert
    expect(result).toBe(1);
    expect(loads).toBe(1);
  });

  test("should load a key again after a failed load", async () => {
    // Arrange
    const cache = new Map<string, Promise<number>>();
    const failed = cached(cache, "a", () => Promise.reject(new Error("offline")));
    await expect(failed).rejects.toThrow();

    // Act
    const result = await cached(cache, "a", async () => 2);

    // Assert
    expect(result).toBe(2);
  });
});
