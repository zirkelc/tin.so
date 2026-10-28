import type { ClipboardEvent } from "react";
import type { Plugin } from "prettier";

type Formatter = { parser: string; plugins: () => Promise<Array<Plugin>> };

// Prettier and its plugins load only when the user formats code for the first time
const babel = async () => [
  await import("prettier/plugins/babel"),
  (await import("prettier/plugins/estree")) as Plugin,
];
const typescript = async () => [
  await import("prettier/plugins/typescript"),
  (await import("prettier/plugins/estree")) as Plugin,
];
const postcss = async () => [await import("prettier/plugins/postcss")];
const html = async () => [await import("prettier/plugins/html")];
const markdown = async () => [await import("prettier/plugins/markdown")];
const yaml = async () => [await import("prettier/plugins/yaml")];
const graphql = async () => [await import("prettier/plugins/graphql")];

// By the language ids of the highlighter
const FORMATTERS: Record<string, Formatter> = {
  javascript: { parser: "babel", plugins: babel },
  jsx: { parser: "babel", plugins: babel },
  typescript: { parser: "typescript", plugins: typescript },
  tsx: { parser: "typescript", plugins: typescript },
  json: { parser: "json", plugins: babel },
  jsonc: { parser: "jsonc", plugins: babel },
  json5: { parser: "json5", plugins: babel },
  css: { parser: "css", plugins: postcss },
  scss: { parser: "scss", plugins: postcss },
  less: { parser: "less", plugins: postcss },
  html: { parser: "html", plugins: html },
  vue: { parser: "vue", plugins: html },
  markdown: { parser: "markdown", plugins: markdown },
  yaml: { parser: "yaml", plugins: yaml },
  graphql: { parser: "graphql", plugins: graphql },
};

export function canFormat(language: string): boolean {
  return language in FORMATTERS;
}

/** Formats code with Prettier. Throws when the language has no formatter or the code does not parse. */
export async function formatCode(code: string, language: string): Promise<string> {
  const formatter = FORMATTERS[language];
  if (!formatter) throw new Error(`No formatter for ${language}`);
  const [{ format }, plugins] = await Promise.all([
    import("prettier/standalone"),
    formatter.plugins(),
  ]);
  const formatted = await format(code, { parser: formatter.parser, plugins, printWidth: 80 });
  return formatted.replace(/\n+$/, "");
}

/**
 * Formats code that the user pastes into an empty pane. A paste into existing code stays as it
 * is, and so does code that does not parse, such as a part of a file.
 */
export function pasteAndFormat(
  event: ClipboardEvent<HTMLTextAreaElement>,
  language: string,
  setCode: (code: string) => void,
  /** Sets the formatted code, unless the code is no longer the pasted text */
  setFormatted: (input: string, formatted: string) => void,
) {
  const { selectionStart, selectionEnd, value } = event.currentTarget;
  const empty = `${value.slice(0, selectionStart)}${value.slice(selectionEnd)}`.trim() === "";
  if (!empty || !canFormat(language)) return;
  const text = event.clipboardData.getData("text/plain");
  if (!text) return;
  event.preventDefault();
  setCode(text);
  formatCode(text, language).then(
    (formatted) => setFormatted(text, formatted),
    () => {},
  );
}
