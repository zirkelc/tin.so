import { gridFrame } from "./vercel-grid.ts";
import type { FrameOverrides } from "./types.ts";

/**
 * The frame of Vercel in ray.so: a solid background, and a window without a surface. Grid lines go
 * through the whole image along the edges of the window, with a bracket at two corners. The title
 * bar has gray controls and a gray title, and a grid line below it.
 */
export const frame: FrameOverrides = gridFrame({
  dark: {
    background: "#000000",
    gridline: "#1a1a1a",
    bracket: "#515356",
    control: "#2e2e2e",
    title: "#a1a1a1",
  },
  light: {
    background: "#ffffff",
    gridline: "#ebebeb",
    bracket: "#a8a8a8",
    control: "#e0e0e0",
    title: "#666666",
  },
});
