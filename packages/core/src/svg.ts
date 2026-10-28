import { bytesToBase64 } from "./base64.ts";
import { type Font, UI_FONT } from "./fonts/index.ts";
import { attrs, blend, escapeXml, round, roundedRect, textAttrs } from "./frames/draw.ts";
import { type FrameContext, getFrame } from "./frames/index.ts";
import type { HighlightedLine } from "./highlight/index.ts";
import type { Icon } from "./icons/index.ts";
import {
  type AnnotationBox,
  cellCount,
  type PaneBox,
  POPOVER,
  type Scene,
  TAB_HEADER,
  type TextMetrics,
  type WindowBox,
} from "./layout.ts";
import { type ImageMetadata, svgMetadata } from "./metadata.ts";

export type SvgOptions = {
  /**
   * Font files to embed as @font-face rules, by their path relative to the fonts directory.
   * Embedded fonts make the SVG look right in any viewer. resvg ignores them and uses its own font buffers.
   */
  embedFonts?: Map<string, Uint8Array>;
  /** Writes a metadata element with the spec and the editor link. false or no value writes none. */
  metadata?: ImageMetadata | false;
};

function fontFaceRules(font: Font, files: Map<string, Uint8Array>): string {
  return font.faces
    .filter((face) => files.has(face.file))
    .map((face) => {
      const data = bytesToBase64(files.get(face.file)!);
      const style = face.italic ? "italic" : "normal";
      return `@font-face{font-family:ci-${font.id};font-weight:${face.weight};font-style:${style};src:url(data:font/ttf;base64,${data}) format("truetype")}`;
    })
    .join("");
}

/**
 * Writes one line of code. Every visible character gets its own x position on the cell grid,
 * so the layout does not depend on how a renderer shapes or spaces the text. Wide and astral
 * characters get their own element, because some renderers count x positions per UTF-16 unit.
 */
function renderLine(
  scene: Scene,
  line: HighlightedLine,
  origin: { x: number; y: number },
  text: TextMetrics,
  out: Array<string>,
) {
  const { cellWidth, baseline, fontSize } = text;
  const y = origin.y + baseline;
  let column = 0;

  for (const token of line) {
    const xs: Array<number> = [];
    let content = "";
    const start = column;
    // The fill of a mark is behind the text, over the full height of the line
    if (token.background) {
      let cells = 0;
      for (const char of token.content) cells += cellCount(char);
      out.push(
        roundedRect(
          {
            x: origin.x + start * cellWidth,
            y: origin.y,
            width: cells * cellWidth,
            height: text.lineHeight,
          },
          0,
          { fill: token.background },
        ),
      );
    }
    const flush = () => {
      if (!content) return;
      const style = textAttrs(scene.font, token, fontSize);
      out.push(
        `<text ${attrs({ x: xs.map(round).join(" "), y, fill: token.color, ...style })}>${escapeXml(content)}</text>`,
      );
      xs.length = 0;
      content = "";
    };

    for (const char of token.content) {
      const cells = cellCount(char);
      const x = origin.x + column * cellWidth;
      column += cells;
      if (char === " ") continue;
      if (cells > 1 || char.length > 1) {
        flush();
        xs.push(x);
        content = char;
        flush();
        continue;
      }
      xs.push(x);
      content += char;
    }
    flush();

    // Lines are rectangles, because renderers draw text-decoration in different places
    const thickness = Math.max(1, fontSize / 15);
    const x = origin.x + start * cellWidth;
    const width = (column - start) * cellWidth;
    if (token.underline) {
      const top = y + fontSize * 0.16;
      out.push(roundedRect({ x, y: top, width, height: thickness }, 0, { fill: token.color }));
    }
    if (token.strikethrough) {
      const top = y - fontSize * 0.3 - thickness / 2;
      out.push(roundedRect({ x, y: top, width, height: thickness }, 0, { fill: token.color }));
    }
  }
}

function renderPane(scene: Scene, pane: PaneBox, id: string, out: Array<string>) {
  const { lineHeight, fontSize, baseline } = scene.text;
  const top = pane.code.y + 16;

  // A pane smaller than its code cuts the code off at its edges
  if (pane.clipped) {
    out.push(`<clipPath id="${id}">${roundedRect(pane.code, 0)}</clipPath>`);
    out.push(`<g clip-path="url(#${id})">`);
  }

  for (const line of pane.highlighted) {
    if (line < 1 || line > pane.lines.length) continue;
    const y = top + (line - 1) * lineHeight;
    out.push(
      roundedRect({ x: pane.code.x, y, width: pane.code.width, height: lineHeight }, 0, {
        fill: scene.frame.highlight,
      }),
    );
    out.push(
      roundedRect({ x: pane.code.x, y, width: 2, height: lineHeight }, 0, {
        fill: scene.frame.highlightBorderLine,
      }),
    );
  }

  if (pane.lineNumbers) {
    // Right aligned 18px before the code, as the ray.so line number gutter
    const x = pane.code.x + pane.gutter - 18;
    const style = textAttrs(scene.font, {}, fontSize);
    pane.lines.forEach((_, index) => {
      out.push(
        `<text ${attrs({ x, y: top + index * lineHeight + baseline, fill: scene.frame.lineNumber, "text-anchor": "end", ...style })}>${index + 1}</text>`,
      );
    });
  }

  pane.lines.forEach((line, index) => {
    const origin = { x: pane.code.x + pane.gutter, y: top + index * lineHeight };
    renderLine(scene, line, origin, scene.text, out);
  });

  // The underline of an annotation anchor, at the bottom of its line
  for (const { anchor } of pane.annotations) {
    out.push(
      roundedRect({ x: anchor.x, y: anchor.y - 2, width: anchor.width, height: 2 }, 1, {
        fill: scene.syntax.keyword ?? scene.syntax.foreground,
      }),
    );
  }
  if (pane.clipped) out.push("</g>");

  if (pane.tab) {
    const { tab } = pane;
    let x = tab.x + TAB_HEADER.paddingX;
    if (pane.icon) {
      const y = tab.y + (tab.height - TAB_HEADER.icon) / 2;
      out.push(renderIcon(pane.icon, x, y, TAB_HEADER.icon, scene.frame.title));
      x += TAB_HEADER.icon + TAB_HEADER.iconGap;
    }
    if (pane.title) {
      const style = textAttrs(UI_FONT, {}, TAB_HEADER.titleSize);
      out.push(
        `<text ${attrs({ x, y: tab.y + tab.height / 2, fill: scene.frame.title, "dominant-baseline": "central", ...style })}>${escapeXml(pane.title)}</text>`,
      );
    }
    out.push(
      `<line ${attrs({ x1: tab.x, y1: tab.y + tab.height - 0.5, x2: tab.x + tab.width, y2: tab.y + tab.height - 0.5, stroke: scene.frame.divider })}/>`,
    );
  }
}

