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
 * - ambient-code: soft glows of the colors that the code uses most
 * - ambient-theme: soft glows of the keyword, string and function colors of the theme
 * - ambient-halo, ambient-spotlight, ambient-stage: a glow of the main color of the theme, round from
 *   the top center, in the middle behind the windows, or as a beam from the top
 *
 * The backgrounds from the code come first, then the glows of the theme color, as in the editor.
 */
export const AMBIENT_BACKGROUNDS = [
  "ambient-theme",
  "ambient-code",
  "ambient-blur",
  "ambient-halo",
  "ambient-spotlight",
  "ambient-stage",
] as const;

/** The ambient backgrounds that are a glow of the main color of the theme */
export type HaloBackground = "ambient-halo" | "ambient-spotlight" | "ambient-stage";

export function isHaloBackground(background: string): background is HaloBackground {
  return (
    background === "ambient-halo" ||
    background === "ambient-spotlight" ||
    background === "ambient-stage"
  );
}

// The spec, the CLI and the editor accept the ambient backgrounds only when this is true
export const AMBIENT_ENABLED = true;

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

/** The color below the glows: the window color, darker in dark mode and a little darker in light mode */
export function ambientBase(windowColor: string, mode: Mode): string {
  return hex(mix(rgb(windowColor), BLACK, mode === "dark" ? 0.35 : 0.04));
}

// A halo color: softer toward the base, and pastel in light mode
function glow(color: string, mode: Mode): string {
  return hex(mode === "dark" ? mix(rgb(color), BLACK, 0.15) : mix(rgb(color), WHITE, 0.45));
}

/**
 * The glows of the soft backgrounds, in the order of their weight: large ellipses that overlap
 * inside the image, so that the colors blend like a blur. `toBase` moves the color toward the
 * base color, from 0 (the color) to 1 (the base).
 */
const SOFT_GLOWS = [
  { size: "70% 90%", at: "15% 20%", toBase: 0.35 },
  { size: "70% 90%", at: "85% 80%", toBase: 0.35 },
  { size: "60% 70%", at: "80% 15%", toBase: 0.45 },
];

function soft(colors: Array<string>, windowColor: string, mode: Mode): string {
  const base = ambientBase(windowColor, mode);
  const layers = SOFT_GLOWS.map((spot, index) => {
    const color = colors[index] ?? colors[0];
    if (!color) return undefined;
    return `radial-gradient(ellipse ${spot.size} at ${spot.at}, ${hex(mix(rgb(color), rgb(base), spot.toBase))} 0%, transparent 100%)`;
  }).filter((layer) => layer !== undefined);
  return [...layers, base].join(", ");
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

/** Soft glows of the main syntax colors of the theme */
export function themeAmbientCss(syntax: Syntax, windowColor: string, mode: Mode): string {
  return soft(themeColors(syntax), windowColor, mode);
}

/**
 * A glow of the main syntax color of the theme: a round glow from the top center, an ellipse in the
 * middle that lights the windows from behind, or a narrow beam from the top with a soft reflection
 * at the bottom, as a stage light
 */
export function haloAmbientCss(
  syntax: Syntax,
  windowColor: string,
  mode: Mode,
  halo: HaloBackground,
): string {
  const base = ambientBase(windowColor, mode);
  const [color] = themeColors(syntax);
  if (!color) return base;
  const light = glow(color, mode);
  // The color halfway out of the glow, so that the light fades slowly toward its edge
  const half = hex(mix(rgb(light), rgb(base), 0.55));
  if (halo === "ambient-spotlight")
    return `radial-gradient(ellipse 60% 62% at 50% 50%, ${light} 0%, ${half} 55%, transparent 100%), ${base}`;
  if (halo === "ambient-stage")
    return `radial-gradient(ellipse 48% 95% at 50% 0%, ${light} 0%, ${half} 50%, transparent 100%), radial-gradient(ellipse 60% 40% at 50% 100%, ${half} 0%, transparent 100%), ${base}`;
  return `radial-gradient(at 50% 0%, ${light} 0px, transparent 60%), ${base}`;
}

/**
 * Soft glows of the colors that cover the most characters of the code. Code with fewer than two
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
  return soft(colors, windowColor, mode);
}

/**
 * A preview of an ambient background of a theme in a mode, before the code is known: a halo for
 * a halo, and the soft theme glows for the others
 */
export function ambientPreviewCss(
  theme: Theme,
  mode: Mode,
  background: AmbientBackground = "ambient-theme",
): string {
  const resolved = resolveMode(theme, mode);
  const syntax = getSyntax(theme, resolved);
  const windowColor = getFrameColors(theme, resolved).background;
  if (isHaloBackground(background))
    return haloAmbientCss(syntax, windowColor, resolved, background);
  return themeAmbientCss(syntax, windowColor, resolved);
}
