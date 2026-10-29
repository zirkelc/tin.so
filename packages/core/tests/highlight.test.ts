import { describe, expect, test } from "vite-plus/test";
import { highlight, inferLanguage, PLAIN_TEXT, resolveLanguage } from "../src/highlight/index.ts";
import { getSyntax, getTheme } from "../src/themes/index.ts";

describe("inferLanguage", () => {
  test.each([
    ["main.ts", "typescript"],
    ["plans.toml", "toml"],
    ["posts.csv", "csv"],
    ["nub.jsonc", "jsonc"],
    ["build.mjs", "javascript"],
    ["Dockerfile", "docker"],
    ["greeter.ex", "elixir"],
    ["Counter.sol", "solidity"],
    ["main.ml", "ocaml"],
    ["app.service", "systemd"],
    ["notes.unknown", PLAIN_TEXT],
    [undefined, PLAIN_TEXT],
  ])("should infer the language of %s", (fileName, expected) => {
    // Act
    const language = inferLanguage(fileName);

    // Assert
    expect(language).toBe(expected);
  });
});

describe("resolveLanguage", () => {
  test.each([["constructor"], ["toString"], ["valueOf"], ["__proto__"]])(
    "should give plain text for the object key %s",
    (language) => {
      // Act
      const result = resolveLanguage(language);

      // Assert
      expect(result).toBe(PLAIN_TEXT);
    },
  );

  test("should give plain text for a file name with an object key as extension", () => {
    // Act
    const result = inferLanguage("x.constructor");

    // Assert
    expect(result).toBe(PLAIN_TEXT);
  });

  test("should resolve an alias to the language id", () => {
    // Act
    const language = resolveLanguage("py");

    // Assert
    expect(language).toBe("python");
  });
});

describe("highlight", () => {
  test("should color tokens with the theme syntax", async () => {
    // Arrange
    const theme = getTheme("vercel");
    const syntax = getSyntax(theme, "dark");

    // Act
    const lines = await highlight(
      'import plans from "./plans.toml";',
      "typescript",
      theme,
      "dark",
      syntax,
    );

    // Assert
    const keyword = lines[0]!.find((token) => token.content === "import");
    const string = lines[0]!.find((token) => token.content.includes("plans.toml"));
    expect(keyword?.color).toBe(syntax.keyword);
    expect(string?.color).toBe(syntax.string);
  });

  test("should color plain text with the foreground", async () => {
    // Arrange
    const theme = getTheme("candy");
    const syntax = getSyntax(theme, "light");

    // Act
    const lines = await highlight("hello\nworld", PLAIN_TEXT, theme, "light", syntax);

    // Assert
    expect(lines.length).toBe(2);
    expect(lines.flat().map((token) => token.color)).toEqual([
      syntax.foreground,
      syntax.foreground,
    ]);
  });
});
