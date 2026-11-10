import { UI_FONT } from "../fonts/index.ts";
import type { WindowBox } from "../layout.ts";
import type { Mode } from "../themes/index.ts";
import { MAC_HEADER, WINDOW_RADIUS } from "../sizes.ts";
import { attrs, blurredRect, inflate, linearGradient, roundedRect, text } from "./draw.ts";
import type { Frame, FrameContext } from "./types.ts";

export type ShadowLayer = {
  y: number;
  blur: number;
  color: string;
  opacity: number;
  spread?: number;
};

/**
 * A soft shadow below the window, in 5 layers. Each layer is about twice as far down and as blurred
 * as the one before it, and a little darker, so the shadow is dense near the window and long below it.
 */
export const WINDOW_SHADOW: Array<ShadowLayer> = [
  [3, 3, 0.045],
  [8, 8, 0.055],
  [18, 16, 0.07],
  [40, 34, 0.085],
  [90, 76, 0.125],
].map(([y, blur, opacity]) => ({ y: y!, blur: blur!, color: "black", opacity: opacity! }));

/**
 * Draws CSS box shadows of a window. A CSS box shadow is not painted below its box, which matters
 * for a translucent window, so a mask cuts the window out. The blur is drawn with gradients,
 * because blur filters on a large window make the image slow to render.
 */
export function boxShadow(
  context: FrameContext,
  window: WindowBox,
  layers: Array<ShadowLayer>,
): string {
  const { width, height } = context.scene;
  const key = `${window.x}-${window.y}`;
  const mask = context.id(`shadow-mask-${key}`);
  const out = [
    `<defs><mask ${attrs({ id: mask, maskUnits: "userSpaceOnUse", x: 0, y: 0, width, height })}><rect width="${width}" height="${height}" fill="white"/>${roundedRect(window, window.radius, { fill: "black" })}</mask></defs>`,
    `<g mask="url(#${mask})">`,
  ];
  for (const layer of layers) {
    const spread = layer.spread ?? 0;
    const box = inflate({ ...window, y: window.y + layer.y }, spread);
    const id = context.id(`shadow-${key}`);
    out.push(
      blurredRect(id, box, window.radius + spread, layer.blur / 2, layer.color, layer.opacity),
    );
  }
  out.push("</g>");
  return out.join("");
}

// The close, minimize and zoom buttons of macOS, each with a darker ring
const CONTROL_COLORS = ["#ff5f57", "#febc2e", "#28c840"];
const CONTROL_RINGS = ["#e2463f", "#e1a116", "#12ac28"];
const CONTROL_RING_WIDTH = 0.5;

/** The three window controls, in the gray of the frame or in the colors of macOS */
export function windowControls(window: WindowBox, gray: string): string {
  const controls = window.titleBar?.controls;
  if (!controls) return "";
  const radius = MAC_HEADER.control / 2;
  const cy = controls.y + controls.height / 2;
  return [0, 1, 2]
    .map((i) => {
      const cx = controls.x + radius + i * (MAC_HEADER.control + MAC_HEADER.controlGap);
      if (window.controls !== "color")
        return `<circle ${attrs({ cx, cy, r: radius, fill: gray })}/>`;
      return `<circle ${attrs({
        cx,
        cy,
        r: radius - CONTROL_RING_WIDTH / 2,
        fill: CONTROL_COLORS[i]!,
        stroke: CONTROL_RINGS[i]!,
        "stroke-width": CONTROL_RING_WIDTH,
      })}/>`;
    })
    .join("");
}

/** The title and the language of a title bar, at the places that the layout gives them */
export function titleBarText(
  context: FrameContext,
  window: WindowBox,
  colors: { title: string; language?: string },
): string {
  const bar = window.titleBar;
  if (!bar) return "";
  const { scene } = context;
  const out: Array<string> = [];
  if (window.title) {
    const font = bar.font === "code" ? scene.font : UI_FONT;
    const x = bar.align === "center" ? bar.title.x + bar.title.width / 2 : bar.title.x;
    out.push(
      text(window.title, x, bar.title.y + bar.title.height / 2, {
        font,
        size: bar.fontSize,
        weight: bar.fontWeight,
        color: colors.title,
        anchor: bar.align === "center" ? "middle" : "start",
        letterSpacing: bar.letterSpacing || undefined,
      }),
    );
  }
  if (bar.language) {
    out.push(
      text(bar.language.text, bar.language.x, bar.language.y, {
        font: UI_FONT,
        size: bar.language.size,
        color: colors.language ?? colors.title,
        anchor: "end",
      }),
    );
  }
  return out.join("");
}

// The edges of a macOS window: a light inner edge in dark mode, and a thin dark outer edge
const EDGES: Record<Mode, { inner: string; outer: string }> = {
  light: { inner: "transparent", outer: "rgba(0, 0, 0, 0.23)" },
  dark: { inner: "rgba(255, 255, 255, 0.16)", outer: "rgba(0, 0, 0, 0.85)" },
};

/** The default frame: a gradient, and a window like the one of macOS, in the colors of the theme */
export const DEFAULT_FRAME: Frame = {
  radius: WINDOW_RADIUS,
  inset: 0,
  titleBar: {
    paddingTop: MAC_HEADER.paddingTop,
    rowHeight: MAC_HEADER.height,
    paddingBottom: 0,
    tabsGap: MAC_HEADER.paddingBottom,
    paddingX: MAC_HEADER.paddingX,
    controls: true,
    titleGap: 12,
    align: "center",
    font: "ui",
    fontSize: MAC_HEADER.titleSize,
    fontWeight: 500,
    letterSpacing: 0,
    language: false,
    languageSize: 12,
  },
  base: ({ scene }) => scene.frame.backdrop.from,
  background: (context) => {
    const { scene } = context;
    const box = { x: 0, y: 0, width: scene.width, height: scene.height };
    const id = context.id("background");
    return `<defs>${linearGradient(id, 140, box, [
      [0, scene.frame.backdrop.from],
      [1, scene.frame.backdrop.to],
    ])}</defs><rect width="${scene.width}" height="${scene.height}" fill="url(#${id})"/>`;
  },
  behind: (context, window) => (window.frame ? boxShadow(context, window, WINDOW_SHADOW) : ""),
  body: ({ scene }, window) => roundedRect(window, window.radius, { fill: scene.frame.background }),
  header: (context, window) =>
    windowControls(window, context.scene.frame.control) +
    titleBarText(context, window, { title: context.scene.frame.title }),
  border: ({ mode }, window) =>
    roundedRect(inflate(window, -0.5), window.radius - 0.5, {
      fill: "none",
      stroke: EDGES[mode].inner,
      "stroke-width": 1,
    }) +
    roundedRect(inflate(window, 0.25), window.radius + 0.25, {
      fill: "none",
      stroke: EDGES[mode].outer,
      "stroke-width": 0.5,
    }),
};
