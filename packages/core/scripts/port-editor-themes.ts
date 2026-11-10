/**
 * Ports the editor themes of Shiki (from tm-themes, https://github.com/shikijs/textmate-grammars-themes)
 * into a JSON file, and writes the licenses of the themes into a notice file. A few light variants that
 * Shiki does not have come from the repository of their theme, at a fixed commit.
 * The code of an editor theme gets the colors of its original TextMate theme when it renders, so the
 * JSON keeps only the colors around the code: the window, the line highlight and a few token colors.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { formatHex, formatHex8, parse } from "culori";
import { bundledThemes, type ThemeRegistrationRaw } from "shiki";
import { parse as parseYaml } from "yaml";

const TM_THEMES = "1.12.12";
const TM_THEMES_BASE = `https://cdn.jsdelivr.net/npm/tm-themes@${TM_THEMES}`;
const OUT_FILE = new URL("../src/themes/editor-themes.json", import.meta.url);
const NOTICE_FILE = new URL("../EDITOR_THEMES_NOTICES.md", import.meta.url);
const LOADERS_FILE = new URL("../src/themes/editor-textmate.ts", import.meta.url);
const VENDORED_DIR = new URL("../src/themes/textmate/", import.meta.url);

type Family = {
  id: string;
  name: string;
  dark?: string;
  light?: string;
  /** A gradient behind the window, when the colors of the theme do not give a good one */
  background?: { from: string; to: string };
};

/**
 * The themes, with the Shiki theme of each mode. A dark and a light theme of the same project make
 * one theme. The list is a small set of well-known themes, so that each theme can have a background
 * that suits it.
 */
const FAMILIES: Array<Family> = [
  { id: "ayu", name: "Ayu", dark: "ayu-dark", light: "ayu-light" },
  {
    id: "catppuccin",
    name: "Catppuccin",
    dark: "catppuccin-mocha",
    light: "catppuccin-latte",
    background: { from: "#cba6f7", to: "#f5c2e7" },
  },
  { id: "vscode", name: "VS Code", dark: "dark-plus", light: "light-plus" },
  {
    id: "dracula",
    name: "Dracula",
    dark: "dracula",
    light: "dracula-alucard",
    background: { from: "#bd93f9", to: "#ff79c6" },
  },
  { id: "github", name: "GitHub", dark: "github-dark-default", light: "github-light-default" },
  { id: "material", name: "Material", dark: "material-theme", light: "material-theme-lighter" },
  { id: "night-owl", name: "Night Owl", dark: "night-owl", light: "night-owl-light" },
  { id: "nord", name: "Nord", dark: "nord", background: { from: "#5e81ac", to: "#8fbcbb" } },
  {
    id: "one-dark",
    name: "One Dark",
    dark: "one-dark-pro",
    light: "one-light",
    background: { from: "#61afef", to: "#c678dd" },
  },
  { id: "rose-pine", name: "Rosé Pine", dark: "rose-pine", light: "rose-pine-dawn" },
  {
    id: "solarized",
    name: "Solarized",
    dark: "solarized-dark",
    light: "solarized-light",
    background: { from: "#b58900", to: "#cb4b16" },
  },
  { id: "synthwave-84", name: "SynthWave '84", dark: "synthwave-84" },
  {
    id: "tokyo-night",
    name: "Tokyo Night",
    dark: "tokyo-night",
    light: "tokyo-night-light",
    background: { from: "#7aa2f7", to: "#bb9af7" },
  },
  { id: "vitesse", name: "Vitesse", dark: "vitesse-dark", light: "vitesse-light" },
];

const LICENSES = new Set(["MIT", "Apache-2.0"]);

type Vendored = {
  /** The repository on GitHub and the commit to read from */
  repo: string;
  commit: string;
  /** The theme file and the license file in the repository */
  file: string;
  licenseFile: string;
  license: string;
  displayName: string;
  /** Turns the text of the theme file into a TextMate theme */
  convert: (text: string) => Pick<ThemeRegistrationRaw, "colors" | "tokenColors">;
};

/**
 * The official light variants that tm-themes does not have. The script writes each as a TextMate theme
 * into the source folder, so that the package does not load them from the network.
 */
