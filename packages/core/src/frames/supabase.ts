import { attrs, inflate, roundedRect, text } from "./draw.ts";
import type { FrameOverrides } from "./types.ts";

const COLORS = {
  dark: {
    background: "#121212",
    window: "#171717",
    header: "#1f1f1f",
    border: "#292929",
    title: "#fafafa",
    language: "#898989",
  },
  light: {
    background: "#fcfcfc",
    window: "#f8f8f8",
    header: "#fcfcfc",
    border: "#dfdfdf",
    title: "#171717",
    language: "#707070",
  },
};

const HEADER_HEIGHT = 40;
const FONT_SIZE = 14;

/**
 * The frame of Supabase in ray.so: a flat dark background, and a flat window with a thin border
 * and a small radius. The title bar is the header of a file: the file name at the left with a
 * line below it, and the language at the right, in the font of the code.
 */
export const frame: FrameOverrides = {
  radius: 6,
  titleBar: {
    paddingTop: 0,
    rowHeight: HEADER_HEIGHT,
    paddingBottom: 0,
    tabsGap: 0,
    paddingX: 16,
    controls: false,
    align: "left",
    font: "code",
    fontSize: FONT_SIZE,
    fontWeight: 400,
    letterSpacing: 0,
    language: true,
    languageSize: FONT_SIZE,
  },
  colors: {
    dark: {
      background: COLORS.dark.window,
      title: COLORS.dark.language,
      divider: COLORS.dark.border,
      highlightBorder: "transparent",
      shadowBorder: "transparent",
    },
    light: {
      background: COLORS.light.window,
      title: COLORS.light.language,
      divider: COLORS.light.border,
      highlightBorder: "transparent",
      shadowBorder: "transparent",
    },
  },
  base: ({ mode }) => COLORS[mode].background,
  background: ({ scene, mode }) =>
    `<rect width="${scene.width}" height="${scene.height}" fill="${COLORS[mode].background}"/>`,
  behind: () => "",
  body: ({ mode }, window) => {
    const style = COLORS[mode];
    const out = [roundedRect(window, window.radius, { fill: style.window })];
    // The title bar and the tabs have the lighter color of the header
    const top = window.header ?? window.panes.find((pane) => pane.tab)?.tab;
    if (top) {
      const bottom = Math.max(
        window.header ? window.header.y + window.header.height : 0,
        ...window.panes.map((pane) => (pane.tab ? pane.tab.y + pane.tab.height : 0)),
      );
      const clip = `M${window.x} ${bottom}V${window.y + window.radius}a${window.radius} ${window.radius} 0 0 1 ${window.radius} ${-window.radius}H${window.x + window.width - window.radius}a${window.radius} ${window.radius} 0 0 1 ${window.radius} ${window.radius}V${bottom}Z`;
      out.push(`<path ${attrs({ d: clip, fill: style.header })}/>`);
    }
    return out.join("");
  },
  header: ({ scene, mode }, window) => {
    const bar = window.titleBar;
    const header = window.header;
    if (!bar || !header) return "";
    const style = COLORS[mode];
    const out: Array<string> = [];
    const y = header.y + header.height / 2;
    const bottom = header.y + header.height - 0.5;
    out.push(
      `<line ${attrs({ x1: header.x, y1: bottom, x2: header.x + header.width, y2: bottom, stroke: style.border })}/>`,
    );
    if (window.title) {
      out.push(
        text(window.title, bar.title.x, y, {
          font: scene.font,
          size: FONT_SIZE,
          color: style.title,
          anchor: "start",
        }),
      );
      // A line below the file name, as below the active file
      const width = Math.min(
        bar.title.width,
        window.title.length * scene.text.cellWidth * (FONT_SIZE / scene.text.fontSize),
      );
      out.push(
        `<rect ${attrs({ x: bar.title.x, y: header.y + header.height - 1, width, height: 1, fill: style.title })}/>`,
      );
    }
    if (bar.language) {
      out.push(
        text(bar.language.text, bar.language.x, y, {
          font: scene.font,
          size: FONT_SIZE,
          color: style.language,
          anchor: "end",
        }),
      );
    }
    return out.join("");
  },
  border: ({ mode }, window) =>
    roundedRect(inflate(window, 0.5), window.radius + 0.5, {
      fill: "none",
      stroke: COLORS[mode].border,
    }),
};
