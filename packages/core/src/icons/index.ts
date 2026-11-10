import simpleIcons from "./icons.generated.json" with { type: "json" };

/** An icon on a 24px grid, drawn either filled or as a 2px stroke */
export type Icon = {
  id: string;
  title: string;
  /** SVG elements of the icon, without the root element */
  body: string;
  style: "fill" | "stroke";
};

/** The icon of the language, from its id in the language list */
export const AUTO_ICON = "auto";
export const FILE_ICON = "file";
export const NO_ICON = "none";

// Lucide "file" icon (ISC)
const FILE: Icon = {
  id: FILE_ICON,
  title: "File",
  body: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
  style: "stroke",
};

const ICONS: Array<Icon> = [
  FILE,
  ...Object.entries(simpleIcons).map(([id, icon]) => ({
    id,
    title: icon.title,
    body: `<path d="${icon.path}"/>`,
    style: "fill" as const,
  })),
];

/** Icon ids that a pane can name, besides "auto" and "none" */
export const ICON_IDS = ICONS.map((icon) => icon.id);

// Shiki language ids and their icons. Languages without an entry get the file icon.
const LANGUAGE_ICONS: Record<string, string> = {
  astro: "astro",
  bash: "gnubash",
  c: "c",
  clojure: "clojure",
  cpp: "cplusplus",
  csharp: "dotnet",
  css: "css",
  dart: "dart",
  docker: "docker",
  dotenv: "dotenv",
  elixir: "elixir",
  erlang: "erlang",
  "git-commit": "git",
  "git-rebase": "git",
  go: "go",
  graphql: "graphql",
  haskell: "haskell",
  html: "html5",
  java: "openjdk",
  javascript: "javascript",
  json: "json",
  jsonc: "json",
  json5: "json",
  jsx: "react",
  julia: "julia",
  kotlin: "kotlin",
  latex: "latex",
  lua: "lua",
  markdown: "markdown",
  mdx: "mdx",
  nginx: "nginx",
  nix: "nixos",
  ocaml: "ocaml",
  perl: "perl",
  php: "php",
  prisma: "prisma",
  python: "python",
  r: "r",
  ruby: "ruby",
  rust: "rust",
  sass: "sass",
  scala: "scala",
  scss: "sass",
  shellscript: "gnubash",
  solidity: "solidity",
  sql: "postgresql",
  svelte: "svelte",
  swift: "swift",
  terraform: "terraform",
  toml: "toml",
  tsx: "react",
  typescript: "typescript",
  vue: "vuedotjs",
  wasm: "webassembly",
  xml: "xml",
  yaml: "yaml",
  zig: "zig",
};

export function getIcon(id: string): Icon | undefined {
  return ICONS.find((icon) => icon.id === id);
}

/** Resolves the icon setting of a pane. Returns undefined for "none". */
export function resolveIcon(setting: string, language: string): Icon | undefined {
  if (setting === NO_ICON) return undefined;
  if (setting === AUTO_ICON) return getIcon(LANGUAGE_ICONS[language] ?? FILE_ICON);
  return getIcon(setting);
}
