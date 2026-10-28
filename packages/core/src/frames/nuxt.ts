import type { WindowBox } from "../layout.ts";
import { attrs, inflate, linearGradient, roundedRect } from "./draw.ts";
import type { FrameContext, FrameOverrides } from "./types.ts";

const GREEN = "#00dc82";

const COLORS = {
  dark: { from: "#0b0c11", to: "#0b0c11", window: "#0b0c11", stars: 0.15 },
  light: { from: "#f8faf9", to: "#f0f9f4", window: "transparent", stars: 0.03 },
};

/**
 * The rings around the window: the space between the window and the ring, the extra corner
 * radius, the opacity, and where
 * the green fades out from the top left corner and fades in to the bottom right corner.
 */
const RINGS: Array<{
  offset: number;
  radius: number;
  opacity: number;
  stops: [number, number, number, number];
}> = [
  { offset: 0, radius: 0, opacity: 1, stops: [0.08, 0.2, 0.8, 0.92] },
  { offset: 7, radius: 8, opacity: 0.5, stops: [0.1, 0.26, 0.74, 0.9] },
  { offset: 13, radius: 15, opacity: 0.25, stops: [0.12, 0.28, 0.72, 0.88] },
];

// The size of the tile of stars, and the number of stars in it
const STARS = { size: 200, count: 70 };

/** A pseudo random number from 0 to 1, which is the same for each seed */
function random(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43_758.5453;
  return value - Math.floor(value);
}

/** Small white dots at random places, as a tile that repeats over the image */
function stars(context: FrameContext): string {
  const { scene, mode } = context;
  const id = context.id("stars");
  const dots: Array<string> = [];
  for (let i = 0; i < STARS.count; i++) {
    const r = 0.3 + random(i * 4 + 2) * 0.5;
    dots.push(
      `<circle ${attrs({
        cx: random(i * 4) * STARS.size,
        cy: random(i * 4 + 1) * STARS.size,
        r,
        fill: "#ffffff",
        "fill-opacity": 0.4 + random(i * 4 + 3) * 0.6,
      })}/>`,
    );
  }
  return `<defs><pattern ${attrs({ id, patternUnits: "userSpaceOnUse", width: STARS.size, height: STARS.size })}>${dots.join("")}</pattern></defs><rect ${attrs({ width: scene.width, height: scene.height, fill: `url(#${id})`, opacity: COLORS[mode].stars })}/>`;
}

/** Green light outside the top left and the bottom right corner of the window */
function glows(context: FrameContext, window: WindowBox): string {
  const key = `${window.x}-${window.y}`;
  const gradient = context.id(`glow-${key}`);
  const blur = context.id(`glow-blur-${key}`);
  const centers = [
    { x: window.x - 75, y: window.y - 110 },
    { x: window.x + window.width + 75, y: window.y + window.height + 110 },
  ];
  // An ellipse that fills a box of 250 by 180 and fades out at 70% of its radius
  const rx = 125 * Math.SQRT2 * 0.7;
  const ry = 90 * Math.SQRT2 * 0.7;
  const defs = `<defs><radialGradient ${attrs({ id: gradient })}><stop offset="0" stop-color="${GREEN}" stop-opacity="0.6"/><stop offset="1" stop-color="${GREEN}" stop-opacity="0"/></radialGradient><filter ${attrs({ id: blur, x: "-150%", y: "-150%", width: "400%", height: "400%" })}><feGaussianBlur stdDeviation="60"/></filter></defs>`;
  return (
    defs +
    centers
      .map(
        ({ x, y }) =>
          `<ellipse ${attrs({ cx: x, cy: y, rx, ry, fill: `url(#${gradient})`, filter: `url(#${blur})` })}/>`,
      )
      .join("")
  );
}

/** Thin green rings around the window, which show only near the top left and bottom right corner */
function rings(context: FrameContext, window: WindowBox, from: number): string {
  const out: Array<string> = [];
  RINGS.slice(from).forEach((ring, index) => {
    const box = inflate(window, ring.offset);
    const id = context.id(`ring-${index + from}-${window.x}-${window.y}`);
    const [a, b, c, d] = ring.stops;
    out.push(
      `<defs>${linearGradient(id, 135, box, [
        [0, GREEN],
        [a, GREEN],
        [b, "rgba(0, 220, 130, 0)"],
        [c, "rgba(0, 220, 130, 0)"],
        [d, GREEN],
        [1, GREEN],
      ])}</defs>`,
      roundedRect(inflate(box, -0.5), window.radius + ring.radius - 0.5, {
        fill: "none",
        stroke: `url(#${id})`,
        "stroke-opacity": ring.opacity,
      }),
    );
  });
  return out.join("");
}

/**
 * The frame of Nuxt in ray.so: a dark background with faint stars, and a dark window with three
 * thin green rings that show at the top left and the bottom right corner. Green light glows
 * outside these two corners in dark mode.
 */
export const frame: FrameOverrides = {
  radius: 10,
  inset: 1,
  colors: {
    dark: {
      background: COLORS.dark.window,
      control: "rgba(255, 255, 255, 0.2)",
      title: "rgba(255, 255, 255, 0.6)",
      divider: "rgba(255, 255, 255, 0.1)",
      highlightBorder: "transparent",
      shadowBorder: "transparent",
      lineNumber: "#8b949e",
    },
    light: {
      background: COLORS.light.window,
      control: "rgba(0, 0, 0, 0.2)",
      title: "rgba(0, 0, 0, 0.6)",
      divider: "rgba(0, 0, 0, 0.08)",
      highlightBorder: "transparent",
      shadowBorder: "transparent",
      lineNumber: "#78909c",
    },
  },
  base: ({ mode }) => COLORS[mode].from,
  background: (context) => {
    const { scene, mode } = context;
    const style = COLORS[mode];
    const id = context.id("background");
    const box = { x: 0, y: 0, width: scene.width, height: scene.height };
    return `<defs>${linearGradient(id, 140, box, [
      [0, style.from],
      [1, style.to],
    ])}</defs><rect width="${scene.width}" height="${scene.height}" fill="url(#${id})"/>${stars(context)}`;
  },
  // Without a window, only the outer rings show around the code
  behind: (context, window) =>
    (context.mode === "dark" ? glows(context, window) : "") +
    (window.frame ? "" : rings(context, window, 1)),
  border: (context, window) => rings(context, window, 0),
};
