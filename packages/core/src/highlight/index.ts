import {
  bundledLanguages,
  bundledLanguagesInfo,
  createHighlighterCore,
  type HighlighterCore,
} from "shiki";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import { EDITOR_TEXTMATE_THEMES } from "../themes/editor-textmate.ts";
import type { Mode, Syntax, Theme } from "../themes/index.ts";

export type Token = {
  content: string;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough?: boolean;
  /** A wavy line below the text, as an editor marks an error */
  wavy?: boolean;
  /** The color that a mark gave the text, which a wavy line takes */
  markColor?: string;
  /** A fill behind the text */
  background?: string;
};

export type HighlightedLine = Array<Token>;

export const PLAIN_TEXT = "text";
// Terminal output with its color codes. Shiki reads it with the terminal colors of the theme.
export const ANSI = "ansi";

export const LANGUAGE_IDS = [
  PLAIN_TEXT,
  ANSI,
  ...bundledLanguagesInfo.map((language) => language.id),
];

/** A language with its display name and its other names, such as "bash" for the shell */
export type LanguageInfo = { id: string; name: string; aliases: Array<string> };

export const LANGUAGES: Array<LanguageInfo> = [
  { id: PLAIN_TEXT, name: "Plain Text", aliases: [] },
  { id: ANSI, name: "Terminal Output", aliases: [] },
  ...bundledLanguagesInfo.map(({ id, name, aliases }) => ({ id, name, aliases: aliases ?? [] })),
];

/** The display name of a language, such as "TypeScript" for "typescript" */
export function languageName(language: string): string {
  if (language === PLAIN_TEXT) return "Plain Text";
  if (language === ANSI) return "Terminal Output";
  return bundledLanguagesInfo.find((info) => info.id === language)?.name ?? language;
}

// Extensions and file names that are not an id or an alias of a Shiki language
const EXTENSIONS: Record<string, string> = {
  mjs: "javascript",
  cjs: "javascript",
  h: "c",
  hpp: "cpp",
  cc: "cpp",
  htm: "html",
  txt: PLAIN_TEXT,
  makefile: "make",
  gemfile: "ruby",
  // Usual file extensions that are not an id or an alias of the language
  adb: "ada",
  as: "actionscript-3",
  bal: "ballerina",
  bib: "bibtex",
  clar: "clarity",
  cls: "apex",
  cob: "cobol",
  cr: "crystal",
  dm: "dream-maker",
  do: "stata",
  el: "emacs-lisp",
  ex: "elixir",
  feature: "gherkin",
  fnl: "fennel",
  gs: "genie",
  hx: "haxe",
  ll: "llvm",
  ml: "ocaml",
  mm: "objective-cpp",
  msg: "rosmsg",
  nsi: "nsis",
  pas: "pascal",
  pp: "puppet",
  pq: "powerquery",
  purs: "purescript",
  rkt: "racket",
  scm: "scheme",
  service: "systemd",
  sol: "solidity",
  st: "smalltalk",
  sv: "system-verilog",
  ttl: "turtle",
  vhd: "vhdl",
  wat: "wasm",
  wy: "wenyan",
  zs: "zenscript",
};

// Shiki font style flags
const ITALIC = 1;
const BOLD = 2;
const UNDERLINE = 4;

let highlighter: Promise<HighlighterCore> | undefined;

function getHighlighter(): Promise<HighlighterCore> {
  highlighter ??= createHighlighterCore({
    themes: [],
    langs: [],
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  });
  return highlighter;
}

const PLAIN_TEXT_IDS = new Set([PLAIN_TEXT, "plaintext", "plain"]);

/**
 * Whether the language is a language id, an alias or a file extension that this package knows.
 * The check ignores the case, as the resolution of the language does.
 */
export function isKnownLanguage(language: string): boolean {
  const id = language.toLowerCase();
  return (
    PLAIN_TEXT_IDS.has(id) ||
    id === ANSI ||
    Object.hasOwn(bundledLanguages, id) ||
    Object.hasOwn(EXTENSIONS, id)
  );
}

