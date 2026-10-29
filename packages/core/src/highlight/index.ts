import {
  bundledLanguages,
  bundledLanguagesInfo,
  createHighlighterCore,
  type HighlighterCore,
  type ThemeRegistration,
} from "shiki";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import tailwindDark from "../themes/tailwind-dark.json" with { type: "json" };
import tailwindLight from "../themes/tailwind-light.json" with { type: "json" };
import type { Mode, Syntax, Theme } from "../themes/index.ts";
import { resolveTokenColor, TOKEN_THEME } from "./token-theme.ts";

export type Token = {
  content: string;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough?: boolean;
  /** A fill behind the text */
  background?: string;
};

export type HighlightedLine = Array<Token>;

export const PLAIN_TEXT = "text";

export const LANGUAGE_IDS = [PLAIN_TEXT, ...bundledLanguagesInfo.map((language) => language.id)];

/** The display name of a language, such as "TypeScript" for "typescript" */
export function languageName(language: string): string {
  if (language === PLAIN_TEXT) return "Plain Text";
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

const TAILWIND_THEMES: Record<Mode, ThemeRegistration> = {
  light: { ...(tailwindLight as ThemeRegistration), name: "tailwind-light" },
  dark: { ...(tailwindDark as ThemeRegistration), name: "tailwind-dark" },
};

// Shiki font style flags
const ITALIC = 1;
const BOLD = 2;
const UNDERLINE = 4;

let highlighter: Promise<HighlighterCore> | undefined;

function getHighlighter(): Promise<HighlighterCore> {
  highlighter ??= createHighlighterCore({
    themes: [TOKEN_THEME, TAILWIND_THEMES.light, TAILWIND_THEMES.dark],
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
    PLAIN_TEXT_IDS.has(id) || Object.hasOwn(bundledLanguages, id) || Object.hasOwn(EXTENSIONS, id)
  );
}

/** Resolves a language id or alias to a Shiki language id. Unknown languages are plain text. */
export function resolveLanguage(language: string): string {
  const id = language.toLowerCase();
  if (PLAIN_TEXT_IDS.has(id)) return PLAIN_TEXT;
  // Only the own keys, because "constructor" and other object keys are not languages
  if (Object.hasOwn(bundledLanguages, id))
    return bundledLanguagesInfo.find((info) => info.id === id || info.aliases?.includes(id))!.id;
  return (Object.hasOwn(EXTENSIONS, id) && EXTENSIONS[id]) || PLAIN_TEXT;
}

/** Infers the language from a file name such as "main.ts" or "Dockerfile" */
export function inferLanguage(fileName: string | undefined): string {
  if (!fileName) return PLAIN_TEXT;
  const name = fileName.toLowerCase();
  const extension = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : name;
  return resolveLanguage(extension);
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

  if (lang !== PLAIN_TEXT && !shiki.getLoadedLanguages().includes(lang)) {
    await shiki.loadLanguage(bundledLanguages[lang as keyof typeof bundledLanguages]);
  }

  // The Tailwind theme of ray.so colors tokens with its own TextMate theme
  const themeName = theme.id === "tailwind" ? TAILWIND_THEMES[mode].name! : TOKEN_THEME.name!;
  const lines = shiki.codeToTokensBase(code, { lang, theme: themeName });

  return lines.map((tokens) =>
    tokens.map((token) => {
      const fontStyle = token.fontStyle ?? 0;
      return {
        content: token.content,
        color: resolveTokenColor(token.color, syntax),
        bold: (fontStyle & BOLD) !== 0,
        italic: (fontStyle & ITALIC) !== 0,
        underline: (fontStyle & UNDERLINE) !== 0,
      };
    }),
  );
}
