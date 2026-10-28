import { measureUiText } from "../fonts/index.ts";
import { boxShadow, titleBarText, type ShadowLayer } from "./default.ts";
import { type Rect, type WindowBox, TAB_HEADER } from "../layout.ts";
import { attrs, line, radialGradient, round, roundedRect } from "./draw.ts";
import type { FrameContext, FrameOverrides } from "./types.ts";

const COLORS = {
  dark: {
    background: "#121212",
    window: "#070a08",
    header: "#010201",
    divider: "#141818",
    accent: "#55d799",
    pattern: "#55d799",
    glow: "rgba(13, 147, 115, 0.1)",
  },
  light: {
    background: "#f6fbf9",
    window: "#ffffff",
    header: "#fcfcfc",
    divider: "#dfdfdf",
    accent: "#0d9373",
    pattern: "#035844",
    glow: "rgba(13, 147, 115, 0.1)",
  },
};

// Offset y, blur radius and opacity of black, by mode
const SHADOWS: Record<"dark" | "light", Array<[number, number, number]>> = {
  dark: [
    [110, 44, 0.01],
    [62, 37, 0.05],
    [28, 28, 0.09],
    [7, 15, 0.1],
  ],
  light: [
    [110, 44, 0.01],
    [62, 37, 0.03],
    [28, 28, 0.05],
    [7, 15, 0.06],
  ],
};

// The pattern at the top right: its size and the space between it and the right edge of the image
const PATTERN = { width: 600, height: 486, right: -25 };
// The skewed grid of the pattern, in the units of the pattern
const GRID = { width: 60.708, height: 62.85, x: 142, y: 39.44, angle: -15 };
// The scale from the units of the pattern to the image, and the left offset of the pattern
const SCALE = 0.6771;
const OFFSET_X = 32.7;
// Cells of the grid that have a fill, as column and row
const CELLS: Array<[number, number]> = [
  [5, 6],
  [3, 4],
  [1, 6],
  [3, 8],
  [7, 4],
  [4, 2],
  [9, 7],
  [7, 9],
  [0, 3],
];

const TITLE = { size: 12, letterSpacing: 0.4, padding: 16 };

/**
 * A grid of thin lines that slopes up to the right, with a few filled cells, which fades out from
 * the center of an ellipse. It is at the top right of the image.
 */
