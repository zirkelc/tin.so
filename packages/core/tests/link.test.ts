import { describe, expect, test } from "vite-plus/test";
import { createLink, decodeSpec, encodeSpec, readLink } from "../src/link.ts";

const SPEC = {
  theme: "vercel",
  windows: [
    { panes: [{ title: "main.ts", code: 'import plans from "./plans.toml";\n// → ü 日本' }] },
  ],
};

describe("encodeSpec", () => {
  test("should round trip a spec", async () => {
    // Act
    const decoded = await decodeSpec(await encodeSpec(SPEC));

    // Assert
    expect(decoded).toEqual({ v: 1, ...SPEC });
  });

  test("should only use URL-safe characters", async () => {
    // Act
    const encoded = await encodeSpec(SPEC);

    // Assert
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("createLink", () => {
  test("should put the spec in the fragment of the app URL", async () => {
    // Act
    const link = await createLink(SPEC, "https://example.com/editor");

    // Assert
    const url = new URL(link);
    expect(url.origin + url.pathname).toBe("https://example.com/editor");
    expect(url.hash.startsWith("#spec=")).toBe(true);
    expect(await readLink(link)).toEqual({ v: 1, ...SPEC });
  });

  test("should read no spec from a link without one", async () => {
    // Act
    const spec = await readLink("https://example.com/#other");

    // Assert
    expect(spec).toBeUndefined();
  });
});

describe("decodeSpec", () => {
  test("should change the chrome field of old links to the window parts", async () => {
    // Arrange
    const old = {
      windows: [
        { chrome: "mac", panes: [{ code: "a" }] },
        { chrome: "tabs", panes: [{ code: "b" }] },
        { chrome: "none", title: "c", panes: [{ code: "c" }] },
      ],
    };

    // Act
    const decoded = await decodeSpec(await encodeSpec(old));

    // Assert
    expect(decoded).toEqual({
      v: 1,
      windows: [
        { panes: [{ code: "a" }] },
        { titleBar: false, tabs: true, panes: [{ code: "b" }] },
        { titleBar: false, title: "c", panes: [{ code: "c" }] },
      ],
    });
  });
});

describe("decodeSpec limit", () => {
  test("should refuse a spec that inflates past the limit", async () => {
    // Arrange
    const encoded = await encodeSpec({ windows: [{ panes: [{ code: "a".repeat(10_000) }] }] });

    // Act
    const result = decodeSpec(encoded, { maxBytes: 1_000 });

    // Assert
    await expect(result).rejects.toThrow();
  });
});

describe("spec version in links", () => {
  test("should put version 1 first into a spec without a version", async () => {
    // Act
    const decoded = await decodeSpec(await encodeSpec(SPEC));

    // Assert
    expect(Object.keys(decoded as object)[0]).toBe("v");
    expect((decoded as { v: number }).v).toBe(1);
  });

  test("should keep the version of a spec", async () => {
    // Arrange
    const spec = { v: 2, windows: [] };

    // Act
    const decoded = await decodeSpec(await encodeSpec(spec));

    // Assert
    expect(decoded).toEqual({ v: 2, windows: [] });
  });

  test("should keep an input that is not a spec object", async () => {
    // Act
    const decoded = await decodeSpec(await encodeSpec([1, 2]));

    // Assert
    expect(decoded).toEqual([1, 2]);
  });
});
