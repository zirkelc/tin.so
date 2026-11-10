import { parseColor } from "./frames/draw.ts";
import type { HighlightedLine } from "./highlight/index.ts";
import {
  getFrameColors,
  getSyntax,
  type Mode,
  resolveMode,
  type Syntax,
  type Theme,
} from "./themes/index.ts";

/**
 * Backgrounds that the renderer makes from the colors of the image:
 * - ambient-blur: a blurred and larger copy of the code behind the window
 * - ambient-code: a mesh of the colors that the code uses most
 * - ambient-theme: a mesh of the keyword, string, function and constant colors of the theme
 */
export const AMBIENT_BACKGROUNDS = ["ambient-blur", "ambient-code", "ambient-theme"] as const;

// The spec, the CLI and the editor do not accept the ambient backgrounds until this is true
export const AMBIENT_ENABLED = false;

export type AmbientBackground = (typeof AMBIENT_BACKGROUNDS)[number];

export function isAmbientBackground(css: string): css is AmbientBackground {
  return (AMBIENT_BACKGROUNDS as ReadonlyArray<string>).includes(css);
}

type Rgb = [number, number, number];

const rgb = (color: string): Rgb => {
  const [r, g, b] = parseColor(color);
  return [r, g, b];
};

const hex = (color: Rgb) =>
  `#${color.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;

// Mixes two colors, with the part of the second from 0 to 1
const mix = (a: Rgb, b: Rgb, amount: number): Rgb =>
  a.map((channel, index) => channel + (b[index]! - channel) * amount) as Rgb;

// The saturation of the HSL model, from 0 (gray) to 1
function saturation([r, g, b]: Rgb): number {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  if (max === min) return 0;
  const lightness = (max + min) / 2;
  return (max - min) / (1 - Math.abs(2 * lightness - 1));
}

const BLACK: Rgb = [0, 0, 0];
const WHITE: Rgb = [255, 255, 255];

// Colors with less saturation, such as the foreground and the comments, do not give a glow
const MIN_SATURATION = 0.3;

// The corners of the glows, in the order of their weight
const POSITIONS = ["0% 0%", "100% 100%", "100% 0%", "0% 100%"];

/** The color below the glows: the window color, darker in dark mode and a little darker in light mode */
export function ambientBase(windowColor: string, mode: Mode): string {
  return hex(mix(rgb(windowColor), BLACK, mode === "dark" ? 0.35 : 0.04));
}

// A glow color: softer toward the base, and pastel in light mode
function glow(color: string, mode: Mode): string {
  return hex(mode === "dark" ? mix(rgb(color), BLACK, 0.15) : mix(rgb(color), WHITE, 0.45));
}

function mesh(colors: Array<string>, windowColor: string, mode: Mode): string {
  const layers = colors
    .slice(0, POSITIONS.length)
    .map(
      (color, index) =>
        `radial-gradient(at ${POSITIONS[index]}, ${glow(color, mode)} 0px, transparent ${55 - index * 5}%)`,
    );
  return [...layers, ambientBase(windowColor, mode)].join(", ");
}

// The distinct colors with enough saturation, in the order of the list
function vivid(colors: Array<string | undefined>): Array<string> {
  const seen = new Set<string>();
  return colors.filter((color): color is string => {
    if (!color || !color.startsWith("#")) return false;
    const key = color.slice(0, 7).toLowerCase();
    if (seen.has(key) || saturation(rgb(color)) < MIN_SATURATION) return false;
    seen.add(key);
    return true;
  });
}

function themeColors(syntax: Syntax): Array<string> {
  return vivid([
    syntax.keyword,
    syntax.string,
    syntax.function,
    syntax.constant ?? syntax.number,
    syntax.property,
    syntax.parameter,
  ]);
}

/** A mesh of the main syntax colors of the theme */
export function themeAmbientCss(syntax: Syntax, windowColor: string, mode: Mode): string {
  return mesh(themeColors(syntax), windowColor, mode);
}

/**
 * A mesh of the colors that cover the most characters of the code. Code with fewer than two
 * vivid colors takes the rest from the theme.
 */
export function codeAmbientCss(
  lines: Array<HighlightedLine>,
  syntax: Syntax,
  windowColor: string,
  mode: Mode,
): string {
  const weights = new Map<string, number>();
  for (const line of lines) {
    for (const token of line) {
      const characters = token.content.replace(/\s/g, "").length;
      if (characters === 0) continue;
      const key = token.color.slice(0, 7).toLowerCase();
      weights.set(key, (weights.get(key) ?? 0) + characters);
    }
  }
  const ranked = vivid([...weights].sort((a, b) => b[1] - a[1]).map(([color]) => color));
  const colors = ranked.length >= 2 ? ranked : vivid([...ranked, ...themeColors(syntax)]);
  return mesh(colors.slice(0, 3), windowColor, mode);
}

/** The theme mesh of a theme in a mode, as a preview of the ambient backgrounds before the code is known */
export function ambientPreviewCss(theme: Theme, mode: Mode): string {
  const resolved = resolveMode(theme, mode);
  return themeAmbientCss(
    getSyntax(theme, resolved),
    getFrameColors(theme, resolved).background,
    resolved,
  );
}
