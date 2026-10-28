import type { WindowBox } from "../layout.ts";
import { boxShadow, type ShadowLayer, windowControls, titleBarText } from "./default.ts";
import { attrs, radialGradient, roundedRect } from "./draw.ts";
import type { FrameContext, FrameOverrides } from "./types.ts";

type Mode = "dark" | "light";

const COLORS = {
  dark: {
    background: "#222222",
    shell: "#111111",
    card: "#191919",
    highlight: "rgba(255, 255, 255, 0.03)",
  },
  light: {
    background: "#f9f9f9",
    shell: "#f8f8f8",
    card: "#ffffff",
    highlight: "rgba(255, 255, 255, 0.8)",
  },
};

// Shadows as offset y, blur radius, spread and opacity of black
type Shadow = [number, number, number, number];

// The rings and the shadow of the outer window
const SHELL_SHADOWS: Record<Mode, Array<Shadow>> = {
  dark: [
    [0, 0, 6, 0.08],
    [72, 29, 0, 0.02],
    [41, 24, 0, 0.07],
    [18, 18, 0, 0.11],
    [5, 10, 0, 0.13],
    [0, 0, 1, 0.35],
  ],
  light: [
    [0, 0, 8, 0.02],
    [72, 29, 0, 0.01],
    [41, 24, 0, 0.02],
    [18, 18, 0, 0.04],
    [5, 10, 0, 0.04],
    [0, 0, 1, 0.04],
  ],
};

// The ring and the shadow of the inner card with the code
const CARD_SHADOWS: Record<Mode, Array<Shadow>> = {
  dark: [
    [14, 6, 0, 0.04],
    [8, 5, 0, 0.12],
    [3, 3, 0, 0.2],
    [1, 2, 0, 0.23],
    [0, 0, 1, 0.08],
  ],
  light: [
    [14, 6, 0, 0.01],
    [8, 5, 0, 0.03],
    [3, 3, 0, 0.05],
    [1, 2, 0, 0.06],
    [0, 0, 1, 0.02],
  ],
};

const layers = (shadows: Array<Shadow>): Array<ShadowLayer> =>
  shadows.map(([y, blur, spread, opacity]) => ({ y, blur, spread, color: "black", opacity }));

// Space between the outer window and the card with the code
const INSET = 3;
const CARD_RADIUS = 5;

/**
 * The opacity of each square of the dot pattern, row by row: 1 is 0.1, 9 is 1, and the other
 * digits are tenths.
 */
const DOTS = [
  "132238288218",
  "555353532315",
  "915532532512",
  "285935259395",
  "991133193115",
  "515533253258",
  "815513593583",
  "855335888335",
  "533135135533",
  "251151125135",
  "535858335391",
  "152535555995",
];
// Size of the tile of the pattern, and the step between two squares
const TILE = 48;
const STEP = 4;
// The second half of the pattern is the same tile, moved by this offset
const SHIFT = { x: 40, y: 16 };
// Height of the band with the pattern at the bottom of the image
const BAND = 128;

function dotTile(): string {
  const out: Array<string> = [];
  DOTS.forEach((row, j) => {
    row.split("").forEach((digit, i) => {
      const opacity = digit === "9" ? 1 : Number(digit) / 10;
      for (const [x, y] of [
        [i * STEP, j * STEP],
        [TILE + ((i * STEP + SHIFT.x) % TILE), (j * STEP + SHIFT.y) % TILE],
      ] as const) {
        out.push(`<rect ${attrs({ x, y, width: 2, height: 2, "fill-opacity": opacity })}/>`);
      }
    });
  });
  return out.join("");
}

const TILE_RECTS = dotTile();

// The card with the code: all panes, with their tabs, below the title bar
function cardOf(window: WindowBox): WindowBox {
  const top = window.header ? window.header.y + window.header.height : window.y + INSET;
  return {
    ...window,
    x: window.x + INSET,
    y: top,
    width: window.width - INSET * 2,
    height: window.y + window.height - INSET - top,
    radius: CARD_RADIUS,
  };
}

/**
 * The frame of Clerk in ray.so: a gray background with a band of dots at the bottom that fades
 * out at the sides, and a dark window that holds a card with the code. The title bar is in the
 * window, above the card.
 */
export const frame: FrameOverrides = {
  radius: 8,
  inset: INSET,
  titleBar: {
    paddingTop: 7,
    paddingBottom: 6,
    tabsGap: 0,
    paddingX: 20 - INSET,
  },
  colors: {
    dark: {
      background: COLORS.dark.shell,
      control: "rgba(255, 255, 255, 0.12)",
      title: "rgba(255, 255, 255, 0.5)",
      divider: "rgba(255, 255, 255, 0.06)",
      lineNumber: "#484848",
      highlightBorder: "transparent",
      shadowBorder: "transparent",
    },
    light: {
      background: COLORS.light.shell,
      control: "rgba(0, 0, 0, 0.12)",
      title: "rgba(0, 0, 0, 0.5)",
      divider: "rgba(0, 0, 0, 0.06)",
      lineNumber: "#c9c9c9",
      highlightBorder: "transparent",
      shadowBorder: "transparent",
    },
  },
  base: ({ mode }) => COLORS[mode].background,
  background: (context: FrameContext) => {
    const { scene, mode } = context;
    const pattern = context.id("dots");
    const fade = context.id("dots-fade");
    const mask = context.id("dots-mask");
    const left = -32;
    const top = scene.height - BAND;
    const width = scene.width + 64;
    return [
      `<defs>`,
      `<pattern ${attrs({ id: pattern, patternUnits: "userSpaceOnUse", x: left, y: top, width: TILE * 2, height: TILE })}>${TILE_RECTS}</pattern>`,
      radialGradient(fade, { x: scene.width / 2, y: scene.height }, { x: width / 2, y: BAND }, [
        [0, "#ffffff"],
        [1, "#000000"],
      ]),
      `<mask ${attrs({ id: mask, maskUnits: "userSpaceOnUse", x: left, y: top, width, height: BAND })}><rect ${attrs({ x: left, y: top, width, height: BAND, fill: `url(#${fade})` })}/></mask>`,
      `</defs>`,
      `<rect width="${scene.width}" height="${scene.height}" fill="${COLORS[mode].background}"/>`,
      `<rect ${attrs({ x: left, y: top, width, height: BAND, fill: `url(#${pattern})`, mask: `url(#${mask})`, opacity: mode === "light" ? 0.2 : undefined })}/>`,
    ].join("");
  },
  behind: (context, window) =>
    window.frame ? boxShadow(context, window, layers(SHELL_SHADOWS[context.mode])) : "",
  body: (context, window) => {
    const style = COLORS[context.mode];
    const card = cardOf(window);
    const r = window.radius;
    return [
      roundedRect(window, r, { fill: style.shell }),
      // A thin light line inside the top edge of the window
      `<path ${attrs({ d: `M${window.x + r} ${window.y + 0.5}H${window.x + window.width - r}`, stroke: style.highlight })}/>`,
      boxShadow(context, card, layers(CARD_SHADOWS[context.mode])),
      roundedRect(card, CARD_RADIUS, { fill: style.card }),
    ].join("");
  },
  header: (context, window) =>
    windowControls(window, context.scene.frame.control) +
    titleBarText(context, window, { title: context.scene.frame.title }),
  border: () => "",
};
