// The version of a spec without a v field. This never changes, so that old specs stay valid.
export const IMPLICIT_SPEC_VERSION = 1;

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
 * version changes the format. A spec with a version stays as it is.
 */
export function stampSpecVersion(spec: unknown): unknown {
  if (typeof spec !== "object" || spec === null || Array.isArray(spec) || "v" in spec) return spec;
  return { v: IMPLICIT_SPEC_VERSION, ...spec };
}
