import type { Mode } from "../themes/index.ts";
import { attrs, round } from "./draw.ts";
import type { FrameOverrides } from "./types.ts";

export type GridColors = {
  background: string;
  gridline: string;
  /** The color of the brackets at two corners, or undefined for no brackets */
  bracket?: string;
  control: string;
  title: string;
};

// Half the length of a bracket arm
const BRACKET = 12.5;

/**
 * A frame with a solid background, and a window without a surface. Grid lines go through the
 * whole image along the edges of the window, below the title bar and below the tabs.
 */
export function gridFrame(colors: Record<Mode, GridColors>): FrameOverrides {
  const frameColors = (style: GridColors) => ({
    background: "transparent",
    highlightBorder: "transparent",
    shadowBorder: "transparent",
    control: style.control,
    title: style.title,
    divider: style.gridline,
  });
  return {
    radius: 0,
    colors: { dark: frameColors(colors.dark), light: frameColors(colors.light) },
    base: ({ mode }) => colors[mode].background,
    background: ({ scene, mode }) =>
      `<rect width="${scene.width}" height="${scene.height}" fill="${colors[mode].background}"/>`,
    behind: ({ scene, mode }, window) => {
      const style = colors[mode];
      const left = window.x + 0.5;
      const right = window.x + window.width - 0.5;
      const top = window.y + 0.5;
      const bottom = window.y + window.height - 0.5;
      const rows = new Set([top, bottom]);
      // The lines below the title bar and the tabs go through the whole image too
      if (window.header) rows.add(window.header.y + window.header.height - 0.5);
      for (const pane of window.panes) if (pane.tab) rows.add(pane.tab.y + pane.tab.height - 0.5);
      const out: Array<string> = [];
      for (const y of rows)
        out.push(
          `<line ${attrs({ x1: 0, y1: y, x2: scene.width, y2: y, stroke: style.gridline })}/>`,
        );
      for (const x of [left, right])
        out.push(
          `<line ${attrs({ x1: x, y1: 0, x2: x, y2: scene.height, stroke: style.gridline })}/>`,
        );
      if (style.bracket) {
        for (const [x, y] of [
          [left, top],
          [right, bottom],
        ] as const) {
          out.push(
            `<path ${attrs({ d: `M${round(x - BRACKET)} ${round(y)}H${round(x + BRACKET)}M${round(x)} ${round(y - BRACKET)}V${round(y + BRACKET)}`, stroke: style.bracket })}/>`,
          );
        }
      }
      return out.join("");
    },
    body: () => "",
    border: () => "",
  };
}
