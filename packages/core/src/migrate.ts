// The version of a spec without a v field. This never changes, so that old specs stay valid.
export const IMPLICIT_SPEC_VERSION = 1;

// The path of a spec schema URL ends with the version, such as /schema/v1.json
const SCHEMA_VERSION = /\/schema\/v(\d+)\.json$/;

/**
 * The version that the $schema URL of a spec names, or undefined when the spec has no such URL.
 * Only the path counts, so that the URL of each host that serves the schema gives the version.
 */
export function schemaVersion(spec: unknown): number | undefined {
  if (typeof spec !== "object" || spec === null || !("$schema" in spec)) return undefined;
  const url = (spec as { $schema: unknown }).$schema;
  if (typeof url !== "string" || !URL.canParse(url)) return undefined;
  const match = SCHEMA_VERSION.exec(new URL(url).pathname);
  return match ? Number(match[1]) : undefined;
}

/**
 * Keys with this prefix hold data of other tools, such as an editor state. The renderer ignores
 * them in each object of a spec, so that a spec with such keys stays valid in all versions.
 */
export const EXTENSION_PREFIX = "x-";

/** Removes the keys of other tools from all objects of a spec */
export function withoutExtensions(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutExtensions);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !key.startsWith(EXTENSION_PREFIX))
      .map(([key, entry]) => [key, withoutExtensions(entry)]),
  );
}

/**
 * Adds the version to a spec without one, so that a stored spec keeps its meaning when a later
 * version changes the format. The version comes from the $schema URL, or is version 1 without it.
 * A spec with a version stays as it is.
 */
export function stampSpecVersion(spec: unknown): unknown {
  if (typeof spec !== "object" || spec === null || Array.isArray(spec) || "v" in spec) return spec;
  return { v: schemaVersion(spec) ?? IMPLICIT_SPEC_VERSION, ...spec };
}
