import { DEFAULT_THEME, encodeSpec, readLink, type SpecInput } from "@tin.so/core";

export const DEFAULT_SPEC: SpecInput = {
  theme: DEFAULT_THEME,
  windows: [
    {
      panes: [
        {
          title: "counter.tsx",
          code: 'import { useState } from "react";\n\n// Count the clicks of a button\nexport function Counter({ step = 1 }: Props) {\n  const [count, setCount] = useState(0);\n  return (\n    <button onClick={() => setCount(count + step)}>\n      Clicked {count} times\n    </button>\n  );\n}',
        },
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
