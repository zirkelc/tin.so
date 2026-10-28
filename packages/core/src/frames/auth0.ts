import type { WindowBox } from "../layout.ts";
import { UI_FONT } from "../fonts/index.ts";
import { boxShadow } from "./default.ts";
import { attrs, inflate, linearGradient, roundedRect, text } from "./draw.ts";
import type { FrameContext, FrameOverrides } from "./types.ts";

const STYLES = {
  dark: {
    backdrop: [
      [0.3, "#191919"],
      [0.6, "#4612a7"],
      [1, "#375aed"],
    ] as Array<[number, string]>,
    shell: "rgb(17, 18, 23)",
    control: "#373737",
    badge: "#dedede",
    runtime: "#727272",
    gridline: "rgba(255, 255, 255, 0.12)",
    // The surface of the code: a light shine at the top over a solid color
    window: "#171717",
    shine: ["rgba(255, 255, 255, 0.025)", "rgba(255, 255, 255, 0)"],
    ring: "rgba(255, 255, 255, 0.1)",
    lineNumber: "#636d83",
  },
  light: {
    backdrop: [
      [0.08, "#f7f6ff"],
      [0.48, "#efe8ff"],
      [1, "#e5eeff"],
    ] as Array<[number, string]>,
    shell: "rgba(255, 255, 255, 0.78)",
    control: "#9e9e9e",
    badge: "#2a2c36",
    runtime: "#7a8092",
    gridline: "rgba(42, 44, 54, 0.12)",
    window: "#ffffff",
    shine: ["#ffffff", "rgba(245, 243, 241, 0.5)"],
    ring: "rgba(124, 92, 224, 0.1)",
    lineNumber: "#9aa4bd",
  },
};

// Space between the edge of the outer shell and the window of the code
const INSET = 4;
// The size of the window controls, and the space between them
const CONTROL = 12;
const CONTROL_GAP = 8;
// The space at the left and the right of the toolbar
const TOOLBAR_LEFT = 16;
const TOOLBAR_RIGHT = 20;
// The space after the column of the controls
const COLUMN_GAP = 8;
// How far the grid lines go past the shell, and the length of their fade
const OVERHANG = 48;

const CONTROL_COLORS = ["#ff5f57", "#febc2e", "#28c840"];

/** The inner window that holds the code, below the toolbar */
function codeWindow(window: WindowBox) {
  const top = window.header ? window.header.y + window.header.height : window.y + INSET;
  return {
    x: window.x + INSET,
    y: top,
    width: Math.max(0, window.width - INSET * 2),
    height: Math.max(0, window.y + window.height - INSET - top),
  };
}

/** Grid lines along the edges of the shell, which fade out at both ends */
function gridlines(context: FrameContext, window: WindowBox): string {
  const style = STYLES[context.mode];
  const horizontal = context.id("auth0-fade-x");
  const vertical = context.id("auth0-fade-y");
  const left = window.x - OVERHANG;
  const right = window.x + window.width + OVERHANG;
  const top = window.y - OVERHANG;
  const bottom = window.y + window.height + OVERHANG;
  const fade = (length: number): Array<[number, string]> => {
    const edge = Math.min(0.5, OVERHANG / length);
    return [
      [0, "rgba(0, 0, 0, 0)"],
      [edge, style.gridline],
      [1 - edge, style.gridline],
      [1, "rgba(0, 0, 0, 0)"],
    ];
  };
  const gradient = (id: string, x1: number, y1: number, x2: number, y2: number, length: number) =>
    `<linearGradient ${attrs({ id, gradientUnits: "userSpaceOnUse", x1, y1, x2, y2 })}>${fade(
      length,
    )
      .map(([offset, color]) => `<stop ${attrs({ offset, "stop-color": color })}/>`)
      .join("")}</linearGradient>`;
  const defs =
    gradient(horizontal, left, 0, right, 0, right - left) +
    gradient(vertical, 0, top, 0, bottom, bottom - top);
  // Each line is 1px wide, just outside of the shell
  const rows = [window.y - 1, window.y + window.height].map((y) =>
    roundedRect({ x: left, y, width: right - left, height: 1 }, 0, { fill: `url(#${horizontal})` }),
  );
  const columns = [window.x - 1, window.x + window.width].map((x) =>
    roundedRect({ x, y: top, width: 1, height: bottom - top }, 0, { fill: `url(#${vertical})` }),
  );
  return `<defs>${defs}</defs>${rows.join("")}${columns.join("")}`;
}

