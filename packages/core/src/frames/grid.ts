import type { Mode } from "../themes/index.ts";
import { DEFAULT_FRAME, boxShadow, type ShadowLayer } from "./default.ts";
import { attrs, inflate, round, roundedRect } from "./draw.ts";
import type { Frame } from "./types.ts";

type GridColors = {
  /** The grid lines along a window without a frame */
  gridline: string;
  /** The brackets at the top left and the bottom right corner of a window without a frame */
  bracket: string;
  /** The thin border of a window with a frame */
  border: string;
};

const COLORS: Record<Mode, GridColors> = {
  dark: { gridline: "#1a1a1a", bracket: "#515356", border: "#262626" },
  light: { gridline: "#ebebeb", bracket: "#a8a8a8", border: "#e5e5e5" },
};

// Half the length of a bracket arm
const BRACKET = 12.5;

const GRID_RADIUS = 12;

// A short and faint shadow, so that a window with a frame looks flat
const FLAT_SHADOW: Array<ShadowLayer> = [
  [2, 4, 0.04],
  [12, 24, 0.06],
].map(([y, blur, opacity]) => ({ y: y!, blur: blur!, color: "black", opacity: opacity! }));

/**
 * A flat frame, as in the code blocks of Vercel. A window with a frame has a thin border and a
 * faint shadow. A window without a frame has grid lines through the whole image along its edges,
 * with a bracket at two corners.
 */
export const GRID_FRAME: Frame = {
  ...DEFAULT_FRAME,
  radius: GRID_RADIUS,
  behind: (context, window) => {
    if (window.frame) return boxShadow(context, window, FLAT_SHADOW);
    const { scene, mode } = context;
    const colors = COLORS[mode];
    const left = window.x + 0.5;
    const right = window.x + window.width - 0.5;
    const top = window.y + 0.5;
    const bottom = window.y + window.height - 0.5;
    const out: Array<string> = [];
    for (const y of [top, bottom])
      out.push(
        `<line ${attrs({ x1: 0, y1: y, x2: scene.width, y2: y, stroke: colors.gridline })}/>`,
      );
    for (const x of [left, right])
      out.push(
        `<line ${attrs({ x1: x, y1: 0, x2: x, y2: scene.height, stroke: colors.gridline })}/>`,
      );
    for (const [x, y] of [
      [left, top],
      [right, bottom],
    ] as const) {
      out.push(
        `<path ${attrs({ d: `M${round(x - BRACKET)} ${round(y)}H${round(x + BRACKET)}M${round(x)} ${round(y - BRACKET)}V${round(y + BRACKET)}`, stroke: colors.bracket, fill: "none" })}/>`,
      );
    }
    return out.join("");
  },
  border: ({ mode }, window) =>
    roundedRect(inflate(window, -0.5), window.radius - 0.5, {
      fill: "none",
      stroke: COLORS[mode].border,
      "stroke-width": 1,
    }),
};
