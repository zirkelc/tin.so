import { gridFrame } from "./vercel-grid.ts";
import type { FrameOverrides } from "./types.ts";

/**
 * The frame of AWS in ray.so: a solid dark blue background (white in light mode), and a window
 * without a surface. Grid lines go through the whole image along the edges of the window, without
 * brackets.
 */
export const frame: FrameOverrides = gridFrame({
  dark: {
    background: "#151d26",
    gridline: "#233242",
    control: "#2b3d50",
    title: "#8d99a8",
  },
  light: {
    background: "#ffffff",
    gridline: "#d2d2d2",
    control: "#d9d9d9",
    title: "#687078",
  },
});
