import { attrs, line, radialGradient, roundedRect, text } from "./draw.ts";
import type { FrameContext, FrameOverrides } from "./types.ts";

const COLORS = {
  dark: {
    background: "#121317",
    window: "#121317",
    header: "#16181d",
    headerBorder: undefined,
    gridline: "#272a2e",
    pattern: 1,
    title: "#b5b8c0",
    language: "#5f6570",
  },
  light: {
    background: "#fafafa",
    window: "#f5f5f5",
    header: "#f8f8f8",
    headerBorder: "#e5e5e5",
    gridline: "#d9d7d7",
    pattern: 0.1,
    title: "#171717",
    language: "#707070",
  },
};

// The distance between the diagonal lines of the pattern
const HATCH = 8;

/**
 * Diagonal lines over the top and the bottom of the image. Each part covers 60% of the image and
 * fades out with the distance from the middle of its edge.
 */
function hatch(context: FrameContext): string {
  const { scene, mode } = context;
  const pattern = context.id("trigger-hatch");
  const height = scene.height * 0.6;
  const radius = Math.hypot(scene.width / 2, height);
  const stops: Array<[number, string]> = [
    [0.2, "white"],
    [0.8, "black"],
  ];
  const parts = [
    { y: 0, center: 0 },
    { y: scene.height - height, center: scene.height },
  ];
  const lines = `M${-1} ${-1}L${HATCH + 1} ${HATCH + 1}M${-1} ${HATCH - 1}L1 ${HATCH + 1}M${HATCH - 1} -1L${HATCH + 1} 1`;
  const defs = [
    `<pattern ${attrs({ id: pattern, patternUnits: "userSpaceOnUse", width: HATCH, height: HATCH })}><path d="${lines}" stroke="#272a2e" stroke-width="1" fill="none"/></pattern>`,
  ];
  const out: Array<string> = [];
  parts.forEach((part, index) => {
    const gradient = context.id(`trigger-fade-${index}`);
    const mask = context.id(`trigger-mask-${index}`);
    const box = { x: 0, y: part.y, width: scene.width, height };
    defs.push(
      radialGradient(
        gradient,
        { x: scene.width / 2, y: part.center },
        { x: radius, y: radius },
        stops,
      ),
      `<mask ${attrs({ id: mask, maskUnits: "userSpaceOnUse", ...box })}>${roundedRect(box, 0, { fill: `url(#${gradient})` })}</mask>`,
    );
    out.push(
      roundedRect(box, 0, {
        fill: `url(#${pattern})`,
        mask: `url(#${mask})`,
        opacity: COLORS[mode].pattern,
      }),
    );
  });
  return `<defs>${defs.join("")}</defs>${out.join("")}`;
}

/**
 * The frame of Trigger.dev in ray.so: a dark background with diagonal lines at the top and the
 * bottom, and a square window without a border. Grid lines go through the whole image along the
 * edges of the window. The header shows the file name at the left and the language at the right,
 * in the font of the code.
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
  background: (context) =>
    `<rect width="${context.scene.width}" height="${context.scene.height}" fill="${COLORS[context.mode].background}"/>` +
    hatch(context),
  behind: ({ scene, mode }, window) => {
    const stroke = COLORS[mode].gridline;
    const top = window.y + 0.5;
    const bottom = window.y + window.height - 0.5;
    const left = window.x + 0.5;
    const right = window.x + window.width - 0.5;
    // The window is opaque, so it hides the diagonal lines below it
    const surface = window.frame ? "" : roundedRect(window, 0, { fill: COLORS[mode].window });
    return [
      surface,
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
    const out = [roundedRect(header, 0, { fill: colors.header })];
    if (colors.headerBorder)
      out.push(
        line(header.x, bottom, header.x + header.width, bottom, { stroke: colors.headerBorder }),
      );
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
