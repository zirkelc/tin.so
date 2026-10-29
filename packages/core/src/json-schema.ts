import { toJsonSchema } from "@valibot/to-json-schema";
import { DEFAULT_APP_URL } from "./link.ts";
import { EXTENSION_PREFIX } from "./migrate.ts";
import { LATEST_SPEC_VERSION, SpecSchema } from "./spec.ts";

/** The URL of the JSON Schema of the latest spec version, on the hosted app */
export const SPEC_SCHEMA_URL = new URL(
  `schema/v${LATEST_SPEC_VERSION}.json`,
  DEFAULT_APP_URL,
).toString();

/**
 * The spec as a JSON Schema, for editors and agents. JSON Schema cannot express the custom checks of
 * the spec, such as line ranges, so their rules are only in the descriptions.
 */
export function specJsonSchema(): Record<string, unknown> {
  const { $schema, ...schema } = toJsonSchema(SpecSchema, { errorMode: "ignore" });
  return { $schema, $id: SPEC_SCHEMA_URL, title: "tin.so spec", ...allowExtensions(schema) };
}

// Each closed object also accepts the keys of other tools, which the renderer ignores
function allowExtensions(node: unknown): any {
  if (Array.isArray(node)) return node.map(allowExtensions);
  if (typeof node !== "object" || node === null) return node;
  const out = Object.fromEntries(
    Object.entries(node).map(([key, value]) => [key, allowExtensions(value)]),
  );
  if (out.type === "object" && out.additionalProperties === false)
    out.patternProperties = { [`^${EXTENSION_PREFIX}`]: {} };
  return out;
}

// The hosts that serve the spec schema in addition to the host of the hosted app
const SPEC_SCHEMA_HOSTS = ["tin.so"];

const SPEC_SCHEMA_PATH = /\/schema\/v\d+\.json$/;

/**
 * True when the value is the URL of a tin.so spec schema: a path that ends with
 * /schema/v<number>.json on the host of the hosted app, on tin.so, or on the host of the given
 * app URL (for example a local editor).
 */
export function isSpecSchemaUrl(value: unknown, appUrl?: string): boolean {
  if (typeof value !== "string" || !URL.canParse(value)) return false;
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (!SPEC_SCHEMA_PATH.test(url.pathname)) return false;
  const hosts = [new URL(SPEC_SCHEMA_URL).host, ...SPEC_SCHEMA_HOSTS];
  if (appUrl !== undefined && URL.canParse(appUrl)) hosts.push(new URL(appUrl).host);
  return hosts.includes(url.host);
}
