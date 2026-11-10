/**
 * Writes the path data of the language icons from Simple Icons (CC0, https://simpleicons.org).
 * Only the icons in the list are bundled, because the full set is several megabytes.
 */
import { writeFile } from "node:fs/promises";
import * as simpleIcons from "simple-icons";

const SLUGS = [
  "astro",
  "bun",
  "c",
  "clojure",
  "cplusplus",
  "css",
  "dart",
  "deno",
  "docker",
  "dotenv",
  "dotnet",
  "elixir",
  "erlang",
  "git",
  "githubactions",
  "gnubash",
  "go",
  "graphql",
  "haskell",
  "html5",
  "javascript",
  "json",
  "julia",
  "kotlin",
  "latex",
  "lua",
  "markdown",
  "mdx",
  "mysql",
  "nginx",
  "nixos",
  "nodedotjs",
  "ocaml",
  "openjdk",
  "perl",
  "php",
  "postgresql",
  "prisma",
  "python",
  "r",
  "react",
  "ruby",
  "rust",
  "sass",
  "scala",
  "solidity",
  "sqlite",
  "svelte",
  "swift",
  "tailwindcss",
  "terraform",
  "toml",
  "typescript",
  "vite",
  "vuedotjs",
  "webassembly",
  "xml",
  "yaml",
  "zig",
];

const icons = Object.values(simpleIcons).filter(
  (icon): icon is simpleIcons.SimpleIcon => typeof icon === "object" && "slug" in icon,
);

const result: Record<string, { title: string; path: string }> = {};
for (const slug of SLUGS) {
  const icon = icons.find((icon) => icon.slug === slug);
  if (!icon) throw new Error(`Simple Icons has no icon "${slug}"`);
  result[slug] = { title: icon.title, path: icon.path };
}

await writeFile(
  new URL("../src/icons/icons.generated.json", import.meta.url),
  `${JSON.stringify(result, null, 2)}\n`,
);
console.log(`Wrote ${SLUGS.length} icons`);