/**
 * The frame of Auth0 in ray.so: a purple and blue gradient, and a rounded shell with a toolbar
 * (controls, file name and language) around a second window that holds the code. Grid lines that
 * fade out at their ends go along the edges of the shell.
 */
export const frame: FrameOverrides = {
  radius: 14,
  inset: INSET,
  titleBar: {
    paddingTop: 4,
    rowHeight: 24,
    paddingBottom: 8,
    tabsGap: 0,
    paddingX: TOOLBAR_LEFT,
    controls: true,
    // The column of the controls has the width of the default controls, so only the gap differs
    titleGap: COLUMN_GAP,
    align: "left",
    font: "ui",
    fontSize: 16,
    fontWeight: 500,
    letterSpacing: 0,
    language: true,
    languageSize: 12,
  },
  colors: {
    dark: {
      background: STYLES.dark.window,
      title: STYLES.dark.badge,
      control: STYLES.dark.control,
      divider: STYLES.dark.ring,
      highlightBorder: "transparent",
      shadowBorder: "transparent",
      lineNumber: STYLES.dark.lineNumber,
    },
    light: {
      background: STYLES.light.window,
      title: STYLES.light.badge,
      control: STYLES.light.control,
      divider: STYLES.light.ring,
      highlightBorder: "transparent",
      shadowBorder: "transparent",
      lineNumber: STYLES.light.lineNumber,
    },
  },
  base: ({ mode }) => STYLES[mode].window,
  background: (context) => {
    const { scene } = context;
    const id = context.id("auth0-backdrop");
    const box = { x: 0, y: 0, width: scene.width, height: scene.height };
    return `<defs>${linearGradient(id, 215, box, STYLES[context.mode].backdrop)}</defs><rect width="${scene.width}" height="${scene.height}" fill="url(#${id})"/>`;
  },
  behind: (context, window) => {
    const shadow =
      window.frame && context.mode === "light"
        ? boxShadow(context, window, [{ y: 12, blur: 30, color: "rgb(46, 52, 89)", opacity: 0.1 }])
        : "";
    return shadow + gridlines(context, window);
  },
  body: (context, window) => {
    const style = STYLES[context.mode];
    const inner = codeWindow(window);
    const shine = context.id("auth0-shine");
    // The shine ends at 15% of the height of the window of the code
    const gradient = `<linearGradient ${attrs({ id: shine, gradientUnits: "userSpaceOnUse", x1: 0, y1: inner.y, x2: 0, y2: inner.y + inner.height * 0.15 })}><stop offset="0" stop-color="${style.shine[0]}"/><stop offset="1" stop-color="${style.shine[1]}"/></linearGradient>`;
    const out = [
      `<defs>${gradient}</defs>`,
      roundedRect(window, window.radius, { fill: style.shell }),
    ];
    if (context.mode === "light")
      out.push(
        roundedRect(inflate(window, 0.5), window.radius + 0.5, {
          fill: "none",
          stroke: style.ring,
        }),
      );
    out.push(
      roundedRect(inner, 10, { fill: style.window }),
      roundedRect(inner, 10, { fill: `url(#${shine})` }),
      roundedRect(inflate(inner, 0.5), 10.5, { fill: "none", stroke: style.ring }),
    );
    return out.join("");
  },
  header: (context, window) => {
    const style = STYLES[context.mode];
    const header = window.header!;
    const bar = window.titleBar!;
    const cy = bar.title.y + bar.title.height / 2;
    const left = header.x + TOOLBAR_LEFT;
    const out: Array<string> = [];
    if (bar.controls)
      for (let i = 0; i < 3; i++) {
        const fill = window.controls === "color" ? CONTROL_COLORS[i]! : style.control;
        const cx = left + CONTROL / 2 + i * (CONTROL + CONTROL_GAP);
        out.push(`<circle ${attrs({ cx, cy, r: CONTROL / 2, fill })}/>`);
      }
    if (window.title)
      out.push(
        text(window.title, bar.title.x, cy, {
          font: UI_FONT,
          size: bar.fontSize,
          weight: bar.fontWeight,
          color: style.badge,
        }),
      );
    if (bar.language)
      out.push(
        text(bar.language.text, header.x + header.width - TOOLBAR_RIGHT, cy, {
          font: UI_FONT,
          size: bar.language.size,
          weight: 500,
          color: style.runtime,
          anchor: "end",
        }),
      );
    return out.join("");
  },
  border: () => "",
};
