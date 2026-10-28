/**
 * Ports the themes of ray.so (MIT, https://github.com/raycast/ray-so) into a JSON file.
 * The source file is TypeScript with React and asset imports, so the script strips those parts,
 * evaluates the theme object and converts every color to hex, because resvg cannot parse oklch().
 */
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { formatHex, formatHex8, parse } from "culori";

const COMMIT = "2e6a32808fb13a9246cac153e53e729def5ea7e8";
const BASE = `https://raw.githubusercontent.com/raycast/ray-so/${COMMIT}/app/(navigation)/(code)`;
const OUT_DIR = new URL("../src/themes/", import.meta.url);

const SYNTAX_KEYS = [
  "foreground",
  "constant",
  "string",
  "comment",
  "keyword",
  "parameter",
  "function",
  "stringExpression",
  "punctuation",
  "link",
  "number",
  "property",
  "objectLiteral",
  "highlight",
  "highlightBorder",
  "highlightHover",
  "diffDeleted",
  "diffInserted",
] as const;

async function fetchText(path: string): Promise<string> {
  const response = await fetch(`${BASE}/${path}`);
  if (!response.ok) throw new Error(`Failed to fetch ${path}: ${response.status}`);
  return response.text();
}

function toHex(color: string): string {
  const parsed = parse(color.trim());
  if (!parsed) throw new Error(`Cannot parse color: ${color}`);
  return parsed.alpha === undefined || parsed.alpha === 1 ? formatHex(parsed) : formatHex8(parsed);
}

function convertSyntax(syntax: Record<string, string> | undefined) {
  if (!syntax) return undefined;
  const result: Record<string, string> = {};
  for (const key of SYNTAX_KEYS) {
    if (syntax[key]) result[key] = toHex(syntax[key]);
  }
  return result;
}

function toEvaluableModule(source: string): string {
  const start = source.indexOf("export const THEMES");
  const end = source.indexOf("const themeAtom");
  if (start === -1 || end === -1) throw new Error("Unexpected structure of themes.ts");

  const themes = source
    .slice(start, end)
    .replace(/export const THEMES:[^=]+=/, "export const THEMES =")
    .replace(/^\s*(icon|iconUrl):.*$/gm, "");

  return `const convertToShikiTheme = (syntax) => syntax;\n${themes}`;
}

async function main() {
  const source = await fetchText("store/themes.ts");
  const dir = await mkdtemp(join(tmpdir(), "rayso-themes-"));
  const modulePath = join(dir, "themes.mjs");
  await writeFile(modulePath, toEvaluableModule(source));
  const { THEMES } = (await import(modulePath)) as { THEMES: Record<string, any> };

  const themes = Object.values(THEMES).map((theme) => ({
    id: theme.id,
    name: theme.name,
    background: { from: toHex(theme.background.from), to: toHex(theme.background.to) },
    ...(theme.font && { font: theme.font }),
    ...(theme.partner && { partner: true }),
    ...(theme.hidden && { hidden: true }),
    ...(theme.lineNumbers !== undefined && { lineNumbers: theme.lineNumbers }),
    syntax: {
      ...(theme.syntax.light && { light: convertSyntax(theme.syntax.light) }),
      ...(theme.syntax.dark && { dark: convertSyntax(theme.syntax.dark) }),
    },
  }));

  await writeFile(new URL("rayso-themes.json", OUT_DIR), `${JSON.stringify(themes, null, 2)}\n`);

  // The Tailwind theme colors tokens with its own TextMate themes instead of the shared token colors
  for (const mode of ["light", "dark"]) {
    const textmate = await fetchText(`assets/tailwind/${mode}.json`);
    await writeFile(new URL(`tailwind-${mode}.json`, OUT_DIR), textmate);
  }

  console.log(`Ported ${themes.length} themes from ray.so@${COMMIT.slice(0, 7)}`);
}

await main();
