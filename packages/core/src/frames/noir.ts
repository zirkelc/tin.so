import { attrs, blurFilter, inflate, roundedRect } from "./draw.ts";
import { DEFAULT_FRAME } from "./default.ts";
import type { FrameContext, FrameOverrides } from "./types.ts";

/**
 * The background art is drawn on a canvas of this size, which covers the image and is centered on
 * it. On a canvas of this size, the folds of the art have the size of the folds in ray.so at a
 * padding of 64.
 */
const ART = { width: 678, height: 676 };

// The folds go down to the right at this angle
const ANGLE = 40;
// The folds start from this point of the canvas
const ORIGIN = { x: 0, y: 151 };

/**
 * The folds from left to right, as stripes across the folds. Each stripe has a gray gradient from
 * its left edge to its right edge, and between two stripes the gray changes at once.
 */
const STRIPES: Array<{ from: number; to: number; stops: Array<[number, string]> }> = [
  {
    from: -420,
    to: -205,
    stops: [
      [0, "#cfcfcf"],
      [0.7, "#bdbdbd"],
      [1, "#9d9d9d"],
    ],
  },
  {
    from: -205,
    to: -35,
    stops: [
      [0, "#1e1e1e"],
      [0.5, "#141414"],
      [1, "#262626"],
    ],
  },
  {
    from: -35,
    to: 115,
    stops: [
      [0, "#6e6e6e"],
      [0.85, "#a8a8a8"],
      [0.95, "#8a8a8a"],
      [1, "#9c9c9c"],
    ],
  },
  {
    from: 115,
    to: 298,
    stops: [
      [0, "#c6c6c6"],
      [0.3, "#bcbcbc"],
      [0.65, "#8c8c8c"],
      [1, "#161616"],
    ],
  },
  {
    from: 298,
    to: 420,
    stops: [
      [0, "#cbcbcb"],
      [0.6, "#c4c4c4"],
      [0.8, "#8a8a8a"],
      [1, "#1c1c1c"],
    ],
  },
  {
    from: 420,
    to: 760,
    stops: [
      [0, "#1c1c1c"],
      [0.25, "#363636"],
      [1, "#7a7a7a"],
    ],
  },
];

/**
 * Soft spots that make a fold darker or lighter along its length. A spot is an ellipse at a place
 * across the folds and along them. It stays inside its stripe, so that the edges of the folds stay
 * sharp.
 */
const SPOTS: Array<{
  stripe: number;
  across: number;
  along: number;
  width: number;
  length: number;
  color: string;
  opacity: number;
}> = [
  // Light at the top of the gray fold at the left
  { stripe: 2, across: 60, along: 60, width: 110, length: 90, color: "#c4c4c4", opacity: 0.5 },
];

function art(context: FrameContext): string {
  const { scene } = context;
  const scale = Math.max(scene.width / ART.width, scene.height / ART.height);
  const x = (scene.width - ART.width * scale) / 2;
  const y = (scene.height - ART.height * scale) / 2;
  const defs: Array<string> = [];
  const stripes: Array<string> = [];
  STRIPES.forEach((stripe, index) => {
    const id = context.id(`fold-${index}`);
    defs.push(
      `<linearGradient ${attrs({ id, gradientUnits: "userSpaceOnUse", x1: stripe.from, y1: 0, x2: stripe.to, y2: 0 })}>${stripe.stops.map(([offset, color]) => `<stop ${attrs({ offset, "stop-color": color })}/>`).join("")}</linearGradient>`,
    );
    stripes.push(
      `<rect ${attrs({ x: stripe.from, y: -400, width: stripe.to - stripe.from, height: 1_400, fill: `url(#${id})` })}/>`,
    );
  });
  // A spot fades out from its center, with a radial gradient on the box of the ellipse
  const spots = SPOTS.map((spot, index) => {
    const id = context.id(`spot-${index}`);
    const clip = context.id(`spot-clip-${index}`);
    const stripe = STRIPES[spot.stripe]!;
    defs.push(
      `<radialGradient id="${id}"><stop offset="0" stop-color="${spot.color}" stop-opacity="${spot.opacity}"/><stop offset="0.5" stop-color="${spot.color}" stop-opacity="${spot.opacity * 0.7}"/><stop offset="1" stop-color="${spot.color}" stop-opacity="0"/></radialGradient>`,
      `<clipPath id="${clip}"><rect ${attrs({ x: stripe.from, y: -400, width: stripe.to - stripe.from, height: 1_400 })}/></clipPath>`,
    );
    return `<ellipse ${attrs({ cx: spot.across, cy: spot.along, rx: spot.width, ry: spot.length, fill: `url(#${id})`, "clip-path": `url(#${clip})` })}/>`;
  });
  // Fine grain over the whole surface, as the noise of a photo
  const grain = context.id("grain");
  defs.push(
    `<filter ${attrs({ id: grain, x: 0, y: 0, width: 1, height: 1 })}><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="2"/><feColorMatrix type="matrix" values="0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.5 2 0 0 0 -0.7"/></filter>`,
  );
  return `<defs>${defs.join("")}</defs><g transform="translate(${x.toFixed(3)} ${y.toFixed(3)}) scale(${scale.toFixed(5)})"><g transform="translate(${ORIGIN.x} ${ORIGIN.y}) rotate(${-ANGLE})">${stripes.join("")}${spots.join("")}</g></g><rect width="${scene.width}" height="${scene.height}" filter="url(#${grain})" opacity="0.25"/>`;
}

/**
 * The frame of Noir in ray.so: a black and white photo of soft folds as the background, and the
 * default window, which is dark and almost opaque, or light in light mode.
 */
export const frame: FrameOverrides = {
  colors: {
    dark: { background: "rgba(0, 0, 0, 0.9)" },
    light: { background: "rgba(255, 255, 255, 0.95)" },
  },
  base: () => "#8c8c8c",
  background: (context) => art(context),
  behind: (context, window) => {
    if (window.frame) return DEFAULT_FRAME.behind(context, window);
    // Code without a window gets a soft haze in the color of the window, to keep it readable
    const id = context.id(`haze-${window.x}-${window.y}`);
    return `<defs>${blurFilter(id, 12)}</defs>${roundedRect(inflate(window, 8), 24, { fill: context.scene.frame.background, filter: `url(#${id})` })}`;
  },
};
