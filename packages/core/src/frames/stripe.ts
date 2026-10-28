import type { WindowBox } from "../layout.ts";
import { boxShadow } from "./default.ts";
import { attrs, inflate, line, round, roundedRect } from "./draw.ts";
import type { FrameContext, FrameOverrides } from "./types.ts";

// The theme has only a dark mode
const COLORS = {
  background: "#0a2540",
  stripe: "#f7f9fc",
  window: "#0c2e4e",
  border: "#0f395e",
  lineNumber: "#55718d",
  gridline: "rgba(255, 255, 255, 0.1)",
  stripeGridline: "rgba(66, 71, 112, 0.15)",
  cyan: "rgb(17, 239, 227)",
  purple: "rgb(153, 102, 255)",
  blue: "#0048e5",
};

// The band rises to the left by this angle, and starts at this part of the image height
const SKEW = Math.tan((6 * Math.PI) / 180);
const STRIPE_TOP = 0.6;
// The colored bars at the right of the band: their width, the heights of the layers and their offset
const BARS = { width: 500, height: 50, purple: 32, blue: 18, offset: 50, bottom: 65 };
// Below this image height, the bars move to the top edge of the band
const SMALL_IMAGE = 240;

/** The light band: a parallelogram from the right side of the image that goes down to the left */
function stripePoints(context: FrameContext): string {
  const { width, height } = context.scene;
  const top = height * STRIPE_TOP;
  const rise = SKEW * width;
  return [
    [0, top + rise],
    [width, top],
    [width, height],
    [0, height + rise],
  ]
    .map(([x, y]) => `${round(x!)},${round(y!)}`)
    .join(" ");
}

/**
 * A rectangle on the band, from a place before the skew. The band skews around its top right
 * corner, so a point moves down by its distance from the right edge.
 */
function skewedRect(
  context: FrameContext,
  rect: { x: number; y: number; width: number; height: number },
  fill: string,
): string {
  const { width, height } = context.scene;
  const top = height * STRIPE_TOP;
  const point = (x: number, y: number) => `${round(x)},${round(top + y + SKEW * (width - x))}`;
  const { x, y } = rect;
  const right = x + rect.width;
  const bottom = y + rect.height;
  return `<polygon ${attrs({ points: [point(x, y), point(right, y), point(right, bottom), point(x, bottom)].join(" "), fill })}/>`;
}

/** The three colored bars on the band, at three quarters of the window */
function bars(context: FrameContext, window: WindowBox): string {
  const stripeHeight = context.scene.height * (1 - STRIPE_TOP);
  const x = window.x + window.width * 0.75 - BARS.offset;
  const y =
    context.scene.height < SMALL_IMAGE
      ? -(BARS.height - 1)
      : stripeHeight - BARS.bottom - BARS.height;
  const shifted = x + BARS.offset;
  return [
    skewedRect(context, { x, y, width: BARS.width, height: BARS.height }, COLORS.cyan),
    skewedRect(
      context,
      { x: shifted, y: y + BARS.height, width: BARS.width, height: BARS.purple },
      COLORS.purple,
    ),
    skewedRect(
      context,
      { x: shifted, y: y + BARS.purple, width: BARS.width, height: BARS.blue },
      COLORS.blue,
    ),
  ].join("");
}

/** Vertical lines at the edges and at each quarter of the window, through the whole image */
function gridlines(context: FrameContext, window: WindowBox, stroke: string): string {
  const { height } = context.scene;
  return [0, 0.25, 0.5, 0.75, 1]
    .map((at) => {
      const edge = at === 0 || at === 1;
      const x = edge
        ? window.x + (at === 0 ? 0.5 : window.width - 0.5)
        : Math.round(window.x + window.width * at) + 0.5;
      return line(x, 0, x, height, { stroke, "stroke-dasharray": edge ? undefined : "3 3" });
    })
    .join("");
}

/**
 * The frame of Stripe in ray.so: a dark blue background with a light band that goes down to the
 * left, and three colored bars on the band. Vertical lines mark the edges and the quarters of the
 * window, and the window has small round corners and a deep shadow.
 */
export const frame: FrameOverrides = {
  radius: 8,
  colors: {
    dark: {
      background: COLORS.window,
      divider: COLORS.border,
      highlightBorder: COLORS.border,
      shadowBorder: "transparent",
      lineNumber: COLORS.lineNumber,
    },
  },
  base: () => COLORS.background,
  background: (context) => {
    const { width, height } = context.scene;
    return `<rect width="${width}" height="${height}" fill="${COLORS.background}"/><polygon points="${stripePoints(context)}" fill="${COLORS.stripe}"/>`;
  },
  behind: (context, window) => {
    const clip = context.id(`stripe-${window.x}-${window.y}`);
    const out = [
      `<defs><clipPath id="${clip}"><polygon points="${stripePoints(context)}"/></clipPath></defs>`,
      gridlines(context, window, COLORS.gridline),
      // On the light band, the lines are darker
      `<g clip-path="url(#${clip})">${gridlines(context, window, COLORS.stripeGridline)}</g>`,
    ];
    // One set of bars for the image, at the first window, above its lines
    if (window === context.scene.windows[0]) out.push(bars(context, window));
    if (window.frame) {
      out.push(
        boxShadow(context, window, [
          { y: 50, blur: 100, spread: -20, color: "rgb(50, 50, 93)", opacity: 0.25 },
          { y: 30, blur: 60, spread: -30, color: "black", opacity: 0.3 },
        ]),
      );
    }
    return out.join("");
  },
  border: (_context, window) =>
    roundedRect(inflate(window, -0.5), window.radius - 0.5, {
      fill: "none",
      stroke: COLORS.border,
    }),
};