function pattern(context: FrameContext): string {
  const { scene, mode } = context;
  const color = COLORS[mode].pattern;
  const left = scene.width - PATTERN.right - PATTERN.width + OFFSET_X;
  const transform = `translate(${round(left)} 0) scale(${SCALE})`;
  const grid = context.id("pattern-grid");
  const fade = context.id("pattern-fade");
  const mask = context.id("pattern-mask");
  const { width: w, height: h } = GRID;
  const lineOpacity = mode === "dark" ? 0.1 : 0.15;
  const slope = Math.tan((-GRID.angle * Math.PI) / 180);
  // A cell is inside the lines of the grid, which are 1px wide
  const cells = CELLS.map(([column, row]) => {
    const x = GRID.x + column * w + 1;
    const y = GRID.y + row * h + 1 - x * slope;
    const d = `M${round(x)} ${round(y)}l${round(w - 1)} ${round(-(w - 1) * slope)}v${round(h - 1)}l${round(-(w - 1))} ${round((w - 1) * slope)}Z`;
    return `<path ${attrs({ d, fill: color, "fill-opacity": 0.05 })}/>`;
  });
  return `<defs><pattern ${attrs({
    id: grid,
    patternUnits: "userSpaceOnUse",
    x: GRID.x,
    y: GRID.y,
    width: w,
    height: h,
    patternTransform: `skewY(${GRID.angle})`,
  })}><path ${attrs({ d: `M0 0H${w}M0 0V${h}`, stroke: color, "stroke-opacity": lineOpacity, "stroke-width": 2, fill: "none" })}/></pattern>${radialGradient(
    fade,
    { x: 468.373, y: 287.536 },
    { x: 467.627, y: 430.464 },
    [
      [0, "#ffffff"],
      [1, "#000000"],
    ],
  )}<mask ${attrs({ id: mask, maskUnits: "userSpaceOnUse", x: -200, y: -200, width: 1_400, height: 1_200 })}><rect ${attrs({ x: -200, y: -200, width: 1_400, height: 1_200, fill: `url(#${fade})` })}/></mask></defs><g transform="${transform}"><g mask="url(#${mask})"><rect ${attrs({ x: -100, y: -100, width: 1_100, height: 900, fill: `url(#${grid})` })}/>${cells.join("")}</g></g>`;
}

function shadows(mode: "dark" | "light"): Array<ShadowLayer> {
  return SHADOWS[mode].map(([y, blur, opacity]) => ({ y, blur, color: "black", opacity }));
}

/** A strip at the top of the window, with round corners at the top when it touches the top edge */
function strip(rect: Rect, window: WindowBox, fill: string): string {
  if (rect.y > window.y + 1) return roundedRect(rect, 0, { fill });
  const r = window.radius;
  const bottom = rect.y + rect.height;
  const d = `M${round(rect.x)} ${round(bottom)}V${round(rect.y + r)}a${r} ${r} 0 0 1 ${r} -${r}H${round(rect.x + rect.width - r)}a${r} ${r} 0 0 1 ${r} ${r}V${round(bottom)}Z`;
  return `<path ${attrs({ d, fill })}/>`;
}

/** The width of the file name tab: the title and the space at its two sides */
function tabWidth(title: string): number {
  return measureUiText(title, TITLE.size) + title.length * TITLE.letterSpacing + TITLE.padding * 2;
}

/**
 * The frame of Mintlify in ray.so: a solid background with a green glow and a skewed grid at the
 * top right, and a window with a soft shadow. The title bar shows the file name in green, with a
 * green line below it, as a selected tab.
 */
export const frame: FrameOverrides = {
  radius: 12,
  titleBar: {
    paddingTop: 0,
    rowHeight: 40,
    paddingBottom: 0,
    tabsGap: 0,
    paddingX: TITLE.padding,
    controls: false,
    align: "left",
    fontSize: TITLE.size,
    fontWeight: 500,
    letterSpacing: TITLE.letterSpacing,
  },
  colors: {
    dark: {
      background: COLORS.dark.window,
      title: COLORS.dark.accent,
      divider: COLORS.dark.divider,
      highlightBorder: "transparent",
      shadowBorder: "transparent",
    },
    light: {
      background: COLORS.light.window,
      title: COLORS.light.accent,
      divider: COLORS.light.divider,
      highlightBorder: "transparent",
      shadowBorder: "transparent",
    },
  },
  base: ({ mode }) => COLORS[mode].window,
  background: (context) => {
    const { scene, mode } = context;
    const glow = context.id("glow");
    // The glow fills a box of 700 by 600 at the top right, with its center above the box
    const left = scene.width - PATTERN.right - 700;
    return `<defs>${radialGradient(
      glow,
      { x: left + 700 * 0.5899, y: 600 * -0.072 },
      { x: 700 * 0.4963, y: 600 * 0.5702 },
      [
        [0.394, COLORS[mode].glow],
        [1, "rgba(0, 0, 0, 0)"],
      ],
    )}</defs><rect width="${scene.width}" height="${scene.height}" fill="${COLORS[mode].background}"/><rect ${attrs({ x: left, y: 0, width: 700, height: 600, fill: `url(#${glow})` })}/>${pattern(context)}`;
  },
  behind: (context, window) =>
    window.frame ? boxShadow(context, window, shadows(context.mode)) : "",
  body: ({ scene, mode }, window) => {
    const out = [roundedRect(window, window.radius, { fill: scene.frame.background })];
    // A tab has the color of the title bar, as the file name in ray.so
    for (const pane of window.panes)
      if (pane.tab) out.push(strip(pane.tab, window, COLORS[mode].header));
    return out.join("");
  },
  header: (context, window) => {
    const { scene, mode } = context;
    const header = window.header!;
    const y = header.y + header.height - 0.5;
    const out = [
      strip(header, window, COLORS[mode].header),
      line(header.x, y, header.x + header.width, y, { stroke: scene.frame.divider }),
    ];
    if (window.title)
      out.push(
        line(header.x, y, header.x + tabWidth(window.title), y, { stroke: scene.frame.title }),
      );
    out.push(titleBarText(context, window, { title: scene.frame.title }));
    return out.join("");
  },
  // The line in the color of the title below the title of each tab
  border: ({ scene }, window) =>
    window.panes
      .map((pane) => {
        if (!pane.tab || !pane.title) return "";
        const y = pane.tab.y + pane.tab.height - 0.5;
        const width =
          TAB_HEADER.paddingX * 2 +
          (pane.icon ? TAB_HEADER.icon + TAB_HEADER.iconGap : 0) +
          measureUiText(pane.title, TAB_HEADER.titleSize);
        return line(pane.tab.x, y, pane.tab.x + width, y, { stroke: scene.frame.title });
      })
      .join(""),
};
