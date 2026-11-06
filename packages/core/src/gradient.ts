import { attrs, cssGradientLine, round } from "./frames/draw.ts";
import type { Rect } from "./layout.ts";

/**
 * The CSS backgrounds that a spec can use: a color, or layers of linear-gradient and
 * radial-gradient with an optional color as the last layer. Colors are hex, rgb(), rgba() and
 * transparent.
 */

export type Rgba = { r: number; g: number; b: number; a: number };

type Length = { value: number; unit: "%" | "px" };

type ColorStop = { color: Rgba; position?: Length };

type Extent = "closest-side" | "closest-corner" | "farthest-side" | "farthest-corner";

type LinearLayer = {
  type: "linear";
  /** An angle in degrees, or the corner or side of a "to" keyword as -1, 0 or 1 on each axis */
  direction: { angle: number } | { to: { x: number; y: number } };
  stops: Array<ColorStop>;
};

type RadialLayer = {
  type: "radial";
  shape: "circle" | "ellipse";
  size: Extent | { x: Length; y: Length };
  at: { x: Length; y: Length };
  stops: Array<ColorStop>;
};

type ColorLayer = { type: "color"; color: Rgba };

type Layer = LinearLayer | RadialLayer | ColorLayer;

/** A parsed CSS background, with the top layer first as in CSS */
export type CssBackground = Array<Layer>;

const HEX = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const NUMBER = String.raw`[+-]?(?:\d+\.?\d*|\.\d+)`;
const LENGTH = new RegExp(`^(${NUMBER})(%|px)?$`, "i");
const ANGLE = new RegExp(`^(${NUMBER})(deg|turn|rad|grad)$`, "i");

const SIDES: Record<string, { x?: number; y?: number }> = {
  left: { x: -1 },
  right: { x: 1 },
  top: { y: -1 },
  bottom: { y: 1 },
};

const EXTENTS = new Set<string>([
  "closest-side",
  "closest-corner",
  "farthest-side",
  "farthest-corner",
]);

const POSITION_KEYWORDS: Record<string, { axis?: "x" | "y"; value: number }> = {
  left: { axis: "x", value: 0 },
  right: { axis: "x", value: 100 },
  top: { axis: "y", value: 0 },
  bottom: { axis: "y", value: 100 },
  center: { value: 50 },
};

