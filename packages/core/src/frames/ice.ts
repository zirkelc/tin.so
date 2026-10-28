import { attrs } from "./draw.ts";
import { boxShadow } from "./default.ts";
import type { FrameOverrides } from "./types.ts";

const COLORS = {
  dark: { background: "#0e0e0e", dot: "rgba(255, 255, 255, 0.09)" },
  light: { background: "#f6f6f6", dot: "rgba(0, 0, 0, 0.12)" },
};

// Distance between the dots of the grid
const DOT_GAP = 17;

/**
 * The frame of Ice in ray.so: a plain background with a grid of small dots, and the default window
 * with only a small soft shadow. The window is opaque, so the dots do not show through it.
 */
export const frame: FrameOverrides = {
  colors: {
    dark: { background: "#010101" },
    light: { background: "#fcfcfc" },
  },
  base: ({ mode }) => COLORS[mode].background,
  background: (context) => {
    const { scene, mode } = context;
    const style = COLORS[mode];
    const id = context.id("dots");
    // A dot at each corner of the cells, from the top left corner of the image
    const pattern = `<pattern ${attrs({ id, patternUnits: "userSpaceOnUse", x: -DOT_GAP / 2, y: -DOT_GAP / 2, width: DOT_GAP, height: DOT_GAP })}><circle ${attrs({ cx: DOT_GAP / 2, cy: DOT_GAP / 2, r: 1, fill: style.dot })}/></pattern>`;
    return `<defs>${pattern}</defs><rect width="${scene.width}" height="${scene.height}" fill="${style.background}"/><rect width="${scene.width}" height="${scene.height}" fill="url(#${id})"/>`;
  },
  behind: (context, window) =>
    window.frame
      ? boxShadow(context, window, [{ y: 4, blur: 6, color: "black", opacity: 0.05 }])
      : "",
};
