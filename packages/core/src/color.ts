import { parseColor, type Rgba } from "./gradient.ts";

type Oklab = { l: number; a: number; b: number };

function rgba(color: string): Rgba {
  const parsed = parseColor(color);
  if (!parsed) throw new Error(`Unknown color "${color}"`);
  return parsed;
}

const toHex = (channel: number) =>
  Math.round(Math.min(255, Math.max(0, channel)))
    .toString(16)
    .padStart(2, "0");

function hex({ r, g, b }: Rgba): string {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const toLinear = (channel: number) => {
  const value = channel / 255;
  return value <= 0.040_45 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

const fromLinear = (value: number) =>
  255 * (value <= 0.003_130_8 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055);

// The conversion of Björn Ottosson, who defined OKLab
function toOklab({ r, g, b }: Rgba): Oklab {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)];
  const l = Math.cbrt(0.412_221_470_8 * lr + 0.536_332_536_3 * lg + 0.051_445_992_9 * lb);
  const m = Math.cbrt(0.211_903_498_2 * lr + 0.680_699_545_1 * lg + 0.107_396_956_6 * lb);
  const s = Math.cbrt(0.088_302_461_9 * lr + 0.281_718_837_6 * lg + 0.629_978_700_5 * lb);
  return {
    l: 0.210_454_255_3 * l + 0.793_617_785 * m - 0.004_072_046_8 * s,
    a: 1.977_998_495_1 * l - 2.428_592_205 * m + 0.450_593_709_9 * s,
    b: 0.025_904_037_1 * l + 0.782_771_766_2 * m - 0.808_675_766 * s,
  };
}

function fromOklab({ l, a, b }: Oklab): Rgba {
  const l3 = (l + 0.396_337_777_4 * a + 0.215_803_757_3 * b) ** 3;
  const m3 = (l - 0.105_561_345_8 * a - 0.063_854_172_8 * b) ** 3;
  const s3 = (l - 0.089_484_177_5 * a - 1.291_485_548 * b) ** 3;
  return {
    r: fromLinear(4.076_741_662_1 * l3 - 3.307_711_591_3 * m3 + 0.230_969_929_2 * s3),
    g: fromLinear(-1.268_438_004_6 * l3 + 2.609_757_401_1 * m3 - 0.341_319_396_5 * s3),
    b: fromLinear(-0.004_196_086_3 * l3 - 0.703_418_614_7 * m3 + 1.707_614_701 * s3),
    a: 1,
  };
}

/** How light a color looks, from 0 (black) to 1 (white) */
export function oklabLightness(color: string): number {
  return toOklab(rgba(color)).l;
}

/** The opaque color of a translucent color over an opaque one, as hex */
export function composite(color: string, below: string): string {
  const top = rgba(color);
  const base = rgba(below);
  const mix = (front: number, back: number) => front * top.a + back * (1 - top.a);
  return hex({ r: mix(top.r, base.r), g: mix(top.g, base.g), b: mix(top.b, base.b), a: 1 });
}

/**
 * A color with at least the given lightness difference to an opaque background, as an opaque hex
 * color. The color keeps its hue and goes further in its own direction: lighter when it is lighter
 * than the background, darker when it is darker. A color with no difference goes lighter on a dark
 * background and darker on a light one.
 */
export function withContrast(color: string, background: string, minimum: number): string {
  const opaque = composite(color, background);
  const front = toOklab(rgba(opaque));
  const back = toOklab(rgba(background));
  const difference = front.l - back.l;
  if (Math.abs(difference) >= minimum) return opaque;
  const step = (difference === 0 ? back.l < 0.5 : difference > 0) ? 1 : -1;
  // The 8-bit channels of a hex color round the lightness, so the target moves on until it is met
  for (let extra = 0; extra < 0.02; extra += 0.001) {
    const result = hex(fromOklab({ ...front, l: back.l + step * (minimum + extra) }));
    if (Math.abs(toOklab(rgba(result)).l - back.l) >= minimum) return result;
  }
  return hex(fromOklab({ ...front, l: back.l + step * (minimum + 0.02) }));
}
