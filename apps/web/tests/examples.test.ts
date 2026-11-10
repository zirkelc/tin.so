import { inferLanguage, LANGUAGE_IDS, layout, parseSpec, PLAIN_TEXT } from "@tin.so/core";
import { describe, expect, test } from "vite-plus/test";
import { SHOWCASE_EXAMPLES, SIMPLE_EXAMPLES } from "../src/examples.ts";

const LANGUAGES = LANGUAGE_IDS.filter((id) => id !== PLAIN_TEXT);

/**
 * Languages that no file name can give: they share the extension of another language,
 * they have a fixed file name without a known extension, or they have no file of their own.
 */
const NO_FILE_NAME = [
  // The extension of a more common language: .ahk, .html, .ts, .php, .tex, .nf
  "ahk2",
  "angular-html",
  "angular-ts",
  "blade",
  "html-derivative",
  "latex",
  "nextflow-groovy",
  "ts-tags",
  "vue-html",
  "vue-vine",
  // Shared extensions: .v (coq, verilog), .m (matlab, objective-c), .pl (perl, prolog), .s (assembly)
  "coq",
  "verilog",
  "matlab",
  "objective-c",
  "perl",
  "prolog",
  "mipsasm",
  "riscv",
  // Fixed file names: .htaccess, bird.conf, .env, COMMIT_EDITMSG, git-rebase-todo, nginx.conf, ~/.ssh/config
  "apache",
  "bird2",
  "dotenv",
  "git-commit",
  "git-rebase",
  "nginx",
  "ssh-config",
  // A terminal session is not a file, and PL/SQL usually is in .sql files
  "shellsession",
  "plsql",
];

// The editor sets the language of these examples explicitly
const NOT_INFERRED: Array<string> = NO_FILE_NAME;

// The one-window spec that the editor makes from a simple example
function simpleSpec(language: string) {
  const { title, code } = SIMPLE_EXAMPLES[language]!;
  return { windows: [{ panes: [{ title, code, language }] }] };
}

describe("SIMPLE_EXAMPLES", () => {
  test("should have an example for each language and no other keys", () => {
    // Act
    const keys = Object.keys(SIMPLE_EXAMPLES).toSorted();

    // Assert
    expect(keys).toEqual(LANGUAGES.toSorted());
  });

  test.each(LANGUAGES.filter((id) => !NOT_INFERRED.includes(id)))(
    "should give %s from the file name",
    (language) => {
      // Act
      const inferred = inferLanguage(SIMPLE_EXAMPLES[language]!.title);

      // Assert
      expect(inferred).toBe(language);
    },
  );

  test.each(NOT_INFERRED)("should not give %s from the file name", (language) => {
    // Act
    const inferred = inferLanguage(SIMPLE_EXAMPLES[language]!.title);

    // Assert
    expect(inferred).not.toBe(language);
  });

  test.each(LANGUAGES)("should keep the %s example short and clean", (language) => {
    // Arrange
    const lines = SIMPLE_EXAMPLES[language]!.code.split("\n");

    // Act
    const long = lines.length > 12;
    const trailing = lines.filter((line) => line !== line.trimEnd());
    // Tab-separated values need tabs between the columns
    const tabs = language === "tsv" ? [] : lines.filter((line) => line.includes("\t"));

    // Assert
    expect(long).toBe(false);
    expect(trailing).toEqual([]);
    expect(tabs).toEqual([]);
  });

  test.each(LANGUAGES)("should give a valid spec for %s", (language) => {
    // Act
    const spec = parseSpec(simpleSpec(language));

    // Assert
    expect(spec.windows.length).toBe(1);
  });

  test.each(LANGUAGES)("should lay out the spec for %s", async (language) => {
    // Act
    const scene = await layout(simpleSpec(language));

    // Assert
    expect(scene.windows.length).toBe(1);
  });
});

describe("SHOWCASE_EXAMPLES", () => {
  test("should have unique names in each language and known languages", () => {
    // Act
    const names = new Set(
      SHOWCASE_EXAMPLES.map((example) => `${example.language}/${example.name}`),
    );
    const unknown = SHOWCASE_EXAMPLES.filter((example) => !LANGUAGES.includes(example.language));

    // Assert
    expect(names.size).toBe(SHOWCASE_EXAMPLES.length);
    expect(unknown).toEqual([]);
  });

  test.each(SHOWCASE_EXAMPLES.map((example) => [example.name, example.spec] as const))(
    "should lay out the %s showcase",
    async (_name, input) => {
      // Act
      const spec = parseSpec(input);
      const scene = await layout(input);

      // Assert
      expect(scene.windows.length).toBe(spec.windows.length);
    },
  );
});
