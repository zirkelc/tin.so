import { attrs, blurFilter, inflate, roundedRect, round } from "./draw.ts";
import { DEFAULT_FRAME } from "./default.ts";
import type { FrameContext, FrameOverrides } from "./types.ts";

// The background art is drawn on a canvas of this size and scaled to the width of the image
const ART = { width: 1_840, height: 1_641 };

// Distance between the squares, and their size, on the canvas of the art
const CELL = 28.5;
const SQUARE = 14;

// Distance from the edge of an area, in and out, where its squares fade out
const FADE = 80;

/**
 * The two red areas of squares: a band at the left that goes down to a point, and a triangle at the
 * top right. The squares fade out and break up near the edges of each area.
 */
const AREAS: Array<{ color: string; points: Array<[number, number]> }> = [
  {
    color: "#c90028",
    points: [
      [-200, -200],
      [420, -200],
      [420, 520],
      [320, 620],
      [260, 680],
      [250, 940],
      [330, 1_150],
      [420, 1_300],
      [520, 1_520],
      [460, 1_500],
      [300, 1_280],
      [-200, 1_000],
    ],
  },
  {
    color: "#f12828",
    points: [
      [740, -200],
      [2_040, -200],
      [2_040, 700],
      [1_560, 680],
      [1_250, 420],
      [900, 110],
    ],
  },
];

// A number from 0 to 1 for a cell, which is always the same for the same cell and salt
function hash(row: number, column: number, salt: number): number {
  let h = Math.imul(row * 374_761 + column * 668_265 + salt * 2_147_483, 1_274_126_177);
  h = Math.imul(h ^ (h >>> 13), 1_103_515_245);
  return ((h ^ (h >>> 16)) >>> 0) / 4_294_967_296;
}

// Distance from a point to the edge of a polygon: positive inside of it, negative outside
function signedDistance(x: number, y: number, points: Array<[number, number]>): number {
  let inside = false;
  let nearest = Infinity;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [x1, y1] = points[i]!;
    const [x2, y2] = points[j]!;
    if (y1 > y !== y2 > y && x < ((x2 - x1) * (y - y1)) / (y2 - y1) + x1) inside = !inside;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
    nearest = Math.min(nearest, Math.hypot(x - x1 - t * dx, y - y1 - t * dy));
  }
  return inside ? nearest : -nearest;
}

// Parts of a square that show near the edge of an area: halves, a quarter and an L shape
const FRAGMENTS = [
  (x: number, y: number) => `M${x} ${y}h7v14h-7z`,
  (x: number, y: number) => `M${x} ${y}h14v7h-14z`,
  (x: number, y: number) => `M${x + 7} ${y + 7}h7v7h-7z`,
  (x: number, y: number) => `M${x} ${y}h14v7h-7v7h-7z`,
];

/**
 * Draws the squares of the visible part of the art. Every second row has a square in each cell,
 * and the rows between them have a square in every second cell. Near the edge of an area, the
 * squares get dim, break into fragments, or are gone, at random but always in the same way.
 * Squares with the same color and opacity go into one path, so that the image has few elements.
 */
function art({ scene }: FrameContext): string {
  const scale = scene.width / ART.width;
  const visible = Math.min(ART.height, scene.height / scale);
  const paths = new Map<string, Array<string>>();
  for (let row = 0; row * CELL < visible; row++) {
    for (let column = 0; column * CELL < ART.width; column += row % 2 === 0 ? 1 : 2) {
      const x = round(14 + column * CELL);
      const y = round(12 + row * CELL);
      for (const [index, area] of AREAS.entries()) {
        const depth = signedDistance(x + SQUARE / 2, y + SQUARE / 2, area.points);
        if (depth < -FADE) continue;
        const base = Math.max(0, Math.min(1, 0.5 + depth / (FADE * 2)));
        const value = base * 1.4 - 0.2 + (hash(row, column, index) - 0.5) * 0.8;
        if (value < 0.3) continue;
        const opacity = value >= 0.9 ? 1 : Math.round(value * 5) / 5;
        const fragment = value < 0.75 && hash(row, column, index + 7) < 0.5;
        const d = fragment
          ? FRAGMENTS[Math.floor(hash(row, column, index + 13) * FRAGMENTS.length)]!(x, y)
          : `M${x} ${y}h${SQUARE}v${SQUARE}h-${SQUARE}z`;
        const key = `${area.color} ${opacity}`;
        const parts = paths.get(key);
        if (parts) parts.push(d);
        else paths.set(key, [d]);
      }
    }
  }
  const out = [...paths].map(([key, parts]) => {
    const [color, opacity] = key.split(" ");
    return `<path ${attrs({ d: parts.join(""), fill: color, "fill-opacity": opacity === "1" ? undefined : opacity })}/>`;
  });
  return `<g transform="scale(${scale.toFixed(5)})">${out.join("")}</g>`;
}

/**
 * The frame of Bitmap in ray.so: a black background with red squares in a pixel pattern at the top,
 * and the default window, which is dark and almost opaque, or light in light mode.
 */
export const frame: FrameOverrides = {
  colors: {
    dark: { background: "rgba(0, 0, 0, 0.88)" },
    light: { background: "rgba(255, 255, 255, 0.95)" },
  },
  base: () => "#000000",
  background: (context) => {
    const { scene } = context;
    return `<rect width="${scene.width}" height="${scene.height}" fill="#000000"/>${art(context)}`;
  },
  behind: (context, window) => {
    if (window.frame) return DEFAULT_FRAME.behind(context, window);
    // Code without a window gets a soft haze in the color of the window, to keep it readable
    const id = context.id(`haze-${window.x}-${window.y}`);
    return `<defs>${blurFilter(id, 12)}</defs>${roundedRect(inflate(window, 8), 24, { fill: context.scene.frame.background, filter: `url(#${id})` })}`;
  },
};
