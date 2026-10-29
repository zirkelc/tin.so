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

// Window parts of the chrome field that older specs have
const CHROME_FIELDS: Record<string, Record<string, boolean>> = {
  mac: {},
  tabs: { titleBar: false, tabs: true },
  none: { titleBar: false },
};

/**
 * Changes the fields of older specs from before the v field to the current fields, so that old
 * links, files and images stay valid. Input that is not a spec stays as it is, so that the spec
 * validation reports it.
 */
export function migrateLegacySpec(spec: unknown): unknown {
  if (typeof spec !== "object" || spec === null) return spec;
  const windows = (spec as { windows?: unknown }).windows;
  if (!Array.isArray(windows)) return spec;
  if (
    !windows.some((window) => typeof window === "object" && window !== null && "chrome" in window)
  )
    return spec;
  return {
    ...spec,
    windows: windows.map((window: unknown) => {
      if (typeof window !== "object" || window === null || !("chrome" in window)) return window;
      const { chrome, ...rest } = window as { chrome: unknown };
      const fields = typeof chrome === "string" ? CHROME_FIELDS[chrome] : undefined;
      // An unknown value stays, so that the spec validation reports it
      return fields ? { ...fields, ...rest } : window;
    }),
  };
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
