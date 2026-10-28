import { describe, expect, test } from "vite-plus/test";
import { isSpecSchemaUrl, SPEC_SCHEMA_URL, specJsonSchema } from "../src/json-schema.ts";

describe("specJsonSchema", () => {
  test("should give the schema its URL and describe the fields of the spec", () => {
    // Act
    const result = specJsonSchema() as {
      $id: string;
      $schema: string;
      required: Array<string>;
      properties: Record<string, unknown>;
    };

    // Assert
    expect(result.$id).toBe(SPEC_SCHEMA_URL);
    expect(result.$schema).toBe("http://json-schema.org/draft-07/schema#");
    expect(result.required).toEqual(["windows"]);
    expect(Object.keys(result.properties).includes("$schema")).toBe(true);
  });

  test("should put the schema at the versioned path of the app", () => {
    // Assert
    expect(SPEC_SCHEMA_URL).toBe("https://code-image.zirkelc.workers.dev/schema/v1.json");
  });
});

describe("isSpecSchemaUrl", () => {
  test("should accept the schema URL of the hosted app and of tin.so", () => {
    // Act
    const hosted = isSpecSchemaUrl(SPEC_SCHEMA_URL);
    const tin = isSpecSchemaUrl("https://tin.so/schema/v2.json");

    // Assert
    expect(hosted).toBe(true);
    expect(tin).toBe(true);
  });

  test("should accept the schema URL on the host of the given app", () => {
    // Act
    const local = isSpecSchemaUrl("http://localhost:5173/schema/v1.json", "http://localhost:5173/");
    const withoutApp = isSpecSchemaUrl("http://localhost:5173/schema/v1.json");

    // Assert
    expect(local).toBe(true);
    expect(withoutApp).toBe(false);
  });

  test("should reject other URLs and values", () => {
    // Act
    const results = [
      isSpecSchemaUrl("https://json.schemastore.org/package.json"),
      isSpecSchemaUrl("https://example.com/schema/v1.json"),
      isSpecSchemaUrl("https://tin.so/schema/latest.json"),
      isSpecSchemaUrl("ftp://tin.so/schema/v1.json"),
      isSpecSchemaUrl("not a url"),
      isSpecSchemaUrl(1),
    ];

    // Assert
    expect(results).toEqual([false, false, false, false, false, false]);
  });
});
