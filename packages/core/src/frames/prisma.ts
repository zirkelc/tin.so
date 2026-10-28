import type { Rect, WindowBox } from "../layout.ts";
import { titleBarText } from "./default.ts";
import {
  attrs,
  blend,
  inflate,
  line,
  linearGradient,
  radialGradient,
  roundedRect,
} from "./draw.ts";
import type { FrameContext, FrameOverrides } from "./types.ts";

/** A glow at a corner of the image: the corner as fractions of the size, its radii as fractions, and the color */
type Glow = { x: number; y: number; rx: number; ry: number; color: string };

const COLORS = {
  dark: {
    from: "#111111",
    to: "#0c0c0c",
    glows: [
      { x: 0, y: 1, rx: 0.6, ry: 0.55, color: "rgba(1, 215, 228, 0.24)" },
      { x: 1, y: 1, rx: 0.55, ry: 0.5, color: "rgba(243, 74, 96, 0.26)" },
      { x: 1, y: 0, rx: 0.45, ry: 0.4, color: "rgba(255, 118, 130, 0.12)" },
    ] as Array<Glow>,
    window: "rgba(26, 26, 26, 0.55)",
    border: "rgba(255, 255, 255, 0.12)",
    highlight: "rgba(255, 255, 255, 0.08)",
    header: "rgba(255, 255, 255, 0.04)",
    divider: "rgba(255, 255, 255, 0.08)",
    title: "#01d7e4",
    stripes: ["rgba(1, 215, 228, 0.2)", "rgba(212, 135, 0, 0.24)", "rgba(208, 35, 68, 0.24)"],
  },
  light: {
    from: "#ffffff",
    to: "#f9faf5",
    glows: [
      { x: 0, y: 1, rx: 0.6, ry: 0.55, color: "rgba(1, 215, 228, 0.2)" },
      { x: 1, y: 1, rx: 0.55, ry: 0.5, color: "rgba(255, 118, 130, 0.24)" },
      { x: 1, y: 0, rx: 0.45, ry: 0.4, color: "rgba(255, 118, 130, 0.14)" },
    ] as Array<Glow>,
    window: "rgba(251, 251, 249, 0.6)",
    border: "rgba(0, 0, 0, 0.06)",
    highlight: "rgba(255, 255, 255, 0.6)",
    header: "rgba(0, 0, 0, 0.025)",
    divider: "rgba(0, 0, 0, 0.06)",
    title: "#007f8d",
    stripes: ["rgba(1, 215, 228, 0.18)", "rgba(243, 195, 6, 0.2)", "rgba(255, 118, 130, 0.24)"],
  },
};

// Where the three diagonal stripes start and end, along the diagonal of the window
const STRIPES = [0.62, 0.73, 0.84, 0.95];

function transparent(color: string): string {
  return color.replace(/[\d.]+\)$/, "0)");
}

