import type { Rect, WindowBox } from "../layout.ts";
import { boxShadow, titleBarText } from "./default.ts";
import { attrs, blurFilter, inflate, line, linearGradient, roundedRect } from "./draw.ts";
import type { FrameContext, FrameOverrides } from "./types.ts";

const COLORS = {
  dark: {
    background: "#0f172a",
    window: "#1a2a3d",
    border: "rgba(210, 241, 255, 0.25)",
    header: "rgba(255, 255, 255, 0.1)",
    control: "#475569",
    title: "#94a3b8",
    gridline: "#ffffff",
  },
  light: {
    background: "#ffffff",
    window: "rgba(255, 255, 255, 0.75)",
    border: "rgba(210, 241, 255, 0.25)",
    header: "rgba(0, 0, 0, 0.1)",
    control: "#e2e8f0",
    title: "#64748b",
    gridline: "#020617",
  },
};

// The close, minimize and zoom buttons of macOS
const CONTROL_COLORS = ["#ff5f57", "#febc2e", "#28c840"];
const CONTROL = { size: 10, gap: 9 };

// Distance of the grid lines from the outer edge of the window, and the length that they go past it
const GRID = { offset: 23, overhang: 64 };

/**
 * Soft colored light at the top of the image: an ellipse with a center relative to the top
 * center of the image, its radii, a rotation, a color, an opacity and a blur radius.
 */
type Beam = {
  x: number;
  y: number;
  rx: number;
  ry: number;
  rotate?: number;
  color: string;
  opacity: number;
  blur: number;
};

// The light of the beams, which the dark mode shows mostly above the image
const BEAMS: Record<"dark" | "light", Array<Beam>> = {
  dark: [
    { x: -150, y: 0, rx: 170, ry: 45, color: "#a5b4fc", opacity: 0.12, blur: 28 },
    { x: 20, y: 10, rx: 60, ry: 30, rotate: 35, color: "#c4b5fd", opacity: 0.1, blur: 20 },
    { x: 260, y: 10, rx: 160, ry: 50, color: "#60a5fa", opacity: 0.05, blur: 36 },
  ],
  light: [
    { x: -180, y: 15, rx: 110, ry: 40, color: "#f9a8d4", opacity: 0.45, blur: 26 },
    { x: -40, y: 0, rx: 90, ry: 30, color: "#e9d5ff", opacity: 0.5, blur: 22 },
    { x: 20, y: 30, rx: 75, ry: 16, rotate: 40, color: "#7dd3fc", opacity: 0.7, blur: 12 },
    { x: 240, y: 40, rx: 190, ry: 75, color: "#c7d2fe", opacity: 0.55, blur: 36 },
  ],
};

function controls(window: WindowBox, gray: string): string {
  const box = window.titleBar?.controls;
  if (!box) return "";
  const r = CONTROL.size / 2;
  const cy = box.y + box.height / 2;
  return [0, 1, 2]
    .map((i) => {
      const cx = box.x + r + i * (CONTROL.size + CONTROL.gap);
      const fill = window.controls === "color" ? CONTROL_COLORS[i]! : gray;
      return `<circle ${attrs({ cx, cy, r, fill })}/>`;
    })
    .join("");
}

/** Two horizontal and two vertical grid lines around the window, which fade out at their ends */
function gridlines(context: FrameContext, window: WindowBox): string {
  const color = COLORS[context.mode].gridline;
  const opacity = 0.1;
  const fade = (id: string, x1: number, y1: number, x2: number, y2: number, length: number) => {
    const edge = GRID.overhang / length;
    return `<linearGradient ${attrs({ id, gradientUnits: "userSpaceOnUse", x1, y1, x2, y2 })}>${[
      [0, 0],
      [edge, opacity],
      [1 - edge, opacity],
      [1, 0],
    ]
      .map(
        ([offset, alpha]) =>
          `<stop ${attrs({ offset, "stop-color": color, "stop-opacity": alpha })}/>`,
      )
      .join("")}</linearGradient>`;
  };
  const left = window.x - GRID.overhang;
  const right = window.x + window.width + GRID.overhang;
  const top = window.y - GRID.overhang;
  const bottom = window.y + window.height + GRID.overhang;
  const horizontal = context.id(`grid-x-${window.x}-${window.y}`);
  const vertical = context.id(`grid-y-${window.x}-${window.y}`);
  const out = [
    `<defs>${fade(horizontal, left, 0, right, 0, right - left)}${fade(vertical, 0, top, 0, bottom, bottom - top)}</defs>`,
  ];
  for (const y of [window.y - GRID.offset + 0.5, window.y + window.height + GRID.offset - 0.5])
    out.push(line(left, y, right, y, { stroke: `url(#${horizontal})` }));
  for (const x of [window.x - GRID.offset + 0.5, window.x + window.width + GRID.offset - 0.5])
    out.push(line(x, top, x, bottom, { stroke: `url(#${vertical})` }));
  return out.join("");
}

