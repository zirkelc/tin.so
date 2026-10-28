import { describe, expect, test } from "vite-plus/test";
import { jsonTokens } from "../src/json-tokens.ts";

describe("jsonTokens", () => {
  test("should give the kinds of keys, strings, numbers and literals", () => {
    // Arrange
    const text = '{ "a": "b", "n": -1.5e2, "t": true, "z": null }';

    // Act
    const result = jsonTokens(text).filter((token) => token.kind && token.kind !== "punctuation");

    // Assert
    expect(result).toEqual([
      { text: '"a"', kind: "key" },
      { text: '"b"', kind: "string" },
      { text: '"n"', kind: "key" },
      { text: "-1.5e2", kind: "number" },
      { text: '"t"', kind: "key" },
      { text: "true", kind: "literal" },
      { text: '"z"', kind: "key" },
      { text: "null", kind: "literal" },
    ]);
  });

  test("should keep escaped quotes in a string", () => {
    // Arrange
    const text = '["say \\"hi\\""]';

    // Act
    const result = jsonTokens(text);

    // Assert
    expect(result[1]).toEqual({ text: '"say \\"hi\\""', kind: "string" });
  });

  test("should give the full text, also for text that is not JSON", () => {
    // Arrange
    const text = '{\n  "a": [1, 2],\n  oops "open\n}';

    // Act
    const result = jsonTokens(text);

    // Assert
    expect(result.map((token) => token.text).join("")).toBe(text);
  });
});
