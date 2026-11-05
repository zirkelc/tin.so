import { describe, expect, test } from "vite-plus/test";
import { formatCode, formatWidth } from "../src/format.ts";

describe("formatCode", () => {
  test("should put an object that fits on one line", async () => {
    // Arrange
    const code = 'const user = {\n  id: 1,\n  name: "Ada",\n};';

    // Act
    const formatted = await formatCode(code, "typescript");

    // Assert
    expect(formatted).toBe('const user = { id: 1, name: "Ada" };');
  });

  test("should keep a string concatenation on one line that fits the width", async () => {
    // Arrange
    const code =
      'const message = "Hello, " + user.name + ", you have " + count + " new messages in your inbox";';

    // Act
    const formatted = await formatCode(code, "typescript");

    // Assert
    expect(formatted).toBe(code);
  });

  test("should break a line that is longer than the width", async () => {
    // Arrange
    const code = 'const message = "Hello, " + user.name + ", you have " + count + " new messages";';

    // Act
    const formatted = await formatCode(code, "typescript", 60);

    // Assert
    expect(formatted.split("\n").length).toBe(6);
  });
});

describe("formatWidth", () => {
  test.each([
    [undefined, 100],
    ["16:9", 100],
    ["1.91:1", 100],
    ["4:3", 88],
    ["1:1", 72],
    ["4:5", 72],
    ["9:16", 60],
  ])("should give the aspect ratio %s the width %i", (aspectRatio, width) => {
    // Act
    const result = formatWidth(aspectRatio);

    // Assert
    expect(result).toBe(width);
  });
});
