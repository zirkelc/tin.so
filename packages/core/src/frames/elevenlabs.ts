import type { WindowBox } from "../layout.ts";
import { attrs, inflate, line, round, roundedRect } from "./draw.ts";
import type { FrameOverrides } from "./types.ts";

const COLORS = {
  dark: { background: "#111111", border: "#353535", dot: "#ffffff" },
  light: { background: "#ffffff", border: "#e5e7eb", dot: "#000000" },
};

const RADIUS = 24;
// Length of the diagonal lines at the corners of the window
const DIAGONAL = 200;
// Size of the square dots at the corners of the window
const DOT = 3;

/** A line from each corner of the window, at 45 degrees away from the window */
function diagonals(window: WindowBox, stroke: string): string {
  const reach = DIAGONAL / Math.SQRT2;
  const left = window.x + 0.5;
  const right = window.x + window.width - 0.5;
  const top = window.y;
  const bottom = window.y + window.height;
  return [
    [left, top, -1, -1],
    [right, top, 1, -1],
    [right, bottom, 1, 1],
    [left, bottom, -1, 1],
  ]
    .map(([x, y, dx, dy]) => line(x!, y!, x! + dx! * reach, y! + dy! * reach, { stroke }))
    .join("");
}

/** The thin rounded outline of the window */
function outline(window: WindowBox, stroke: string): string {
  return roundedRect(inflate(window, -0.5), RADIUS - 0.5, { fill: "none", stroke });
}

/**
 * The frame of ElevenLabs in ray.so: a solid background, and grid lines through the edges and the
 * center of the window. A circle around the window touches its corners, lines go out from the
 * corners at 45 degrees, and a small dot marks each corner.
 */
export const frame: FrameOverrides = {
  radius: RADIUS,
  colors: {
    dark: {
      background: COLORS.dark.background,
      divider: COLORS.dark.border,
      highlightBorder: COLORS.dark.border,
      shadowBorder: "transparent",
    },
    light: {
      background: COLORS.light.background,
      control: "rgba(0, 0, 0, 0.12)",
      divider: COLORS.light.border,
      highlightBorder: COLORS.light.border,
      shadowBorder: "transparent",
    },
  },
  base: ({ mode }) => COLORS[mode].background,
  background: ({ scene, mode }) =>
    `<rect width="${scene.width}" height="${scene.height}" fill="${COLORS[mode].background}"/>`,
  behind: ({ scene, mode }, window) => {
    const style = COLORS[mode];
    const stroke = style.border;
    const cx = window.x + window.width / 2;
    const cy = window.y + window.height / 2;
    const out: Array<string> = [];
    for (const y of [window.y + 0.5, cy, window.y + window.height - 0.5])
      out.push(line(0, y, scene.width, y, { stroke }));
    for (const x of [window.x + 0.5, cx, window.x + window.width - 0.5])
      out.push(line(x, 0, x, scene.height, { stroke }));
    out.push(
      `<circle ${attrs({ cx, cy, r: Math.hypot(window.width, window.height) / 2 - 0.5, fill: "none", stroke })}/>`,
    );
    out.push(diagonals(window, stroke));
    // The window covers the lines, also when it has no frame, so that the code stays clear
    out.push(roundedRect(window, RADIUS, { fill: style.background }));
    // Code without a frame keeps the outline of the window, as in the original look
    if (!window.frame) out.push(outline(window, stroke));
    for (const x of [window.x, window.x + window.width])
      for (const y of [window.y, window.y + window.height])
        out.push(
          `<rect ${attrs({ x: round(x - DOT / 2), y: round(y - DOT / 2), width: DOT, height: DOT, fill: style.dot })}/>`,
        );
    return out.join("");
  },
  body: ({ mode }, window) => roundedRect(window, RADIUS, { fill: COLORS[mode].background }),
  border: ({ mode }, window) => outline(window, COLORS[mode].border),
};