/** Splits at the separator outside of parentheses */
function split(text: string, separator: "," | " "): Array<string> {
  const parts: Array<string> = [];
  let depth = 0;
  let current = "";
  for (const char of text) {
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (depth < 0) throw new Error("unbalanced parentheses");
    const isSeparator = separator === " " ? /\s/.test(char) : char === separator;
    if (isSeparator && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else current += char;
  }
  if (depth !== 0) throw new Error("unbalanced parentheses");
  parts.push(current.trim());
  return separator === " " ? parts.filter(Boolean) : parts;
}

function parseHex(hex: string): Rgba {
  const digits = hex.slice(1);
  const full = digits.length <= 4 ? digits.replace(/./g, "$&$&") : digits;
  const channel = (index: number) => parseInt(full.slice(index * 2, index * 2 + 2), 16);
  return {
    r: channel(0),
    g: channel(1),
    b: channel(2),
    a: full.length === 8 ? channel(3) / 255 : 1,
  };
}

function parseChannel(text: string, max: number): number {
  const match = LENGTH.exec(text);
  if (!match || match[2]?.toLowerCase() === "px") throw new Error(`invalid color channel ${text}`);
  const value = Number(match[1]);
  const scaled = match[2] === "%" ? (value / 100) * max : value;
  return Math.min(max, Math.max(0, scaled));
}

export function parseColor(text: string): Rgba | undefined {
  const color = text.trim().toLowerCase();
  if (color === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  if (HEX.test(color)) return parseHex(color);
  const fn = /^rgba?\((.*)\)$/.exec(color);
  if (!fn) return undefined;
  // rgb(1, 2, 3), rgba(1, 2, 3, 0.5), rgb(1 2 3) and rgb(1 2 3 / 50%)
  const [channels, alpha] = fn[1]!.includes("/") ? fn[1]!.split("/") : [fn[1]!, undefined];
  const parts = channels!.includes(",")
    ? channels!.split(",").map((part) => part.trim())
    : split(channels!, " ");
  if (alpha !== undefined && parts.length !== 3) return undefined;
  if (parts.length !== 3 && parts.length !== 4) return undefined;
  const [r, g, b] = parts.slice(0, 3).map((part) => parseChannel(part, 255));
  const a = alpha ?? parts[3];
  return { r: r!, g: g!, b: b!, a: a === undefined ? 1 : parseChannel(a.trim(), 1) };
}

function parseLength(text: string): Length {
  const match = LENGTH.exec(text);
  if (!match) throw new Error(`invalid length ${text}`);
  const value = Number(match[1]);
  if (!match[2] && value !== 0) throw new Error(`a length needs % or px: ${text}`);
  return { value, unit: (match[2]?.toLowerCase() ?? "px") as Length["unit"] };
}

function parseStops(args: Array<string>): Array<ColorStop> {
  const stops = args.flatMap((arg) => {
    const [colorText, ...positions] = split(arg, " ");
    const color = parseColor(colorText ?? "");
    if (!color || positions.length > 2) throw new Error(`invalid color stop ${arg}`);
    if (positions.length === 0) return [{ color }];
    return positions.map((position) => ({ color, position: parseLength(position) }));
  });
  if (stops.length < 2) throw new Error("a gradient needs two colors");
  return stops;
}

function parseAngle(text: string): number | undefined {
  const match = ANGLE.exec(text);
  if (!match) return undefined;
  const value = Number(match[1]);
  const unit = match[2]!.toLowerCase();
  if (unit === "turn") return value * 360;
  if (unit === "rad") return (value * 180) / Math.PI;
  if (unit === "grad") return value * 0.9;
  return value;
}

function parseLinear(args: Array<string>): LinearLayer {
  const first = args[0]!;
  const angle = parseAngle(first);
  if (angle !== undefined)
    return { type: "linear", direction: { angle }, stops: parseStops(args.slice(1)) };
  const words = split(first, " ");
  if (words[0] === "to") {
    const to = { x: 0, y: 0 };
    for (const word of words.slice(1)) {
      const side = SIDES[word];
      if (!side || words.length > 3) throw new Error(`invalid direction ${first}`);
      Object.assign(to, side);
    }
    if (words.length < 2) throw new Error(`invalid direction ${first}`);
    return { type: "linear", direction: { to }, stops: parseStops(args.slice(1)) };
  }
  return { type: "linear", direction: { angle: 180 }, stops: parseStops(args) };
}

function parsePosition(words: Array<string>): RadialLayer["at"] {
  if (words.length < 1 || words.length > 2) throw new Error("invalid position");
  const at: Partial<RadialLayer["at"]> = {};
  const loose: Array<Length> = [];
  for (const word of words) {
    const keyword = POSITION_KEYWORDS[word];
    if (keyword?.axis) at[keyword.axis] = { value: keyword.value, unit: "%" };
    else loose.push(keyword ? { value: keyword.value, unit: "%" } : parseLength(word));
  }
  // Lengths and center take the free axes in the order x, y
  for (const length of loose) {
    if (!at.x) at.x = length;
    else if (!at.y) at.y = length;
    else throw new Error("invalid position");
  }
  const center: Length = { value: 50, unit: "%" };
  return { x: at.x ?? center, y: at.y ?? center };
}

function parseRadial(args: Array<string>): RadialLayer {
  const first = split(args[0]!, " ");
  const isPrelude =
    first.some(
      (word) => word === "at" || word === "circle" || word === "ellipse" || EXTENTS.has(word),
    ) ||
    (parseColor(first[0] ?? "") === undefined && LENGTH.test(first[0] ?? ""));
  const layer: RadialLayer = {
    type: "radial",
    shape: "ellipse",
    size: "farthest-corner",
    at: { x: { value: 50, unit: "%" }, y: { value: 50, unit: "%" } },
    stops: parseStops(isPrelude ? args.slice(1) : args),
  };
  if (!isPrelude) return layer;
  const atIndex = first.indexOf("at");
  const shapeWords = atIndex === -1 ? first : first.slice(0, atIndex);
  if (atIndex !== -1) layer.at = parsePosition(first.slice(atIndex + 1));
  const sizes: Array<Length> = [];
  let shape: RadialLayer["shape"] | undefined;
  for (const word of shapeWords) {
    if (word === "circle" || word === "ellipse") shape = word;
    else if (EXTENTS.has(word)) layer.size = word as Extent;
    else sizes.push(parseLength(word));
  }
  if (sizes.length === 1) {
    if (shape === "ellipse" || sizes[0]!.unit === "%")
      throw new Error("a circle needs one px size");
    layer.size = { x: sizes[0]!, y: sizes[0]! };
    shape = "circle";
  } else if (sizes.length === 2) {
    if (shape === "circle") throw new Error("an ellipse needs two sizes");
    layer.size = { x: sizes[0]!, y: sizes[1]! };
  } else if (sizes.length > 2) throw new Error("invalid size");
  layer.shape = shape ?? "ellipse";
  return layer;
}

function parseLayer(text: string, last: boolean): Layer {
  const fn = /^([a-z-]+)\((.*)\)$/is.exec(text);
  const name = fn?.[1]?.toLowerCase();
  if (name === "linear-gradient") return parseLinear(split(fn![2]!, ","));
  if (name === "radial-gradient") return parseRadial(split(fn![2]!, ","));
  const color = parseColor(text);
  if (!color) throw new Error(`invalid layer ${text}`);
  if (!last) throw new Error("only the last layer can be a color");
  return { type: "color", color };
}

/** Parses a CSS background, or gives undefined when the spec cannot use it */
export function parseBackground(css: string): CssBackground | undefined {
  try {
    const parts = split(css.trim().replace(/\s+/g, " "), ",");
    if (parts.length > 16 || parts.some((part) => part === "")) return undefined;
    return parts.map((part, index) => parseLayer(part, index === parts.length - 1));
  } catch {
    return undefined;
  }
}

export function isCssBackground(css: string): boolean {
  return parseBackground(css) !== undefined;
}

function hex({ r, g, b }: Rgba): string {
  return `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * A color for the places that need one color of the background, such as the color below a
 * translucent window: the color layer, or else the first visible color of the bottom layer.
 */
export function backgroundBaseColor(background: CssBackground): string {
  const bottom = background.at(-1)!;
  if (bottom.type === "color") return hex(bottom.color);
  const visible = bottom.stops.find((stop) => stop.color.a > 0) ?? bottom.stops[0]!;
  return hex(visible.color);
}

/**
 * The offsets of the stops from 0 to 1 along a gradient ray of a length in px, with the rules of
 * CSS: the first stop is at 0, the last at 1, a stop is never before the one ahead of it, and
 * stops without a position share the space between their neighbors.
 */
function stopOffsets(stops: Array<ColorStop>, length: number): Array<number> {
  const offsets: Array<number | undefined> = stops.map(({ position }) =>
    position === undefined
      ? undefined
      : position.unit === "%"
        ? position.value / 100
        : position.value / Math.max(length, 0.01),
  );
  offsets[0] ??= 0;
  offsets[offsets.length - 1] ??= 1;
  let max = offsets[0];
  for (let i = 0; i < offsets.length; i++) {
    if (offsets[i] !== undefined) {
      max = Math.max(max, offsets[i]!);
      offsets[i] = max;
    }
  }
  for (let i = 1; i < offsets.length; i++) {
    if (offsets[i] !== undefined) continue;
    let end = i;
    while (offsets[end] === undefined) end++;
    const start = offsets[i - 1]!;
    const step = (offsets[end]! - start) / (end - i + 1);
    for (let k = i; k < end; k++) offsets[k] = start + step * (k - i + 1);
  }
  return offsets as Array<number>;
}

type SvgStop = { offset: number; color: Rgba };

/**
 * A browser mixes the colors of a gradient with their alpha (premultiplied), SVG does not. A stop
 * with no alpha takes the color of its neighbors, so that the gradient fades without gray.
 */
function premultiplyStops(stops: Array<SvgStop>): Array<SvgStop> {
  const visible = (from: number, step: number) => {
    for (let i = from; i >= 0 && i < stops.length; i += step) {
      if (stops[i]!.color.a > 0) return stops[i]!.color;
    }
    return undefined;
  };
  return stops.flatMap((stop, index) => {
    if (stop.color.a > 0) return [stop];
    const before = visible(index - 1, -1);
    const after = visible(index + 1, 1);
    return [before, after]
      .filter((color, i, all) => color && (i === 0 || color !== all[0]))
      .map((color) => ({ offset: stop.offset, color: { ...color!, a: 0 } }))
      .concat(before || after ? [] : [stop]);
  });
}

function svgStops(stops: Array<SvgStop>): string {
  return premultiplyStops(stops)
    .map(
      ({ offset, color }) =>
        `<stop ${attrs({ offset: Math.min(1, Math.max(0, offset)), "stop-color": hex(color), "stop-opacity": color.a === 1 ? undefined : round(color.a) })}/>`,
    )
    .join("");
}

function resolveLength(length: Length, size: number): number {
  return length.unit === "%" ? (length.value / 100) * size : length.value;
}

/**
 * Stretches the stops to the range from 0 to 1. Gives the start and the end of the range on the
 * old scale, so that the caller can move the end points of the gradient.
 */
function normalize(offsets: Array<number>, allowNegative: boolean) {
  const start = allowNegative ? Math.min(0, offsets[0]!) : 0;
  const end = Math.max(1, offsets.at(-1)!);
  return {
    start,
    end,
    offsets: offsets.map((offset) => (Math.max(offset, start) - start) / (end - start)),
  };
}

function linearSvg(id: string, layer: LinearLayer, box: Rect): string {
  const angle =
    "angle" in layer.direction
      ? layer.direction.angle
      : // A corner points the line so that the middle of the gradient goes through the other two corners
        (Math.atan2(layer.direction.to.x * box.height, -layer.direction.to.y * box.width) * 180) /
        Math.PI;
  const line = cssGradientLine(angle, box);
  const length = Math.hypot(line.x2 - line.x1, line.y2 - line.y1);
  const { start, end, offsets } = normalize(stopOffsets(layer.stops, length), true);
  const dx = line.x2 - line.x1;
  const dy = line.y2 - line.y1;
  const points = {
    x1: line.x1 + dx * start,
    y1: line.y1 + dy * start,
    x2: line.x1 + dx * end,
    y2: line.y1 + dy * end,
  };
  const stops = layer.stops.map((stop, index) => ({ offset: offsets[index]!, color: stop.color }));
  return `<linearGradient ${attrs({ id, gradientUnits: "userSpaceOnUse", ...points })}>${svgStops(stops)}</linearGradient>`;
}

function radialRadii(layer: RadialLayer, box: Rect, center: { x: number; y: number }) {
  if (typeof layer.size === "object") {
    return {
      x: resolveLength(layer.size.x, box.width),
      y: resolveLength(layer.size.y, box.height),
    };
  }
  const sides = {
    x: [center.x - box.x, box.x + box.width - center.x].map(Math.abs),
    y: [center.y - box.y, box.y + box.height - center.y].map(Math.abs),
  };
  const closest = layer.size.startsWith("closest");
  const pick = (values: Array<number>) => (closest ? Math.min(...values) : Math.max(...values));
  const side = { x: pick(sides.x), y: pick(sides.y) };
  if (layer.shape === "circle") {
    if (layer.size.endsWith("side")) {
      const radius = pick([...sides.x, ...sides.y]);
      return { x: radius, y: radius };
    }
    const radius = Math.hypot(side.x, side.y);
    return { x: radius, y: radius };
  }
  if (layer.size.endsWith("side")) return side;
  // The ellipse through the corner keeps the ratio of the sides
  return { x: side.x * Math.SQRT2, y: side.y * Math.SQRT2 };
}

function radialSvg(id: string, layer: RadialLayer, box: Rect): string {
  const center = {
    x: box.x + resolveLength(layer.at.x, box.width),
    y: box.y + resolveLength(layer.at.y, box.height),
  };
  const radii = radialRadii(layer, box, center);
  const rx = Math.max(radii.x, 0.01);
  const ry = Math.max(radii.y, 0.01);
  const { end, offsets } = normalize(stopOffsets(layer.stops, rx), false);
  const stops = layer.stops.map((stop, index) => ({ offset: offsets[index]!, color: stop.color }));
  const transform = `translate(${round(center.x)} ${round(center.y)}) scale(1 ${round(ry / rx)})`;
  return `<radialGradient ${attrs({ id, gradientUnits: "userSpaceOnUse", cx: 0, cy: 0, r: rx * end, gradientTransform: transform })}>${svgStops(stops)}</radialGradient>`;
}

/** The background as SVG on a box: the bottom layer first, as SVG paints in order */
export function backgroundSvg(
  background: CssBackground,
  box: Rect,
  newId: (name: string) => string,
): string {
  const rect = (fill: string, opacity?: number) =>
    `<rect ${attrs({ x: box.x, y: box.y, width: box.width, height: box.height, fill, "fill-opacity": opacity })}/>`;
  return background
    .toReversed()
    .map((layer) => {
      if (layer.type === "color") {
        return rect(hex(layer.color), layer.color.a === 1 ? undefined : round(layer.color.a));
      }
      const id = newId(`background-${layer.type}`);
      const gradient =
        layer.type === "linear" ? linearSvg(id, layer, box) : radialSvg(id, layer, box);
      return `<defs>${gradient}</defs>${rect(`url(#${id})`)}`;
    })
    .join("");
}