// A blur filter with a region around the box, because a region relative to a thin box cuts the blur off
function blur(id: string, radius: number, box: Rect): string {
  const region = inflate(box, radius * 3);
  return `<filter ${attrs({ id, filterUnits: "userSpaceOnUse", ...region })}><feGaussianBlur stdDeviation="${radius}"/></filter>`;
}

/** A thin line of light from sky blue to pink on the lower grid line, which glows downward */
function glow(context: FrameContext, window: WindowBox): string {
  const x = window.x + 20;
  // The line is 2px high, but only its lower half shows, on the lower grid line
  const y = window.y + window.height + GRID.offset - 2;
  const width = Math.min(640, Math.max(224, window.width * 0.8));
  const box = { x, y, width, height: 2 };
  const key = `${window.x}-${window.y}`;
  const gradient = context.id(`glow-${key}`);
  const clip = context.id(`glow-clip-${key}`);
  const soft = context.id(`glow-soft-${key}`);
  const sharp = context.id(`glow-sharp-${key}`);
  const defs = [
    linearGradient(gradient, 90, box, [
      [0, "rgba(56, 189, 248, 0)"],
      [0.3229, "#0ea5e9"],
      [0.6719, "rgba(236, 72, 153, 0.3)"],
      [1, "rgba(236, 72, 153, 0)"],
    ]),
    `<clipPath id="${clip}">${roundedRect({ x, y: y + 1, width: window.width, height: 32 }, 0)}</clipPath>`,
    blur(soft, 4, box),
    blur(sharp, 1, box),
  ];
  const fill = `url(#${gradient})`;
  return `<defs>${defs.join("")}</defs><g clip-path="url(#${clip})">${roundedRect(box, 0, { fill, filter: `url(#${soft})` })}${roundedRect(box, 0, { fill, filter: `url(#${sharp})` })}</g>`;
}

/**
 * The frame of Tailwind CSS in ray.so: a dark slate background with beams of light at the top,
 * and a slate window with a thin border. Grid lines go around the window, with a line of light
 * below it.
 */
export const frame: FrameOverrides = {
  radius: 8,
  inset: 1,
  titleBar: {
    paddingTop: 0,
    rowHeight: 34,
    paddingBottom: 0,
    tabsGap: 0,
    paddingX: 12,
  },
  colors: {
    dark: {
      background: COLORS.dark.window,
      title: COLORS.dark.title,
      control: COLORS.dark.control,
      divider: COLORS.dark.header,
      lineNumber: "#475569",
    },
    light: {
      background: COLORS.light.window,
      title: COLORS.light.title,
      control: COLORS.light.control,
      divider: COLORS.light.header,
      lineNumber: "#cbd5e1",
    },
  },
  base: ({ mode }) => (mode === "dark" ? COLORS.dark.window : "#ffffff"),
  background: (context) => {
    const { scene, mode } = context;
    const out = [
      `<rect width="${scene.width}" height="${scene.height}" fill="${COLORS[mode].background}"/>`,
    ];
    const center = scene.width / 2;
    BEAMS[mode].forEach((beam, index) => {
      const id = context.id(`beam-${index}`);
      const cx = center + beam.x;
      out.push(
        `<defs>${blurFilter(id, beam.blur)}</defs><ellipse ${attrs({
          cx,
          cy: beam.y,
          rx: beam.rx,
          ry: beam.ry,
          fill: beam.color,
          "fill-opacity": beam.opacity,
          filter: `url(#${id})`,
          transform: beam.rotate ? `rotate(${beam.rotate} ${cx} ${beam.y})` : undefined,
        })}/>`,
      );
    });
    return out.join("");
  },
  behind: (context, window) => {
    const out = [gridlines(context, window), glow(context, window)];
    if (window.frame && context.mode === "light")
      out.push(boxShadow(context, window, [{ y: 2, blur: 4, color: "black", opacity: 0.06 }]));
    return out.join("");
  },
  body: ({ scene }, window) => roundedRect(window, window.radius, { fill: scene.frame.background }),
  header: (context, window) => {
    const { scene } = context;
    const header = window.header!;
    const y = header.y + header.height - 0.5;
    return (
      line(header.x, y, header.x + header.width, y, { stroke: scene.frame.divider }) +
      controls(window, scene.frame.control) +
      titleBarText(context, window, { title: scene.frame.title })
    );
  },
  border: ({ mode }, window) => {
    const out = [
      roundedRect(inflate(window, -0.5), window.radius - 0.5, {
        fill: "none",
        stroke: COLORS[mode].border,
      }),
    ];
    // A ring of 1px outside the window in light mode
    if (mode === "light")
      out.push(
        roundedRect(inflate(window, 0.5), window.radius + 0.5, {
          fill: "none",
          stroke: "rgba(15, 23, 42, 0.1)",
        }),
      );
    return out.join("");
  },
};