/** Three diagonal stripes of color in the lower right half of the window */
function stripes(context: FrameContext, window: WindowBox): string {
  const [cyan, yellow, red] = COLORS[context.mode].stripes as [string, string, string];
  const id = context.id(`stripes-${window.x}-${window.y}`);
  const [a, b, c, d] = STRIPES as [number, number, number, number];
  const gradient = linearGradient(id, 45, window, [
    [a, transparent(cyan)],
    [a, cyan],
    [b, cyan],
    [b, yellow],
    [c, yellow],
    [c, red],
    [d, red],
    [d, transparent(red)],
  ]);
  return `<defs>${gradient}</defs>${roundedRect(window, window.radius, { fill: `url(#${id})` })}`;
}

/** A strip at the top of the window, with round corners at the top when it touches the top edge */
function strip(rect: Rect, window: WindowBox, fill: string): string {
  if (rect.y > window.y + 1) return roundedRect(rect, 0, { fill });
  const r = Math.max(0, window.radius - 1);
  const bottom = rect.y + rect.height;
  const d = `M${rect.x} ${bottom}V${rect.y + r}a${r} ${r} 0 0 1 ${r} -${r}H${rect.x + rect.width - r}a${r} ${r} 0 0 1 ${r} ${r}V${bottom}Z`;
  return `<path ${attrs({ d, fill })}/>`;
}

/**
 * The frame of Prisma in ray.so: a dark background with glows of cyan and red at the corners, and
 * a translucent window with three diagonal stripes of cyan, yellow and red. The title bar shows
 * the file name in cyan at the left.
 */
export const frame: FrameOverrides = {
  radius: 12,
  inset: 1,
  titleBar: {
    paddingTop: 0,
    rowHeight: 39,
    paddingBottom: 1,
    tabsGap: 0,
    paddingX: 16,
    controls: false,
    align: "left",
    fontSize: 12,
    fontWeight: 500,
    letterSpacing: 0.4,
  },
  colors: {
    dark: {
      background: COLORS.dark.window,
      title: COLORS.dark.title,
      divider: COLORS.dark.divider,
      highlightBorder: "transparent",
      shadowBorder: "transparent",
    },
    light: {
      background: COLORS.light.window,
      title: COLORS.light.title,
      divider: COLORS.light.divider,
      highlightBorder: "transparent",
      shadowBorder: "transparent",
    },
  },
  base: ({ mode }) => blend(COLORS[mode].window, COLORS[mode].to),
  background: (context) => {
    const { scene, mode } = context;
    const { width, height } = scene;
    const style = COLORS[mode];
    const box = { x: 0, y: 0, width, height };
    const base = context.id("background");
    const defs = [
      linearGradient(base, 140, box, [
        [0, style.from],
        [1, style.to],
      ]),
    ];
    const rects = [`<rect width="${width}" height="${height}" fill="url(#${base})"/>`];
    style.glows.forEach((glow, index) => {
      const id = context.id(`glow-${index}`);
      defs.push(
        radialGradient(
          id,
          { x: glow.x * width, y: glow.y * height },
          { x: glow.rx * width, y: glow.ry * height },
          [
            [0, glow.color],
            [0.7, transparent(glow.color)],
          ],
        ),
      );
      rects.push(`<rect width="${width}" height="${height}" fill="url(#${id})"/>`);
    });
    return `<defs>${defs.join("")}</defs>${rects.join("")}`;
  },
  behind: () => "",
  body: (context, window) => {
    const { scene, mode } = context;
    const out = [
      roundedRect(window, window.radius, { fill: scene.frame.background }),
      stripes(context, window),
    ];
    // A tab has the color of the title bar
    for (const pane of window.panes)
      if (pane.tab) out.push(strip(pane.tab, window, COLORS[mode].header));
    return out.join("");
  },
  header: (context, window) => {
    const { scene, mode } = context;
    const header = window.header!;
    const y = header.y + header.height - 0.5;
    return (
      strip(header, window, COLORS[mode].header) +
      line(header.x, y, header.x + header.width, y, { stroke: scene.frame.divider }) +
      titleBarText(context, window, { title: scene.frame.title })
    );
  },
  border: (context, window) => {
    const style = COLORS[context.mode];
    const r = window.radius;
    // A light band of 1px inside the top edge, which follows the round corners
    const inner = inflate(window, -1);
    const mask = context.id(`highlight-${window.x}-${window.y}`);
    const highlight = `<defs><mask ${attrs({ id: mask, maskUnits: "userSpaceOnUse", ...inflate(window, 2) })}>${roundedRect(inflate(window, 2), 0, { fill: "white" })}${roundedRect({ ...inner, y: inner.y + 1 }, r - 1, { fill: "black" })}</mask></defs>${roundedRect(inner, r - 1, { fill: style.highlight, mask: `url(#${mask})` })}`;
    return (
      highlight +
      roundedRect(inflate(window, -0.5), r - 0.5, { fill: "none", stroke: style.border })
    );
  },
};
