import type { Theme } from "../themes/index.ts";
import { DEFAULT_FRAME } from "./default.ts";
import { GRID_FRAME } from "./grid.ts";
import type { Frame } from "./types.ts";

export { DEFAULT_FRAME } from "./default.ts";
export type { Frame, FrameContext, TitleBarStyle } from "./types.ts";

/** The frame that draws the image around the code in a theme */
export function getFrame(theme: Theme): Frame {
  return theme.frame === "grid" ? GRID_FRAME : DEFAULT_FRAME;
}
