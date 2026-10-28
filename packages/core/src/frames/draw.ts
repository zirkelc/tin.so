import { cssFontFamily, type Font, getFace } from "../fonts/index.ts";
import type { Rect } from "../layout.ts";

// The characters that XML 1.0 does not allow, such as the escape of terminal colors
// oxlint-disable-next-line no-control-regex
const INVALID_XML = /[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g;

export function escapeXml(text: string): string {
  return text.replace(INVALID_XML, "").replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

export function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export type Attributes = Record<string, string | number | undefined>;

export function attrs(values: Attributes): string {
  return Object.entries(values)
    .filter(([, value]) => value !== undefined)
    .map(
      ([key, value]) => `${key}="${typeof value === "number" ? round(value) : escapeXml(value!)}"`,
    )
    .join(" ");
}

export function roundedRect(rect: Rect, radius: number, extra: Attributes = {}): string {
  return `<rect ${attrs({ x: rect.x, y: rect.y, width: rect.width, height: rect.height, rx: radius, ...extra })}/>`;
}

export function line(x1: number, y1: number, x2: number, y2: number, extra: Attributes): string {
  return `<line ${attrs({ x1, y1, x2, y2, ...extra })}/>`;
}

export function inflate(rect: Rect, by: number): Rect {
  return {
    x: rect.x - by,
    y: rect.y - by,
    width: rect.width + by * 2,
    height: rect.height + by * 2,
  };
}

/** The end points of a CSS linear gradient with an angle, on a box */
export function cssGradientLine(angle: number, box: Rect) {
  const radians = (angle * Math.PI) / 180;
  const dx = Math.sin(radians);
  const dy = -Math.cos(radians);
  const half = (Math.abs(box.width * dx) + Math.abs(box.height * dy)) / 2;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  return { x1: cx - dx * half, y1: cy - dy * half, x2: cx + dx * half, y2: cy + dy * half };
}

/** Color stops of a gradient, as an offset from 0 to 1 and a CSS color */
export type Stops = Array<[number, string]>;

function stops(values: Stops): string {
  return values
    .map(([offset, color]) => `<stop ${attrs({ offset, "stop-color": color })}/>`)
    .join("");
}

/** A CSS linear-gradient with an angle in degrees, as an SVG gradient on a box */
export function linearGradient(id: string, angle: number, box: Rect, values: Stops): string {
  const points = cssGradientLine(angle, box);
  return `<linearGradient ${attrs({ id, gradientUnits: "userSpaceOnUse", ...points })}>${stops(values)}</linearGradient>`;
}

/**
 * A CSS radial-gradient as an SVG gradient: an ellipse at a center, with its radii. The stops
 * go from the center to the edge of the ellipse.
 */
export function radialGradient(
  id: string,
  center: { x: number; y: number },
  radius: { x: number; y: number },
  values: Stops,
): string {
  const scale = radius.y / radius.x;
  const transform = `translate(${round(center.x)} ${round(center.y)}) scale(1 ${round(scale)})`;
  return `<radialGradient ${attrs({ id, gradientUnits: "userSpaceOnUse", cx: 0, cy: 0, r: radius.x, gradientTransform: transform })}>${stops(values)}</radialGradient>`;
}

/** A gaussian blur filter, as CSS filter: blur(radius) */
export function blurFilter(id: string, radius: number): string {
  return `<filter ${attrs({ id, x: "-50%", y: "-50%", width: "200%", height: "200%" })}><feGaussianBlur stdDeviation="${round(radius)}"/></filter>`;
}

// The normal distribution function, with an error below 1.5e-7 (Abramowitz and Stegun 7.1.26)
function normalCdf(x: number): number {
  const t = 1 / (1 + (0.327_591_1 * Math.abs(x)) / Math.SQRT2);
  const poly =
    ((((1.061_405_429 * t - 1.453_152_027) * t + 1.421_413_741) * t - 0.284_496_736) * t +
      0.254_829_592) *
    t;
  const erf = 1 - poly * Math.exp(-(x * x) / 2);
  return x >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

/**
 * Gradient stops of a profile from `start` to `end`, sampled at every half sigma near the edges.
 * Between two samples the gradient interpolates linearly, which is near the blur curve.
 */
function profileStops(
  start: number,
  end: number,
  edges: Array<number>,
  sigma: number,
  value: (at: number) => number,
  color: string,
  opacity: number,
): string {
  const points = new Set([start, end]);
  for (const edge of edges) {
    for (let k = -6; k <= 6; k++) points.add(edge + (k * sigma) / 2);
  }
  return [...points]
    .filter((at) => at >= start && at <= end)
    .sort((a, b) => a - b)
    .map((at) =>
      // As strings, because numbers in attributes keep only two decimals
      attrs({
        offset: String(Math.round(((at - start) / (end - start)) * 10_000) / 10_000),
        "stop-color": color,
        "stop-opacity": String(Math.round(value(at) * opacity * 10_000) / 10_000),
      }),
    )
    .map((stop) => `<stop ${stop}/>`)
    .join("");
}

/**
 * A rounded rect with a gaussian blur, drawn with gradients. This is much faster to render than
 * a blur filter, because the cost of a gradient does not change with the size of the blur.
 * `id` is the start of the ids of the gradients and the mask.
 */
export function blurredRect(
  id: string,
  box: Rect,
  radius: number,
  sigma: number,
  color: string,
  opacity: number,
): string {
  if (sigma < 0.25) return roundedRect(box, radius, { fill: color, "fill-opacity": opacity });
  const reach = 3 * sigma;
  const { x, y, width, height } = box;
  const r = Math.min(radius, width / 2, height / 2);
  const defs: Array<string> = [];
  const out: Array<string> = [];

  if (reach > r) {
    /**
     * A large blur hides the round corners. The blur of a rect is then the product of a blur
     * across and a blur down. The image is cut in a grid: where one of the two is 1, a single
     * gradient is enough. Only the corners need both, which a small mask multiplies.
     */
    const across = (at: number) =>
      normalCdf((at - x) / sigma) - normalCdf((at - x - width) / sigma);
    const down = (at: number) => normalCdf((at - y) / sigma) - normalCdf((at - y - height) / sigma);
    const left = x - reach;
    const right = x + width + reach;
    const top = y - reach;
    const bottom = y + height + reach;
    const horizontal = { gradientUnits: "userSpaceOnUse", x1: left, y1: 0, x2: right, y2: 0 };
    const vertical = { gradientUnits: "userSpaceOnUse", x1: 0, y1: top, x2: 0, y2: bottom };
    defs.push(
      `<linearGradient ${attrs({ id: `${id}-x`, ...horizontal })}>${profileStops(left, right, [x, x + width], sigma, across, color, opacity)}</linearGradient>`,
      `<linearGradient ${attrs({ id: `${id}-y`, ...vertical })}>${profileStops(top, bottom, [y, y + height], sigma, down, color, opacity)}</linearGradient>`,
      `<linearGradient ${attrs({ id: `${id}-ym`, ...vertical })}>${profileStops(top, bottom, [y, y + height], sigma, down, "white", 1)}</linearGradient>`,
    );
    // Cells along one axis, and if the blur is complete in the cell
    const cells = (start: number, size: number, end: number) =>
      size > 2 * reach
        ? [
            { from: start, to: Math.round(start + 2 * reach), flat: false },
            { from: Math.round(start + 2 * reach), to: Math.round(end - 2 * reach), flat: true },
            { from: Math.round(end - 2 * reach), to: end, flat: false },
          ]
        : [{ from: start, to: end, flat: false }];
    let corner = 0;
    for (const column of cells(left, width, right)) {
      for (const row of cells(top, height, bottom)) {
        const cell = {
          x: column.from,
          y: row.from,
          width: column.to - column.from,
          height: row.to - row.from,
        };
        if (column.flat && row.flat) {
          out.push(roundedRect(cell, 0, { fill: color, "fill-opacity": opacity }));
        } else if (column.flat) {
          out.push(roundedRect(cell, 0, { fill: `url(#${id}-y)` }));
        } else if (row.flat) {
          out.push(roundedRect(cell, 0, { fill: `url(#${id}-x)` }));
        } else {
          const mask = `${id}-m${corner++}`;
          defs.push(
            `<mask ${attrs({ id: mask, maskUnits: "userSpaceOnUse", ...cell })}>${roundedRect(cell, 0, { fill: `url(#${id}-ym)` })}</mask>`,
          );
          out.push(roundedRect(cell, 0, { fill: `url(#${id}-x)`, mask: `url(#${mask})` }));
        }
      }
    }
    return `<defs>${defs.join("")}</defs>${out.join("")}`;
  }

  /**
   * A small blur keeps the round corners: a solid center, four edges with a linear gradient
   * across the edge, and four corners with a radial gradient from the center of the corner arc.
   */
  const right = x + width;
  const bottom = y + height;
  // Seams between the pieces on whole pixels, so that their antialiased edges do not show
  const innerLeft = Math.round(x + r);
  const innerRight = Math.round(right - r);
  const innerTop = Math.round(y + r);
  const innerBottom = Math.round(bottom - r);
  // From the outer end of the blur to the start of the solid center, by the distance into the box
  const edgeStops = profileStops(
    -reach,
    r,
    [0],
    sigma,
    (at) => normalCdf(at / sigma),
    color,
    opacity,
  );
  const sides: Array<[string, Rect, Attributes]> = [
    [
      "t",
      { x: innerLeft, y: y - reach, width: innerRight - innerLeft, height: innerTop - y + reach },
      { x1: 0, y1: y - reach, x2: 0, y2: y + r },
    ],
    [
      "b",
      {
        x: innerLeft,
        y: innerBottom,
        width: innerRight - innerLeft,
        height: bottom + reach - innerBottom,
      },
      { x1: 0, y1: bottom + reach, x2: 0, y2: bottom - r },
    ],
    [
      "l",
      { x: x - reach, y: innerTop, width: innerLeft - x + reach, height: innerBottom - innerTop },
      { x1: x - reach, y1: 0, x2: x + r, y2: 0 },
    ],
    [
      "r",
      {
        x: innerRight,
        y: innerTop,
        width: right + reach - innerRight,
        height: innerBottom - innerTop,
      },
      { x1: right + reach, y1: 0, x2: right - r, y2: 0 },
    ],
  ];
  for (const [name, rect, points] of sides) {
    defs.push(
      `<linearGradient ${attrs({ id: `${id}-${name}`, gradientUnits: "userSpaceOnUse", ...points })}>${edgeStops}</linearGradient>`,
    );
    out.push(roundedRect(rect, 0, { fill: `url(#${id}-${name})` }));
  }
  // From the center of the corner arc outward
  const cornerStops = profileStops(
    0,
    r + reach,
    [r],
    sigma,
    (at) => normalCdf((r - at) / sigma),
    color,
    opacity,
  );
  const size = r + reach;
  const corners: Array<[string, number, number, Rect]> = [
    [
      "tl",
      x + r,
      y + r,
      { x: x - reach, y: y - reach, width: innerLeft - x + reach, height: innerTop - y + reach },
    ],
    [
      "tr",
      right - r,
      y + r,
      {
        x: innerRight,
        y: y - reach,
        width: right + reach - innerRight,
        height: innerTop - y + reach,
      },
    ],
    [
      "bl",
      x + r,
      bottom - r,
      {
        x: x - reach,
        y: innerBottom,
        width: innerLeft - x + reach,
        height: bottom + reach - innerBottom,
      },
    ],
    [
      "br",
      right - r,
      bottom - r,
      {
        x: innerRight,
        y: innerBottom,
        width: right + reach - innerRight,
        height: bottom + reach - innerBottom,
      },
    ],
  ];
  for (const [name, cx, cy, rect] of corners) {
    defs.push(
      `<radialGradient ${attrs({ id: `${id}-${name}`, gradientUnits: "userSpaceOnUse", cx, cy, r: size })}>${cornerStops}</radialGradient>`,
    );
    out.push(roundedRect(rect, 0, { fill: `url(#${id}-${name})` }));
  }
  out.push(
    roundedRect(
      { x: innerLeft, y: innerTop, width: innerRight - innerLeft, height: innerBottom - innerTop },
      0,
      { fill: color, "fill-opacity": opacity },
    ),
  );
  return `<defs>${defs.join("")}</defs>${out.join("")}`;
}

export function textAttrs(font: Font, style: { bold?: boolean; italic?: boolean }, size: number) {
  const face = getFace(font, style);
  return {
    "font-family": cssFontFamily(font, face),
    "font-size": size,
    "font-weight": face.weight,
    "font-style": style.italic ? "italic" : undefined,
  };
}

/** Text of the user interface with a given weight, or the nearest weight of the font */
export function text(
  content: string,
  x: number,
  y: number,
  options: {
    font: Font;
    size: number;
    weight?: number;
    color: string;
    anchor?: "start" | "middle" | "end";
    letterSpacing?: number;
  },
): string {
  const weight = options.weight ?? 400;
  const face = options.font.faces.reduce((best, face) =>
    Math.abs(face.weight - weight) < Math.abs(best.weight - weight) && !face.italic ? face : best,
  );
  return `<text ${attrs({
    x,
    y,
    fill: options.color,
    "text-anchor": options.anchor === "start" ? undefined : options.anchor,
    "dominant-baseline": "central",
    "letter-spacing": options.letterSpacing,
    "font-family": cssFontFamily(options.font, face),
    "font-size": options.size,
    "font-weight": face.weight,
  })}>${escapeXml(content)}</text>`;
}

type Rgba = [number, number, number, number];

export function parseColor(color: string): Rgba {
  if (color === "transparent") return [0, 0, 0, 0];
  const rgba = /^rgba?\(([^)]+)\)$/.exec(color);
  if (rgba) {
    const [r, g, b, a = 1] = rgba[1]!.split(",").map(Number);
    return [r!, g!, b!, a];
  }
  const hex = color.slice(1);
  const channel = (index: number) => parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  return [channel(0), channel(1), channel(2), hex.length === 8 ? channel(3) / 255 : 1];
}

/** Paints a translucent color over an opaque one */
export function blend(top: string, bottom: string): string {
  const [r1, g1, b1, alpha] = parseColor(top);
  const [r2, g2, b2] = parseColor(bottom);
  const mix = (a: number, b: number) => Math.round(a * alpha + b * (1 - alpha));
  return `rgb(${mix(r1, r2)}, ${mix(g1, g2)}, ${mix(b1, b2)})`;
}