/** Resolves a language id or alias to a Shiki language id. Unknown languages are plain text. */
export function resolveLanguage(language: string): string {
  const id = language.toLowerCase();
  if (PLAIN_TEXT_IDS.has(id)) return PLAIN_TEXT;
  if (id === ANSI) return ANSI;
  // Only the own keys, because "constructor" and other object keys are not languages
  if (Object.hasOwn(bundledLanguages, id))
    return bundledLanguagesInfo.find((info) => info.id === id || info.aliases?.includes(id))!.id;
  return (Object.hasOwn(EXTENSIONS, id) && EXTENSIONS[id]) || PLAIN_TEXT;
}

// The start of an escape sequence that sets the color or the style of terminal output
// oxlint-disable-next-line no-control-regex
const ANSI_SHORT_RESET = /\u001b\[m/g;
// oxlint-disable-next-line no-control-regex
const ANSI_ESCAPE = /\u001b\[[\d;]*m/;

/**
 * Infers the language from a file name such as "main.ts" or "Dockerfile". Code with color codes
 * is terminal output, whatever the file name.
 */
export function inferLanguage(fileName: string | undefined, code = ""): string {
  if (ANSI_ESCAPE.test(code)) return ANSI;
  if (!fileName) return PLAIN_TEXT;
  const name = fileName.toLowerCase();
  const extension = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : name;
  return resolveLanguage(extension);
}

// The TextMate theme of the theme in the mode, which colors the code
async function loadThemeName(shiki: HighlighterCore, theme: Theme, mode: Mode): Promise<string> {
  const name = theme.textmate[mode]!;
  if (!shiki.getLoadedThemes().includes(name)) {
    await shiki.loadTheme(EDITOR_TEXTMATE_THEMES[name]!());
  }
  return name;
}

/** Splits code into lines of colored tokens with the colors of the theme */
export async function highlight(
  code: string,
  language: string,
  theme: Theme,
  mode: Mode,
  syntax: Syntax,
): Promise<Array<HighlightedLine>> {
  const shiki = await getHighlighter();
  const lang = language === "typescript" ? "tsx" : language;

  if (lang !== PLAIN_TEXT && lang !== ANSI && !shiki.getLoadedLanguages().includes(lang)) {
    await shiki.loadLanguage(bundledLanguages[lang as keyof typeof bundledLanguages]);
  }

  const themeName = await loadThemeName(shiki, theme, mode);
  // Git and other tools end a color with ESC[m, which Shiki does not read as a reset
  const input = lang === ANSI ? code.replace(ANSI_SHORT_RESET, "\u001b[0m") : code;
  const lines = shiki.codeToTokensBase(input, { lang, theme: themeName });

  return lines.map((tokens) =>
    tokens.map((token) => {
      const fontStyle = token.fontStyle ?? 0;
      return {
        content: token.content,
        color: token.color ?? syntax.foreground,
        bold: (fontStyle & BOLD) !== 0,
        italic: (fontStyle & ITALIC) !== 0,
        underline: (fontStyle & UNDERLINE) !== 0,
        // Only terminal output has a fill: the background color of its color codes
        ...(token.bgColor && { background: token.bgColor }),
      };
    }),
  );
}

// The red of errors when a theme has none, by mode, from GitHub
const ERROR_COLORS: Record<Mode, string> = { dark: "#f85149", light: "#cf222e" };

/** The color that the editor of the theme gives to errors, such as the wavy line below an error */
export async function errorColor(theme: Theme, mode: Mode): Promise<string> {
  const shiki = await getHighlighter();
  const colors = shiki.getTheme(await loadThemeName(shiki, theme, mode)).colors ?? {};
  return colors["editorError.foreground"] ?? colors["terminal.ansiRed"] ?? ERROR_COLORS[mode];
}
