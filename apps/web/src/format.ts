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

/**
 * The line width of formatted code for the aspect ratio of the image, such as "16:9". A wide image
 * takes longer lines, a square or tall image shorter ones, so that the code fits the shape.
 */
export function formatWidth(aspectRatio: string | undefined): number {
  if (!aspectRatio) return 100;
  const [width, height] = aspectRatio.split(":").map(Number) as [number, number];
  const ratio = width / height;
  if (ratio >= 1.5) return 100;
  if (ratio > 1) return 88;
  if (ratio >= 0.75) return 72;
  return 60;
}

export function canFormat(language: string): boolean {
  return language in FORMATTERS;
}

/**
 * Formats code with Prettier on few lines: an object that fits on one line goes on one line. Throws
 * when the language has no formatter or the code does not parse.
 */
export async function formatCode(
  code: string,
  language: string,
  printWidth: number = formatWidth(undefined),
): Promise<string> {
  const formatter = FORMATTERS[language];
  if (!formatter) throw new Error(`No formatter for ${language}`);
  const [{ format }, plugins] = await Promise.all([
    import("prettier/standalone"),
    formatter.plugins(),
  ]);
  const formatted = await format(code, {
    parser: formatter.parser,
    plugins,
    printWidth,
    objectWrap: "collapse",
  });
  return formatted.replace(/\n+$/, "");
}