const VENDORED: Record<string, Vendored> = {
  "tokyo-night-light": {
    repo: "enkia/tokyo-night-vscode-theme",
    commit: "7c0f11eaef322f293621ca7befe462214b7ea468",
    file: "themes/tokyo-night-light-color-theme.json",
    licenseFile: "LICENSE.txt",
    license: "MIT",
    displayName: "Tokyo Night Light",
    convert: (text) => {
      const theme = JSON.parse(stripJsonComments(text));
      return { colors: theme.colors, tokenColors: theme.tokenColors };
    },
  },
  "dracula-alucard": {
    repo: "dracula/cursor",
    commit: "21e4edd687bdd5f38e1607c69f19f30cbde22c36",
    file: "dev/src/alucard.yml",
    licenseFile: "LICENSE",
    license: "MIT",
    displayName: "Dracula Alucard",
    convert: (text) => {
      // A color with alpha is "!alpha [color, alpha]". It becomes a list with a mark, joined after the aliases resolve.
      const yaml = text.replace(/!alpha \[([^\]]+)\]/g, '[$1, "__alpha"]');
      const theme = joinAlpha(parseYaml(yaml, { maxAliasCount: -1 })) as ThemeRegistrationRaw;
      const colors = Object.fromEntries(
        Object.entries(theme.colors ?? {}).filter(([, color]) => Boolean(color)),
      );
      return { colors, tokenColors: theme.tokenColors };
    },
  },
};

// Removes the comments and the trailing commas of a JSON with comments, outside of strings
function stripJsonComments(text: string): string {
  let out = "";
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    if (inString) {
      out += char;
      if (char === "\\") out += text[++i];
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
      out += char;
    } else if (char === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i + 1] !== "\n") i++;
    } else if (char === "/" && text[i + 1] === "*") {
      i = text.indexOf("*/", i + 2) + 1;
    } else {
      out += char;
    }
  }
  return out.replace(/,(\s*[}\]])/g, "$1");
}

function joinAlpha(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value[2] === "__alpha" ? `${value[0]}${value[1]}` : value.map(joinAlpha);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, joinAlpha(item)]));
  }
  return value;
}

async function fetchGitHub(repo: string, commit: string, path: string): Promise<string> {
  const response = await fetch(`https://raw.githubusercontent.com/${repo}/${commit}/${path}`);
  if (!response.ok) throw new Error(`Failed to fetch ${repo}/${path}: ${response.status}`);
  return response.text();
}

// Writes the vendored theme into the source folder and returns it
async function vendorTheme(id: string, vendored: Vendored): Promise<ThemeRegistrationRaw> {
  const text = await fetchGitHub(vendored.repo, vendored.commit, vendored.file);
  const theme = {
    name: id,
    displayName: vendored.displayName,
    type: "light",
    ...vendored.convert(text),
  } as ThemeRegistrationRaw;
  await mkdir(VENDORED_DIR, { recursive: true });
  await writeFile(new URL(`${id}.json`, VENDORED_DIR), `${JSON.stringify(theme, null, 2)}\n`);
  return theme;
}

type TokenColor = { scope?: string | Array<string>; settings?: { foreground?: string } };

function toHex(color: string): string {
  const parsed = parse(color.trim());
  if (!parsed) throw new Error(`Cannot parse color: ${color}`);
  return parsed.alpha === undefined || parsed.alpha === 1 ? formatHex(parsed) : formatHex8(parsed);
}

/**
 * The foreground of a scope in a TextMate theme: the rule with the longest selector that matches the
 * scope or a parent of it wins, and a later rule wins a tie. Selectors with a parent scope are not used.
 */
function scopeColor(theme: ThemeRegistrationRaw, scopes: Array<string>): string | undefined {
  const rules = (theme.tokenColors ?? theme.settings ?? []) as Array<TokenColor>;
  for (const scope of scopes) {
    let best: { length: number; color: string } | undefined;
    for (const rule of rules) {
      const color = rule.settings?.foreground;
      if (!color || !rule.scope) continue;
      const selectors = (Array.isArray(rule.scope) ? rule.scope : rule.scope.split(","))
        .map((selector) => selector.trim())
        .filter((selector) => selector && !selector.includes(" "));
      for (const selector of selectors) {
        if (scope !== selector && !scope.startsWith(`${selector}.`)) continue;
        if (!best || selector.length >= best.length) best = { length: selector.length, color };
      }
    }
    if (best) return toHex(best.color);
  }
  return undefined;
}