function renderIcon(icon: Icon, x: number, y: number, size: number, color: string): string {
  const transform = `translate(${round(x)} ${round(y)}) scale(${round(size / 24)})`;
  const paint =
    icon.style === "fill"
      ? { fill: color }
      : {
          fill: "none",
          stroke: color,
          "stroke-width": 2,
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
        };
  return `<g ${attrs({ transform, ...paint })}>${icon.body}</g>`;
}

function renderWindow(context: FrameContext, window: WindowBox, index: number, out: Array<string>) {
  const { scene } = context;
  const frame = getFrame(scene.theme.id);

  // A window-less group shows only the code
  if (!window.frame) {
    window.panes.forEach((pane, i) => renderPane(scene, pane, `pane-${index}-${i}`, out));
    return;
  }

  out.push(frame.body(context, window));
  out.push(`<g clip-path="url(#window-${index})">`);
  if (window.header) out.push(frame.header(context, window));

  window.panes.forEach((pane, i) => renderPane(scene, pane, `pane-${index}-${i}`, out));
  if (window.header && window.panes.some((pane) => pane.tab)) {
    const y = window.header.y + window.header.height - 0.5;
    out.push(
      `<line ${attrs({ x1: window.header.x, y1: y, x2: window.header.x + window.header.width, y2: y, stroke: scene.frame.divider })}/>`,
    );
  }
  for (const divider of window.dividers)
    out.push(`<line ${attrs({ ...divider, stroke: scene.frame.divider })}/>`);
  out.push("</g>");
  out.push(frame.border(context, window));
}

function renderPopover(
  context: FrameContext,
  annotation: AnnotationBox,
  id: string,
  out: Array<string>,
) {
  const { scene } = context;
  const { box, lines } = annotation;
  const { frame, mode } = scene;
  // The popover is opaque, so it takes the color that the translucent window has over the background
  const below = !scene.background
    ? mode === "dark"
      ? "#000000"
      : "#ffffff"
    : getFrame(scene.theme.id).base(context);

  out.push(
    roundedRect({ ...box, y: box.y + 8 }, POPOVER.radius, {
      fill: "black",
      "fill-opacity": 0.25,
      filter: "url(#popover-shadow)",
    }),
  );
  out.push(
    roundedRect(box, POPOVER.radius, {
      fill: blend(frame.background, below),
      stroke: frame.divider,
      "stroke-width": 1,
    }),
  );
  // A popover smaller than its code cuts the code off at its edges
  if (annotation.clipped) {
    out.push(`<clipPath id="${id}">${roundedRect(box, POPOVER.radius)}</clipPath>`);
    out.push(`<g clip-path="url(#${id})">`);
  }
  lines.forEach((line, index) => {
    const origin = {
      x: box.x + POPOVER.paddingX,
      y: box.y + POPOVER.paddingY + index * POPOVER.lineHeight,
    };
    renderLine(scene, line, origin, scene.popoverText, out);
  });
  if (annotation.clipped) out.push("</g>");
}

/** Writes the scene as a standalone SVG document */
export function toSvg(scene: Scene, options: SvgOptions = {}): string {
  const { width, height, windows } = scene;
  const defs: Array<string> = [];
  const body: Array<string> = [];
  const frame = getFrame(scene.theme.id);
  const used = new Set<string>();
  const context: FrameContext = {
    scene,
    mode: scene.mode,
    id: (name) => {
      const base = `frame-${name.replace(/[^\w-]/g, "_")}`;
      let id = base;
      for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
      used.add(id);
      return id;
    },
  };

  if (options.embedFonts) {
    defs.push(
      `<style>${fontFaceRules(scene.font, options.embedFonts)}${fontFaceRules(UI_FONT, options.embedFonts)}</style>`,
    );
  }

  windows.forEach((window, index) => {
    defs.push(`<clipPath id="window-${index}">${roundedRect(window, window.radius)}</clipPath>`);
  });

  if (scene.background) {
    body.push(frame.background(context));
    for (const window of windows) body.push(frame.behind(context, window));
  }

  windows.forEach((window, index) => renderWindow(context, window, index, body));

  const annotations = windows.flatMap((window) => window.panes.flatMap((pane) => pane.annotations));
  if (annotations.length > 0) {
    defs.push(
      '<filter id="popover-shadow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="12"/></filter>',
    );
    annotations.forEach((annotation, index) =>
      renderPopover(context, annotation, `popover-${index}`, body),
    );
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    ...(options.metadata ? [svgMetadata(options.metadata)] : []),
    `<defs>${defs.join("")}</defs>`,
    ...body.filter(Boolean),
    "</svg>",
  ].join("\n");
}
