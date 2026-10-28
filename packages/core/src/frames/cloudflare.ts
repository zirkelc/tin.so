import { line, roundedRect, text } from "./draw.ts";
import type { FrameOverrides } from "./types.ts";

const COLORS = {
  dark: {
    background: "#0c0c0c",
    window: "#0c0c0c",
    header: "#0f0f0f",
    gridline: "#262626",
    title: "#ededed",
    language: "#737373",
  },
  light: {
    background: "#f5f5f5",
    window: "#ffffff",
    header: "#fafafa",
    gridline: "#e5e5e5",
    title: "#0a0a0a",
    language: "#a1a1a1",
  },
};

/**
 * The frame of Cloudflare in ray.so: a solid background, and a square window without a border or
 * a shadow. Grid lines go through the whole image along the edges of the window. The header shows
 * the file name at the left and the language at the right, in the font of the code.
 */
export const frame: FrameOverrides = {
  radius: 0,
  titleBar: {
    paddingTop: 0,
    rowHeight: 40,
    paddingBottom: 0,
    tabsGap: 0,
    paddingX: 16,
    controls: false,
    align: "left",
    font: "code",
    fontSize: 14,
    fontWeight: 400,
    letterSpacing: 0.32,
    language: true,
    languageSize: 14,
  },
  colors: {
    dark: {
      background: COLORS.dark.window,
      title: COLORS.dark.title,
      divider: COLORS.dark.gridline,
      highlightBorder: "transparent",
      shadowBorder: "transparent",
    },
    light: {
      background: COLORS.light.window,
      title: COLORS.light.title,
      divider: COLORS.light.gridline,
      highlightBorder: "transparent",
      shadowBorder: "transparent",
    },
  },
  base: ({ mode }) => COLORS[mode].window,
  background: ({ scene, mode }) =>
    `<rect width="${scene.width}" height="${scene.height}" fill="${COLORS[mode].background}"/>`,
  behind: ({ scene, mode }, window) => {
    const stroke = COLORS[mode].gridline;
    const top = window.y + 0.5;
    const bottom = window.y + window.height - 0.5;
    const left = window.x + 0.5;
    const right = window.x + window.width - 0.5;
    return [
      line(0, top, scene.width, top, { stroke }),
      line(0, bottom, scene.width, bottom, { stroke }),
      line(left, 0, left, scene.height, { stroke }),
      line(right, 0, right, scene.height, { stroke }),
    ].join("");
  },
  header: ({ scene, mode }, window) => {
    const colors = COLORS[mode];
    const header = window.header!;
    const bar = window.titleBar!;
    const bottom = header.y + header.height - 0.5;
    const y = bar.title.y + bar.title.height / 2;
    const out = [
      roundedRect(header, 0, { fill: colors.header }),
      line(header.x, bottom, header.x + header.width, bottom, { stroke: colors.gridline }),
    ];
    if (window.title)
      out.push(
        text(window.title, bar.title.x, y, {
          font: scene.font,
          size: bar.fontSize,
          weight: bar.fontWeight,
          color: colors.title,
          letterSpacing: bar.letterSpacing,
        }),
      );
    if (bar.language)
      out.push(
        text(bar.language.text, bar.language.x, bar.language.y, {
          font: scene.font,
          size: bar.language.size,
          color: colors.language,
          anchor: "end",
        }),
      );
    return out.join("");
  },
  border: () => "",
};
