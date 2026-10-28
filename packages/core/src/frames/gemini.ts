import { measureUiText } from "../fonts/index.ts";
import type { WindowBox } from "../layout.ts";
import { boxShadow, titleBarText } from "./default.ts";
import { attrs, round, roundedRect } from "./draw.ts";
import type { FrameContext, FrameOverrides } from "./types.ts";

// The night sky is the same in both modes
const SKY = { color: "#0e1016", star: "#ffffff" };
// A light sky, only when a window without a frame shows light code directly on the sky
const LIGHT_SKY = { color: "#f4f6fa", star: "#16181d" };

const COLORS = {
  dark: {
    window: "#16181d",
    opaqueWindow: "#16181d",
    header: "rgba(0, 0, 0, 0.2)",
    title: "#5c9ec7",
    shadow: 0.4,
  },
  light: {
    window: "rgba(255, 255, 255, 0.9)",
    opaqueWindow: "#ffffff",
    header: "rgba(0, 0, 0, 0.03)",
    title: "#1867d2",
    shadow: 0.08,
  },
};

const RADIUS = 26;
const HEADER_HEIGHT = 40;
const TITLE_SIZE = 12;
const LETTER_SPACING = 0.4;
// Height of the line below the title, which marks it as the active tab
const UNDERLINE = 2;

// The stars repeat in tiles of this size, with the same number of stars per area as ray.so
const TILE = 400;
const STARS = 300;

/** A tile of small white stars at random places, the same in every image */
function starTile(id: string, color: string): string {
  // A small random generator with a fixed seed, so that the stars do not move between renders
  let seed = 7;
  const random = () => {
    seed = (seed * 16_807) % 2_147_483_647;
    return seed / 2_147_483_647;
  };
  const stars: Array<string> = [];
  for (let i = 0; i < STARS; i++) {
    stars.push(
      `<circle ${attrs({
        cx: random() * TILE,
        cy: random() * TILE,
        r: 0.35 + random() * 0.35,
        fill: color,
        "fill-opacity": 0.5 + random() * 0.4,
      })}/>`,
    );
  }
  return `<pattern ${attrs({ id, patternUnits: "userSpaceOnUse", width: TILE, height: TILE })}>${stars.join("")}</pattern>`;
}

function sky({ scene, mode }: FrameContext) {
  return mode === "light" && scene.windows.some((window) => !window.frame) ? LIGHT_SKY : SKY;
}

function windowFill({ scene, mode }: FrameContext): string {
  // Without the sky, the window is opaque
  return scene.background ? COLORS[mode].window : COLORS[mode].opaqueWindow;
}

/** A rectangle with round top corners, for the title bar of a window with round corners */
function topRoundedRect(window: WindowBox, height: number, fill: string): string {
  const { x, y, width } = window;
  const r = Math.min(window.radius, height);
  return `<path ${attrs({
    d: `M${round(x)} ${round(y + height)}V${round(y + r)}A${r} ${r} 0 0 1 ${round(x + r)} ${round(y)}H${round(x + width - r)}A${r} ${r} 0 0 1 ${round(x + width)} ${round(y + r)}V${round(y + height)}Z`,
    fill,
  })}/>`;
}

/**
 * The frame of Gemini in ray.so: a night sky with small stars, and a window with round corners and
 * a soft shadow. The title bar shows the file name at the left, as an active tab with a line below.
 */
export const frame: FrameOverrides = {
  radius: RADIUS,
  titleBar: {
    paddingTop: 0,
    rowHeight: HEADER_HEIGHT,
    paddingBottom: 0,
    tabsGap: 0,
    paddingX: 16,
    controls: false,
    align: "left",
    fontSize: TITLE_SIZE,
    fontWeight: 500,
    letterSpacing: LETTER_SPACING,
  },
  colors: {
    dark: {
      background: COLORS.dark.window,
      title: COLORS.dark.title,
      highlightBorder: "transparent",
      shadowBorder: "transparent",
    },
    light: {
      background: COLORS.light.window,
      title: COLORS.light.title,
      highlightBorder: "transparent",
      shadowBorder: "transparent",
    },
  },
  base: (context) => sky(context).color,
  background: (context) => {
    const { width, height } = context.scene;
    const { color, star } = sky(context);
    const stars = context.id("stars");
    return `<defs>${starTile(stars, star)}</defs><rect width="${width}" height="${height}" fill="${color}"/><rect width="${width}" height="${height}" fill="url(#${stars})" opacity="0.8"/>`;
  },
  behind: (context, window) =>
    window.frame
      ? boxShadow(context, window, [
          { y: 4, blur: 24, color: "black", opacity: COLORS[context.mode].shadow },
        ])
      : "",
  body: (context, window) => roundedRect(window, RADIUS, { fill: windowFill(context) }),
  header: (context, window) => {
    const header = window.header;
    const bar = window.titleBar;
    if (!header || !bar) return "";
    const color = COLORS[context.mode].title;
    const out = [
      topRoundedRect({ ...window, ...header }, header.height, COLORS[context.mode].header),
    ];
    if (window.title) {
      const width = measureUiText(window.title, TITLE_SIZE) + LETTER_SPACING * window.title.length;
      const x = bar.title.x;
      out.push(titleBarText(context, window, { title: color }));
      const bottom = header.y + header.height;
      const r = UNDERLINE;
      out.push(
        `<path ${attrs({
          d: `M${round(x)} ${round(bottom)}V${round(bottom - UNDERLINE + r)}A${r} ${r} 0 0 1 ${round(x + r)} ${round(bottom - UNDERLINE)}H${round(x + width - r)}A${r} ${r} 0 0 1 ${round(x + width)} ${round(bottom - UNDERLINE + r)}V${round(bottom)}Z`,
          fill: color,
        })}/>`,
      );
    }
    return out.join("");
  },
  border: () => "",
};