function defaultForeground(theme: ThemeRegistrationRaw): string {
  const rules = (theme.tokenColors ?? theme.settings ?? []) as Array<TokenColor>;
  const global = rules.find((rule) => !rule.scope)?.settings?.foreground;
  const color = theme.colors?.["editor.foreground"] ?? global ?? theme.fg;
  return toHex(color ?? (theme.type === "light" ? "#000000" : "#ffffff"));
}

// The first color of the keys that the theme has
function firstColor(theme: ThemeRegistrationRaw, keys: Array<string>): string | undefined {
  const color = keys.map((key) => theme.colors?.[key]).find(Boolean);
  return color ? toHex(color) : undefined;
}

// The window: its background, the text of the title bar and the tabs, the line numbers and the lines
function windowColors(theme: ThemeRegistrationRaw) {
  const background = theme.colors?.["editor.background"] ?? theme.bg;
  const title = firstColor(theme, ["titleBar.activeForeground", "tab.activeForeground"]);
  const lineNumber = firstColor(theme, ["editorLineNumber.foreground"]);
  const divider = firstColor(theme, [
    "editorGroupHeader.tabsBorder",
    "tab.border",
    "editorGroup.border",
  ]);
  return {
    background: toHex(background ?? (theme.type === "light" ? "#ffffff" : "#1e1e1e")),
    ...(title && { title }),
    ...(lineNumber && { lineNumber }),
    ...(divider && { divider }),
  };
}

// A line highlight that is not transparent: the color of the current line, else of the selection
function highlightColor(theme: ThemeRegistrationRaw): string | undefined {
  for (const key of ["editor.lineHighlightBackground", "editor.selectionBackground"]) {
    const color = theme.colors?.[key];
    const parsed = color && parse(color);
    if (parsed && (parsed.alpha ?? 1) > 0) return toHex(color);
  }
  return undefined;
}

function syntax(theme: ThemeRegistrationRaw) {
  const foreground = defaultForeground(theme);
  const keyword = scopeColor(theme, ["keyword.control", "keyword", "storage.type"]);
  const string = scopeColor(theme, ["string.quoted.double", "string"]);
  const fn = scopeColor(theme, ["entity.name.function", "support.function"]);
  const comment = scopeColor(theme, ["comment.line", "comment"]);
  const highlight = highlightColor(theme);
  return {
    foreground,
    ...(keyword && { keyword }),
    ...(string && { string }),
    ...(fn && { function: fn }),
    ...(comment && { comment }),
    ...(highlight && { highlight }),
  };
}

async function loadTheme(id: string): Promise<ThemeRegistrationRaw> {
  const load = bundledThemes[id as keyof typeof bundledThemes];
  if (!load) throw new Error(`Shiki has no theme "${id}"`);
  return (await load()).default as ThemeRegistrationRaw;
}

async function fetchText(path: string): Promise<string> {
  const response = await fetch(`${TM_THEMES_BASE}/${path}`);
  if (!response.ok) throw new Error(`Failed to fetch ${path}: ${response.status}`);
  return response.text();
}

type ThemeInfo = { name: string; license: string; source: string };

