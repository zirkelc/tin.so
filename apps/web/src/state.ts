import { DEFAULT_THEME, encodeSpec, readLink, type SpecInput } from "@tin.so/core";

export const DEFAULT_SPEC: SpecInput = {
  theme: DEFAULT_THEME,
  windows: [
    {
      titleBar: false,
      tabs: true,
      split: "row",
      panes: [
        {
          title: "main.ts",
          code: 'import plans from "./plans.toml";',
          annotations: [
            {
              line: 1,
              match: "plans",
              code: "const plans: {\n    readonly free: { readonly price: 0 };\n    readonly pro: { readonly price: 12 };\n}",
            },
          ],
        },
        { title: "plans.toml", code: "[free]\nprice = 0\n\n[pro]\nprice = 12" },
      ],
    },
  ],
};

/** Reads the spec from the fragment of the page URL */
export async function readSpecFromUrl(): Promise<SpecInput | undefined> {
  try {
    return (await readLink(window.location.href)) as SpecInput | undefined;
  } catch {
    return undefined;
  }
}

/** Writes the spec into the fragment of the page URL, without a new history entry */
export async function writeSpecToUrl(spec: SpecInput): Promise<void> {
  const hash = `#spec=${await encodeSpec(spec)}`;
  if (window.location.hash !== hash) window.history.replaceState(null, "", hash);
}
