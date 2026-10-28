import { boxShadow, type ShadowLayer } from "./default.ts";
import { inflate, linearGradient, roundedRect } from "./draw.ts";
import type { FrameOverrides } from "./types.ts";

// The shadow layers of the window: offset y, blur radius and opacity of black
const SHADOWS: Record<"dark" | "light", Array<[number, number, number]>> = {
  dark: [
    [100, 89, 0.07],
    [41.78, 37.18, 0.05],
    [22.34, 19.88, 0.04],
    [12.52, 11.14, 0.04],
    [6.65, 5.92, 0.03],
    [2.77, 2.46, 0.02],
  ],
  light: [
    [73, 83, 0.03],
    [4.86, 5.52, 0.01],
    [2.02, 2.3, 0.01],
  ],
};

const shadow = (mode: "dark" | "light"): Array<ShadowLayer> =>
  SHADOWS[mode].map(([y, blur, opacity]) => ({ y, blur, color: "black", opacity }));

const COLORS = {
  dark: { border: "rgba(255, 255, 255, 0.1)" },
  light: { border: "rgba(0, 0, 0, 0.1)" },
};

/**
 * The frame of OpenAI in ray.so: a dark blue background (a soft light gradient in light mode),
 * and an opaque window with a hairline border and a soft shadow. ray.so shows no title bar, so
 * the title bar is the default one in the colors of the theme.
 */
export const frame: FrameOverrides = {
  radius: 8,
  colors: {
    dark: {
      backdrop: { from: "#121a29", to: "#121a29" },
      background: "#232b41",
      control: "rgba(255, 255, 255, 0.2)",
      title: "rgba(255, 255, 255, 0.6)",
      divider: "rgba(255, 255, 255, 0.1)",
      lineNumber: "rgba(255, 255, 255, 0.2)",
    },
    light: {
      backdrop: { from: "#f1f0f4", to: "#f8f8fd" },
      background: "#ffffff",
      control: "rgba(0, 0, 0, 0.15)",
      title: "rgba(0, 0, 0, 0.55)",
      divider: "rgba(0, 0, 0, 0.08)",
      lineNumber: "#acacbe",
    },
  },
  background: (context) => {
    const { scene } = context;
    const { from, to } = scene.frame.backdrop;
    if (from === to)
      return `<rect width="${scene.width}" height="${scene.height}" fill="${from}"/>`;
    const box = { x: 0, y: 0, width: scene.width, height: scene.height };
    const id = context.id("background");
    return `<defs>${linearGradient(id, 238, box, [
      [0, from],
      [1, to],
    ])}</defs><rect width="${scene.width}" height="${scene.height}" fill="url(#${id})"/>`;
  },
  behind: (context, window) =>
    window.frame ? boxShadow(context, window, shadow(context.mode)) : "",
  border: ({ mode }, window) =>
    // A border of half a pixel at the inner edge of the window
    roundedRect(inflate(window, -0.25), window.radius - 0.25, {
      fill: "none",
      stroke: COLORS[mode].border,
      "stroke-width": 0.5,
    }),
};