async function main() {
  // Node cannot import a module from https, so the script imports it from a data URL
  const index = await fetchText("index.js");
  const { themes: infos } = (await import(
    `data:text/javascript;base64,${Buffer.from(index).toString("base64")}`
  )) as { themes: Array<ThemeInfo> };

  const themes = [];
  for (const family of FAMILIES) {
    const modes = { dark: family.dark, light: family.light };
    const loaded: Partial<Record<"dark" | "light", ThemeRegistrationRaw>> = {};
    for (const [mode, id] of Object.entries(modes)) {
      if (!id) continue;
      const vendored = VENDORED[id];
      if (vendored) {
        if (!LICENSES.has(vendored.license))
          throw new Error(`Theme ${id} has the license ${vendored.license}`);
        loaded[mode as "dark" | "light"] = await vendorTheme(id, vendored);
        continue;
      }
      const info = infos.find((info) => info.name === id);
      if (!info || !LICENSES.has(info.license))
        throw new Error(`Theme ${id} has the license ${info?.license}`);
      loaded[mode as "dark" | "light"] = await loadTheme(id);
    }
    const main = (loaded.dark ?? loaded.light)!;
    const accents = syntax(main);
    themes.push({
      id: family.id,
      name: family.name,
      background: family.background ?? {
        from: accents.keyword ?? accents.foreground,
        to: accents.function ?? accents.string ?? accents.foreground,
      },
      textmate: modes,
      window: Object.fromEntries(
        Object.entries(loaded).map(([mode, theme]) => [mode, windowColors(theme)]),
      ),
      syntax: Object.fromEntries(
        Object.entries(loaded).map(([mode, theme]) => [mode, syntax(theme)]),
      ),
    });
  }
  await writeFile(OUT_FILE, `${JSON.stringify(themes, null, 2)}\n`);

  // One import per theme, so that a bundle contains only the themes of this list
  const used = [
    ...new Set(FAMILIES.flatMap((family) => [family.dark, family.light]).filter(Boolean)),
  ] as Array<string>;
  const loaders = used.map((id) =>
    VENDORED[id]
      ? `  "${id}": () => import("./textmate/${id}.json", { with: { type: "json" } }) as Promise<{ default: ThemeRegistrationAny }>,`
      : `  "${id}": () => import("@shikijs/themes/${id}"),`,
  );
  await writeFile(
    LOADERS_FILE,
    [
      "// The TextMate themes of the editor themes. The script port-editor-themes.ts writes this file.",
      'import type { ThemeRegistrationAny } from "shiki";',
      "",
      "export const EDITOR_TEXTMATE_THEMES: Record<string, () => Promise<{ default: ThemeRegistrationAny }>> = {",
      ...loaders,
      "};",
      "",
    ].join("\n"),
  );

  // The license of each theme, from the notice file of tm-themes
  const notice = await fetchText("NOTICE");
  const blocks = notice
    .split(/^=+$/m)
    .slice(1)
    .filter((block) => {
      const file = block.match(/^Files:\s+(\S+)\.json/m)?.[1];
      return file !== undefined && used.includes(file);
    });
  const sources = used.map((id) => {
    const vendored = VENDORED[id];
    if (vendored) return `- \`${id}\`: https://github.com/${vendored.repo} (${vendored.license})`;
    const info = infos.find((info) => info.name === id)!;
    return `- \`${info.name}\`: ${info.source} (${info.license})`;
  });
  const vendoredBlocks = await Promise.all(
    Object.entries(VENDORED)
      .filter(([id]) => used.includes(id))
      .map(async ([id, vendored]) => {
        const license = await fetchGitHub(vendored.repo, vendored.commit, vendored.licenseFile);
        return `Files: ${id}.json\nSource: https://github.com/${vendored.repo}/blob/${vendored.commit}/${vendored.file}\n\n${license.trim()}`;
      }),
  );
  await writeFile(
    NOTICE_FILE,
    [
      "# Editor themes",
      "",
      `The editor themes of \`@tin.so/core\` come from these projects, through [tm-themes](https://github.com/shikijs/textmate-grammars-themes) ${TM_THEMES} and Shiki. The themes ${Object.keys(
        VENDORED,
      )
        .map((id) => `\`${id}\``)
        .join(
          " and ",
        )} come directly from the repository of their theme. The script \`scripts/port-editor-themes.ts\` writes this file. Their licenses follow.`,
      "",
      ...sources,
      "",
      "```",
      [...blocks.map((block) => block.trim()), ...vendoredBlocks].join(
        "\n\n----------------------------------------\n\n",
      ),
      "```",
      "",
    ].join("\n"),
  );

  console.log(`Ported ${themes.length} editor themes from tm-themes@${TM_THEMES}`);
}

await main();
