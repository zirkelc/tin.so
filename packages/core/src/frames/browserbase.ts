import { inflate, line, roundedRect } from "./draw.ts";
import type { FrameOverrides } from "./types.ts";

const COLORS = {
  dark: {
    background: "#000000",
    window: "#0f0f0f",
    border: "rgba(197, 211, 232, 0.16)",
    gridline: "rgba(197, 211, 232, 0.12)",
  },
  light: {
    background: "#f8fafc",
    window: "#ffffff",
    border: "rgba(70, 99, 159, 0.24)",
    gridline: "rgba(70, 99, 159, 0.08)",
  },
};

// The places of the grid lines, as a fraction of the width and the height of the image
const VERTICAL = [0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875];
const HORIZONTAL = [0.25, 0.5, 0.75];

/**
 * The frame of Browserbase in ray.so: a solid background with a grid of thin lines through the
 * whole image, and a square window with a thin border. The title is in the font of the code.
 */
export const frame: FrameOverrides = {
  radius: 0,
  titleBar: {
    paddingTop: 10,
    rowHeight: 20,
    font: "code",
    fontSize: 14,
    fontWeight: 400,
    letterSpacing: 0,
  },
  colors: {
    dark: {
      background: COLORS.dark.window,
      divider: COLORS.dark.border,
      highlightBorder: COLORS.dark.border,
      shadowBorder: "transparent",
    },
    light: {
      background: COLORS.light.window,
      divider: COLORS.light.border,
      highlightBorder: COLORS.light.border,
      shadowBorder: "transparent",
    },
  },
  base: ({ mode }) => COLORS[mode].background,
  background: ({ scene, mode }) => {
    const { width, height } = scene;
    const stroke = COLORS[mode].gridline;
    const out = [`<rect width="${width}" height="${height}" fill="${COLORS[mode].background}"/>`];
    for (const at of VERTICAL) {
      const x = Math.round(width * at) + 0.5;
      out.push(line(x, 0, x, height, { stroke }));
    }
    for (const at of HORIZONTAL) {
      const y = Math.round(height * at) + 0.5;
      out.push(line(0, y, width, y, { stroke }));
    }
    return out.join("");
  },
  behind: () => "",
  border: ({ mode }, window) =>
    roundedRect(inflate(window, -0.5), 0, { fill: "none", stroke: COLORS[mode].border }),
};
