import raysoThemes from "./rayso-themes.json" with { type: "json" };

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
  font?: string;
  partner?: boolean;
  hidden?: boolean;
  lineNumbers?: boolean;
  syntax: { light?: Syntax; dark?: Syntax };
};

/** Colors of the window around the code, from the ray.so default frame */
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

export const THEMES = raysoThemes as Array<Theme>;

export const THEME_IDS = THEMES.map((theme) => theme.id);

/**
 * The themes that lists and error messages name: the classic themes. The themes of companies stay
 * valid in a spec, but the lists do not show them for now.
 */
export const LISTED_THEME_IDS = THEMES.filter((theme) => !theme.hidden && !theme.partner).map(
  (theme) => theme.id,
);

export const DEFAULT_THEME = "candy";

/**
 * ray.so draws each partner theme with its own frame. What all of them share: an opaque window,
 * and a light backdrop in light mode, because the theme background is dark.
 */
const PARTNER_FRAME: Record<Mode, Partial<FrameColors>> = {
  light: {
    backdrop: { from: "#f5f5f5", to: "#e8e8e8" },
    background: "#ffffff",
    highlightBorder: "rgba(0, 0, 0, 0.08)",
    shadowBorder: "rgba(0, 0, 0, 0.04)",
  },
  dark: {
    background: "#0a0a0a",
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
    ...(theme.partner && PARTNER_FRAME[resolved]),
  };
  return {
    ...frame,
    highlight: syntax.highlight ?? frame.highlight,
    highlightBorderLine: syntax.highlightBorder ?? frame.highlightBorderLine,
  };
}
