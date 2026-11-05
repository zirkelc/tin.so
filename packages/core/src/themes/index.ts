import editorThemes from "./editor-themes.json" with { type: "json" };

export type Mode = "light" | "dark";

/** Token colors of a theme. Keys that are missing use the foreground color. */
export type Syntax = {
  foreground: string;
  constant?: string;
  string?: string;
  comment?: string;
  keyword?: string;
  parameter?: string;
  function?: string;
  stringExpression?: string;
  punctuation?: string;
  link?: string;
  number?: string;
  property?: string;
  objectLiteral?: string;
  highlight?: string;
  highlightBorder?: string;
  highlightHover?: string;
  diffDeleted?: string;
  diffInserted?: string;
};

export type Theme = {
  id: string;
  name: string;
  background: { from: string; to: string };
  /** The colors of the window by mode, as in the editor of the theme. The background is opaque. */
  window?: Partial<Record<Mode, EditorWindow>>;
  /** The Shiki theme by mode that colors the code, in place of the token colors of the syntax */
  textmate: Partial<Record<Mode, string>>;
  syntax: { light?: Syntax; dark?: Syntax };
};

/** The colors of the window of an editor theme */
export type EditorWindow = {
  background: string;
  /** The text of the title bar and the tabs */
  title?: string;
  lineNumber?: string;
  divider?: string;
};

/** Colors of the window around the code, from the default frame of ray.so */
export type FrameColors = {
  /** The gradient behind the windows */
  backdrop: { from: string; to: string };
  background: string;
  control: string;
  title: string;
  shadowBorder: string;
  highlightBorder: string;
  divider: string;
  highlight: string;
  highlightBorderLine: string;
  lineNumber: string;
};

// The themes that a spec can use
export const THEMES = editorThemes as Array<Theme>;

export const THEME_IDS = THEMES.map((theme) => theme.id);

export const DEFAULT_THEME = "github";

// The window of an editor theme has a thin border, because its background is opaque
const EDITOR_FRAME: Record<Mode, Partial<FrameColors>> = {
  light: {
    highlightBorder: "rgba(0, 0, 0, 0.08)",
    shadowBorder: "rgba(0, 0, 0, 0.1)",
  },
  dark: {
    highlightBorder: "rgba(255, 255, 255, 0.1)",
  },
};

const FRAME_COLORS: Record<Mode, Omit<FrameColors, "backdrop">> = {
  light: {
    background: "rgba(255, 255, 255, 0.75)",
    control: "rgba(0, 0, 0, 0.2)",
    title: "rgba(0, 0, 0, 0.6)",
    shadowBorder: "rgba(0, 0, 0, 0.1)",
    highlightBorder: "rgba(255, 255, 255, 0.75)",
    divider: "rgba(0, 0, 0, 0.08)",
    highlight: "rgba(0, 0, 0, 0.1)",
    highlightBorderLine: "transparent",
    lineNumber: "rgba(0, 0, 0, 0.2)",
  },
  dark: {
    background: "rgba(0, 0, 0, 0.75)",
    control: "rgba(255, 255, 255, 0.2)",
    title: "rgba(255, 255, 255, 0.6)",
    shadowBorder: "rgba(0, 0, 0, 0.8)",
    highlightBorder: "rgba(255, 255, 255, 0.3)",
    divider: "rgba(255, 255, 255, 0.1)",
    highlight: "rgba(255, 255, 255, 0.1)",
    highlightBorderLine: "transparent",
    lineNumber: "rgba(255, 255, 255, 0.2)",
  },
};

export function getTheme(id: string): Theme {
  const theme = THEMES.find((theme) => theme.id === id);
  if (!theme) throw new Error(`Unknown theme "${id}". Available themes: ${THEME_IDS.join(", ")}`);
  return theme;
}

/** A theme with only one mode always uses that mode */
export function resolveMode(theme: Theme, mode: Mode): Mode {
  if (!theme.syntax.light) return "dark";
  if (!theme.syntax.dark) return "light";
  return mode;
}

export function getSyntax(theme: Theme, mode: Mode): Syntax {
  return (theme.syntax[resolveMode(theme, mode)] ?? theme.syntax.light ?? theme.syntax.dark)!;
}

export function getFrameColors(theme: Theme, mode: Mode): FrameColors {
  const resolved = resolveMode(theme, mode);
  const syntax = getSyntax(theme, resolved);
  const frame = {
    backdrop: theme.background,
    ...FRAME_COLORS[resolved],
    ...(theme.window?.[resolved] && { ...EDITOR_FRAME[resolved], ...theme.window[resolved] }),
  };
  return {
    ...frame,
    highlight: syntax.highlight ?? frame.highlight,
    highlightBorderLine: syntax.highlightBorder ?? frame.highlightBorderLine,
  };
}
