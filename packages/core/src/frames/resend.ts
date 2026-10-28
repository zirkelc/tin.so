import type { Mode } from "../themes/index.ts";
import { titleBarText } from "./default.ts";
import { attrs, blurFilter, line, roundedRect, round } from "./draw.ts";
import type { FrameContext, FrameOverrides } from "./types.ts";

const STYLES = {
  dark: {
    window: "rgba(0, 0, 0, 0.88)",
    header: "rgba(0, 0, 0, 0.9)",
    border: "rgba(61, 61, 61, 0.13)",
    title: "#fafafa",
    language: "#898989",
    base: "#0c0c0c",
    // The color of the background from the top left to the bottom right
    sky: ["#050505", "#121212", "#161616", "#0b0b0b"],
    // The cloth at the top right: from its edge to the corner of the image
    cloth: ["#3c3c3c", "#6e6e6e", "#5c5c5c", "#7a7a7a", "#3a3a3a"],
    clothEdge: "#000000",
    // The band at the bottom left: from its lit edge to the corner of the image
    band: ["#a8a8a8", "#6c6c6c", "#383838", "#1c1c1c"],
  },
  light: {
    window: "rgba(255, 255, 255, 0.72)",
    header: "rgba(255, 255, 255, 0.1)",
    border: "rgba(61, 61, 61, 0.13)",
    title: "#000000",
    language: "#898989",
    base: "#e8e8e8",
    sky: ["#c4c4c4", "#e2e2e2", "#ececec", "#e6e6e6"],
    cloth: ["#e6e6e6", "#c2c2c2", "#d8d8d8", "#a8a8a8", "#3c3c3c"],
    clothEdge: "#7a7a7a",
    band: ["#fdfdfd", "#f8f8f8", "#f4f4f4", "#f2f2f2"],
  },
} satisfies Record<Mode, unknown>;

// The size of the background image of ray.so, which covers the image
const PATTERN = { width: 1_840, height: 1_850 };

/** A gradient between two points, with colors at equal distances */
function gradient(id: string, from: [number, number], to: [number, number], colors: Array<string>) {
  const stops = colors
    .map(
      (color, index) =>
        `<stop ${attrs({ offset: index / (colors.length - 1), "stop-color": color })}/>`,
    )
    .join("");
  return `<linearGradient ${attrs({ id, gradientUnits: "userSpaceOnUse", x1: from[0], y1: from[1], x2: to[0], y2: to[1] })}>${stops}</linearGradient>`;
}

/**
 * The background of Resend in ray.so is a photo of a dark (or light) room with a silk cloth that
 * falls in from the top right, and a lit band at the bottom left. The shapes here are in the
 * coordinates of that photo, which is scaled to cover the image.
 */
function pattern(context: FrameContext): string {
  const { scene, mode } = context;
  const style = STYLES[mode];
  const scale = Math.max(scene.width / PATTERN.width, scene.height / PATTERN.height);
  const dx = (scene.width - PATTERN.width * scale) / 2;
  const dy = (scene.height - PATTERN.height * scale) / 2;
  const ids = {
    sky: context.id("resend-sky"),
    cloth: context.id("resend-cloth"),
    band: context.id("resend-band"),
    soft: context.id("resend-soft"),
    streak: context.id("resend-streak"),
  };
  const cloth = "M800 0C900 120 940 300 1080 440C1260 620 1560 760 1840 1060V0Z";
  const defs = [
    gradient(ids.sky, [0, 0], [PATTERN.width, PATTERN.height], style.sky),
    // Across the cloth, from its edge to the top right corner
    gradient(ids.cloth, [1_150, 560], [PATTERN.width, 0], style.cloth),
    // Across the band, from its edge to the bottom left corner
    gradient(ids.band, [500, 1_430], [110, 1_895], style.band),
    blurFilter(ids.soft, 6),
    blurFilter(ids.streak, 30),
  ];
  const transform = `translate(${round(dx)} ${round(dy)}) scale(${round(scale * 10_000) / 10_000})`;
  return [
    `<defs>${defs.join("")}</defs>`,
    `<rect width="${scene.width}" height="${scene.height}" fill="${style.base}"/>`,
    `<g transform="${transform}">`,
    `<rect width="${PATTERN.width}" height="${PATTERN.height}" fill="url(#${ids.sky})"/>`,
    `<path d="${cloth}" fill="url(#${ids.cloth})" filter="url(#${ids.soft})"/>`,
    // Folds in the cloth, parallel to its edge
    `<g filter="url(#${ids.streak})" stroke="${mode === "dark" ? "#9a9a9a" : "#f2f2f2"}" stroke-opacity="0.5" fill="none" stroke-width="40">`,
    `<path d="M1150 40C1250 260 1400 520 1840 860"/>`,
    `<path d="M1420 0C1480 200 1600 420 1840 600"/>`,
    `</g>`,
    `<path d="${cloth.replace(/V0Z$/, "")}" fill="none" stroke="${style.clothEdge}" stroke-opacity="0.35" stroke-width="4" filter="url(#${ids.soft})"/>`,
    `<path d="M0 1010L1000 1850H0Z" fill="url(#${ids.band})"/>`,
    `</g>`,
  ].join("");
}

/**
 * The frame of Resend in ray.so: a photo of silk in the background, and a translucent window with
 * a thin border and no shadow. The header shows the file name at the left and the language at the
 * right.
 */
export const frame: FrameOverrides = {
  radius: 8,
  titleBar: {
    paddingTop: 0,
    rowHeight: 40,
    paddingBottom: 0,
    tabsGap: 0,
    paddingX: 16,
    controls: false,
    align: "left",
    font: "ui",
    fontSize: 14,
    fontWeight: 500,
    letterSpacing: 0.32,
    language: true,
    languageSize: 14,
  },
  colors: {
    dark: {
      background: STYLES.dark.window,
      title: STYLES.dark.title,
      divider: "rgba(61, 61, 61, 0.5)",
      highlightBorder: "transparent",
      shadowBorder: STYLES.dark.border,
    },
    light: {
      background: STYLES.light.window,
      title: STYLES.light.title,
      divider: "rgba(61, 61, 61, 0.13)",
      highlightBorder: "transparent",
      shadowBorder: STYLES.light.border,
    },
  },
  base: ({ mode }) => STYLES[mode].base,
  background: pattern,
  behind: () => "",
  header: (context, window) => {
    const style = STYLES[context.mode];
    const header = window.header!;
    const bottom = header.y + header.height - 0.5;
    return (
      roundedRect(header, 0, { fill: style.header }) +
      line(header.x, bottom, header.x + header.width, bottom, { stroke: style.border }) +
      titleBarText(context, window, { title: style.title, language: style.language })
    );
  },
  border: ({ mode }, window) =>
    roundedRect(window, window.radius, {
      fill: "none",
      stroke: STYLES[mode].border,
      "stroke-width": 0.5,
    }),
};
