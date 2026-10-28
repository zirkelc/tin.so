import { eastAsianWidth } from "get-east-asian-width";
import {
  type CodeFont,
  DEFAULT_CODE_FONT,
  CODE_FONT_IDS,
  getCodeFont,
  measureUiText,
} from "./fonts/index.ts";
import { type Icon, resolveIcon } from "./icons/index.ts";
import { type Frame, getFrame } from "./frames/index.ts";
import { MAC_HEADER } from "./sizes.ts";
import {
  highlight,
  type HighlightedLine,
  inferLanguage,
  languageName,
  resolveLanguage,
} from "./highlight/index.ts";
import {
  type AnnotationSpec,
  expandLineRanges,
  type MarkSpec,
  parseSpec,
  type PaneSpec,
  type Spec,
  SPEC_LIMITS,
  SpecError,
  type WindowSpec,
} from "./spec.ts";
import {
  type FrameColors,
  getFrameColors,
  getSyntax,
  getTheme,
  type Mode,
  resolveMode,
  type Syntax,
  type Theme,
} from "./themes/index.ts";

// Sizes in CSS pixels, taken from the ray.so editor and default frame
export const FONT_SIZE = 15;
export const LINE_HEIGHT = 22.5;
const LETTER_SPACING = 0.1;
const TAB_SIZE = 2;
const EDITOR_PADDING = 16;
const LINE_NUMBER_GUTTER = 48;
const LINE_NUMBER_GUTTER_LARGE = 56;
const MIN_FRAME_WIDTH = 520;

export const WINDOW_RADIUS = 18;
export { MAC_HEADER };
export const TAB_HEADER = { height: 40, paddingX: 16, icon: 14, iconGap: 8, titleSize: 13 };
const DIVIDER = 1;

// The popover of an annotation, as in the hover cards of an editor
export const POPOVER = {
  fontSize: 13,
  lineHeight: 20,
  paddingX: 18,
  paddingY: 14,
  radius: 12,
  offset: 6,
};

export type Rect = { x: number; y: number; width: number; height: number };

export type TextMetrics = {
  fontSize: number;
  lineHeight: number;
  cellWidth: number;
  /** Distance from the top of a line to the baseline */
  baseline: number;
};

export type AnnotationBox = {
  /** The text that the annotation points to, below which the underline goes */
  anchor: { x: number; y: number; width: number };
  box: Rect;
  lines: Array<HighlightedLine>;
  /** true when the popover is smaller than its code, so that it must cut the code off */
  clipped: boolean;
};

export type PaneBox = Rect & {
  title?: string;
  language: string;
  /** The icon in the tab, or undefined for no icon */
  icon?: Icon;
  /** The tab header of the pane, only in a window with tabs */
  tab?: Rect;
  /** The code area, below the tab header */
  code: Rect;
  /** Distance from the left edge of the code area to the first column */
  gutter: number;
  lineNumbers: boolean;
  highlighted: Set<number>;
  lines: Array<HighlightedLine>;
  annotations: Array<AnnotationBox>;
  /** true when the code is larger than the pane, so that the pane must cut it off */
  clipped: boolean;
};

/** The places of the parts of a title bar, from the title bar style of the frame */
export type TitleBarBox = {
  /** The box of the three window controls, when the title bar has them */
  controls?: Rect;
  /** The box of the title text */
  title: Rect;
  align: "center" | "left";
  font: "ui" | "code";
  fontSize: number;
  fontWeight: number;
  letterSpacing: number;
  /** The name of the language at the right, with the right edge of its text */
  language?: { text: string; x: number; y: number; size: number };
};

export type WindowBox = Rect & {
  /** false for a window-less pane group: only the code, without background, border and headers */
  frame: boolean;
  /** Corner radius of the window, from the frame of the theme */
  radius: number;
  title?: string;
  controls: "gray" | "color";
  /** The size that fits the panes. The layout can make a window larger to fill the image. */
  natural: { width: number; height: number };
  /** The title bar with the window controls, only in a window with a title bar */
  header?: Rect;
  titleBar?: TitleBarBox;
  panes: Array<PaneBox>;
  dividers: Array<{ x1: number; y1: number; x2: number; y2: number }>;
};

export type Scene = {
  width: number;
  height: number;
  theme: Theme;
  mode: Mode;
  syntax: Syntax;
  frame: FrameColors;
  background: boolean;
  font: CodeFont;
  text: TextMetrics;
  popoverText: TextMetrics;
  windows: Array<WindowBox>;
};

/** Number of terminal cells of a character: 2 for wide characters such as CJK and most emoji */
export function cellCount(char: string): number {
  return eastAsianWidth(char.codePointAt(0)!);
}

export type LayoutOptions = {
  /**
   * Keeps the empty lines at the end of the code. An editor needs them, so that a new line shows
   * at once. Without it, the code loses them, as a file loses its last line break.
   */
  keepTrailingLines?: boolean;
};

/** Replaces tabs with spaces up to the next tab stop, and removes trailing empty lines unless kept */
export function normalizeCode(code: string, options: LayoutOptions = {}): string {
  const lines = code.replace(/\r\n?/g, "\n");
  return (options.keepTrailingLines ? lines : lines.replace(/\s+$/, ""))
    .split("\n")
    .map((line) => {
      let result = "";
      let column = 0;
      for (const char of line) {
        if (char === "\t") {
          const spaces = TAB_SIZE - (column % TAB_SIZE);
          result += " ".repeat(spaces);
          column += spaces;
        } else {
          result += char;
          column += cellCount(char);
        }
      }
      return result;
    })
    .join("\n");
}

function lineCells(line: HighlightedLine): number {
  let cells = 0;
  for (const token of line) for (const char of token.content) cells += cellCount(char);
  return cells;
}

function lineText(line: HighlightedLine): string {
  return line.map((token) => token.content).join("");
}

function textCells(text: string): number {
  let cells = 0;
  for (const char of text) cells += cellCount(char);
  return cells;
}

function textMetrics(font: CodeFont, fontSize: number, lineHeight: number): TextMetrics {
  const { unitsPerEm, ascender, descender, advance } = font.metrics;
  const scale = fontSize / unitsPerEm;
  return {
    fontSize,
    lineHeight,
    cellWidth: advance * scale + LETTER_SPACING * (fontSize / FONT_SIZE),
    // CSS centers the font box (ascender to descender) inside the line box
    baseline: (lineHeight - (ascender - descender) * scale) / 2 + ascender * scale,
  };
}

function resolveFont(spec: Spec, theme: Theme): CodeFont {
  // A theme can name a font that is not bundled (ray.so uses the commercial Söhne Mono)
  const id =
    spec.font ??
    (theme.font && CODE_FONT_IDS.includes(theme.font) ? theme.font : DEFAULT_CODE_FONT);
  return getCodeFont(id);
}

type Size = { width: number; height: number };

type AnnotationDraft = {
  line: number;
  column: number;
  cells: number;
  lines: Array<HighlightedLine>;
  /** The size that fits the code */
  natural: Size;
  size: Size;
  offset: { x: number; y: number };
};

type PaneDraft = Omit<PaneBox, keyof Rect | "code" | "tab" | "annotations" | "clipped"> & {
  natural: Size;
  /** The size along the split of the window, when the spec sets it */
  size?: number;
  codeSize: Size;
  tabbed: boolean;
  annotations: Array<AnnotationDraft>;
};

type SceneBase = Omit<Scene, "windows" | "width" | "height">;

type WindowDraft = {
  spec: WindowSpec;
  frame: Frame;
  title?: string;
  headerHeight: number;
  panes: Array<PaneDraft>;
  natural: Size;
};

/** Finds the start of a match in a line, as an index in the line text */
function findMatch(
  lines: Array<HighlightedLine>,
  target: { line: number; match: string; occurrence: number },
  path: string,
): { text: string; index: number } {
  const line = lines[target.line - 1];
  if (!line) throw new SpecError([`${path}.line: the pane has no line ${target.line}`]);

  const text = lineText(line);
  let index = -1;
  for (let found = 0; found < target.occurrence; found++) {
    index = text.indexOf(target.match, index + 1);
    if (index === -1) {
      throw new SpecError([
        `${path}.match: "${target.match}" (occurrence ${target.occurrence}) is not in line ${target.line}: ${text.trim()}`,
      ]);
    }
  }
  return { text, index };
}

const MARK_FLAGS = {
  strong: "bold",
  emphasis: "italic",
  underline: "underline",
  strikethrough: "strikethrough",
} as const;

/** Splits the tokens at the edges of the marks and sets the style and the colors of the marked tokens */
function applyMarks(
  lines: Array<HighlightedLine>,
  marks: Array<MarkSpec>,
  path: string,
): Array<HighlightedLine> {
  const ranges = marks.map((mark, index) => {
    const { index: start } = findMatch(lines, mark, `${path}.marks.${index}`);
    return { ...mark, start, end: start + mark.match.length };
  });

  return lines.map((line, lineIndex) => {
    const own = ranges.filter((range) => range.line === lineIndex + 1);
    if (own.length === 0) return line;

    const result: HighlightedLine = [];
    let offset = 0;
    for (const token of line) {
      const end = offset + token.content.length;
      const cuts = new Set([offset, end]);
      for (const range of own) {
        if (range.start > offset && range.start < end) cuts.add(range.start);
        if (range.end > offset && range.end < end) cuts.add(range.end);
      }
      const points = [...cuts].sort((a, b) => a - b);
      for (let i = 0; i < points.length - 1; i++) {
        const from = points[i]!;
        const to = points[i + 1]!;
        const part = { ...token, content: token.content.slice(from - offset, to - offset) };
        // A later mark wins over an earlier one for the colors
        for (const range of own) {
          if (range.start > from || range.end < to) continue;
          if (range.style) part[MARK_FLAGS[range.style]] = true;
          if (range.color) part.color = range.color;
          if (range.background) part.background = range.background;
        }
        result.push(part);
      }
      offset = end;
    }
    return result;
  });
}

async function draftAnnotation(
  annotation: AnnotationSpec,
  lines: Array<HighlightedLine>,
  paneLanguage: string,
  path: string,
  scene: SceneBase,
): Promise<AnnotationDraft> {
  const { text, index } = findMatch(lines, annotation, path);

  const language = annotation.language ? resolveLanguage(annotation.language) : paneLanguage;
  const popoverLines = applyMarks(
    await highlight(
      normalizeCode(annotation.code),
      language,
      scene.theme,
      scene.mode,
      scene.syntax,
    ),
    annotation.marks,
    path,
  );
  const columns = Math.max(0, ...popoverLines.map(lineCells));
  const natural = {
    width: POPOVER.paddingX * 2 + columns * scene.popoverText.cellWidth,
    height: POPOVER.paddingY * 2 + popoverLines.length * POPOVER.lineHeight,
  };

  return {
    line: annotation.line,
    column: textCells(text.slice(0, index)),
    cells: textCells(annotation.match),
    lines: popoverLines,
    natural,
    size: { width: annotation.width ?? natural.width, height: annotation.height ?? natural.height },
    offset: { x: annotation.offsetX, y: annotation.offsetY },
  };
}

async function draftPane(
  pane: PaneSpec,
  window: WindowSpec,
  spec: Spec,
  path: string,
  scene: SceneBase,
  options: LayoutOptions,
): Promise<PaneDraft> {
  const language =
    pane.language === "auto" ? inferLanguage(pane.title) : resolveLanguage(pane.language);
  const lines = applyMarks(
    await highlight(
      normalizeCode(pane.code, options),
      language,
      scene.theme,
      scene.mode,
      scene.syntax,
    ),
    pane.marks,
    path,
  );
  const lineNumbers = pane.lineNumbers ?? spec.lineNumbers ?? scene.theme.lineNumbers ?? false;
  const gutter = lineNumbers
    ? lines.length >= 100
      ? LINE_NUMBER_GUTTER_LARGE
      : LINE_NUMBER_GUTTER
    : EDITOR_PADDING;
  const columns = Math.max(0, ...lines.map(lineCells));
  const annotations = await Promise.all(
    pane.annotations.map((annotation, index) =>
      draftAnnotation(annotation, lines, language, `${path}.annotations.${index}`, scene),
    ),
  );

  const codeSize = {
    width: gutter + columns * scene.text.cellWidth + EDITOR_PADDING,
    height: EDITOR_PADDING * 2 + lines.length * LINE_HEIGHT,
  };

  const tabbed = window.frame && window.tabs;
  const icon = resolveIcon(pane.icon, language);
  const tabWidth =
    TAB_HEADER.paddingX * 2 +
    (icon ? TAB_HEADER.icon + TAB_HEADER.iconGap : 0) +
    measureUiText(pane.title ?? "", TAB_HEADER.titleSize);
  // A pane is wide enough for its popovers, so that they do not cover the next pane
  const popoverWidth = Math.max(
    0,
    ...annotations.map(
      (annotation) =>
        gutter + annotation.column * scene.text.cellWidth + annotation.size.width + EDITOR_PADDING,
    ),
  );
  const natural = {
    width: Math.max(codeSize.width, popoverWidth, tabbed ? tabWidth : 0),
    height: codeSize.height + (tabbed ? TAB_HEADER.height : 0),
  };

  return {
    title: pane.title,
    language,
    gutter,
    lineNumbers,
    highlighted: expandLineRanges(pane.highlight, lines.length),
    lines,
    natural,
    size: pane.size,
    codeSize,
    tabbed,
    icon,
    annotations,
  };
}

/** The size of a pane along the split of its window */
function paneExtent(pane: PaneDraft, split: WindowSpec["split"], count: number): number {
  const natural = split === "row" ? pane.natural.width : pane.natural.height;
  // A size divides the window between panes, so the only pane of a window has the size of its code
  return count > 1 ? (pane.size ?? natural) : natural;
}

// Width of the three window controls with the space between them
const CONTROLS_WIDTH = MAC_HEADER.control * 3 + MAC_HEADER.controlGap * 2;
// Space between the title and the language in a title bar
const TITLE_GAP = 12;

function headerHeightOf(frame: Frame, tabs: boolean): number {
  const bar = frame.titleBar;
  return bar.paddingTop + bar.rowHeight + bar.paddingBottom + (tabs ? bar.tabsGap : 0);
}

function draftWindow(window: WindowSpec, panes: Array<PaneDraft>, frame: Frame): WindowDraft {
  // A single pane without a tab gives its title to the window, as in ray.so
  const titleBar = window.frame && window.titleBar;
  const title = window.title ?? (panes.length === 1 && !window.tabs ? panes[0]!.title : undefined);
  const headerHeight = titleBar ? headerHeightOf(frame, window.tabs) : 0;
  const inset = window.frame ? frame.inset : 0;
  const dividers = (panes.length - 1) * DIVIDER;
  const extents = panes.map((pane) => paneExtent(pane, window.split, panes.length));

  let width: number;
  let height: number;
  if (window.split === "row") {
    width = extents.reduce((sum, extent) => sum + extent, 0) + dividers;
    height = Math.max(...panes.map((pane) => pane.natural.height));
  } else {
    width = Math.max(...panes.map((pane) => pane.natural.width));
    height = extents.reduce((sum, extent) => sum + extent, 0) + dividers;
  }

  if (titleBar && title) {
    const bar = frame.titleBar;
    const controls = bar.controls ? CONTROLS_WIDTH : 0;
    const titleWidth = measureUiText(title, bar.fontSize);
    const language = bar.language
      ? measureUiText(languageName(panes[0]!.language), bar.languageSize) + TITLE_GAP
      : 0;
    width = Math.max(
      width,
      bar.align === "center"
        ? bar.paddingX * 2 + controls * 2 + titleWidth + 24
        : bar.paddingX * 2 + (controls ? controls + bar.titleGap : 0) + titleWidth + language,
    );
  }

  return {
    spec: window,
    frame,
    title,
    headerHeight,
    panes,
    natural: {
      width: window.width ?? width + inset * 2,
      height: window.height ?? height + headerHeight + inset * 2,
    },
  };
}

/** The places of the controls, the title and the language in a title bar */
function placeTitleBar(header: Rect, frame: Frame, language: string): TitleBarBox {
  const bar = frame.titleBar;
  const row = { y: header.y + bar.paddingTop, height: bar.rowHeight };
  const controls = bar.controls
    ? { x: header.x + bar.paddingX, ...row, width: CONTROLS_WIDTH }
    : undefined;
  const style = {
    align: bar.align,
    font: bar.font,
    fontSize: bar.fontSize,
    fontWeight: bar.fontWeight,
    letterSpacing: bar.letterSpacing,
  };
  const name = languageName(language);
  const languageBox = bar.language
    ? {
        text: name,
        x: header.x + header.width - bar.paddingX,
        y: row.y + row.height / 2,
        size: bar.languageSize,
      }
    : undefined;
  const languageWidth = languageBox ? measureUiText(name, bar.languageSize) + TITLE_GAP : 0;

  let title: Rect;
  if (bar.align === "center") {
    const side = bar.paddingX + (controls ? CONTROLS_WIDTH : 0);
    title = { x: header.x + side, ...row, width: Math.max(0, header.width - side * 2) };
  } else {
    const left = bar.paddingX + (controls ? CONTROLS_WIDTH + bar.titleGap : 0);
    title = {
      x: header.x + left,
      ...row,
      width: Math.max(0, header.width - left - bar.paddingX - languageWidth),
    };
  }
  return {
    ...(controls && { controls }),
    title,
    ...style,
    ...(languageBox && { language: languageBox }),
  };
}

function placePane(pane: PaneDraft, rect: Rect, text: TextMetrics): PaneBox {
  const tabHeight = pane.tabbed ? TAB_HEADER.height : 0;
  const { natural: _natural, size: _size, codeSize, tabbed: _tabbed, annotations, ...rest } = pane;
  const code = {
    x: rect.x,
    y: rect.y + tabHeight,
    width: rect.width,
    height: Math.max(0, rect.height - tabHeight),
  };

  return {
    ...rest,
    ...rect,
    ...(pane.tabbed && { tab: { x: rect.x, y: rect.y, width: rect.width, height: tabHeight } }),
    code,
    clipped: code.width < codeSize.width || code.height < codeSize.height,
    // The popover starts below the anchor, aligned with its first character
    annotations: annotations.map((annotation) => {
      const x = code.x + pane.gutter + annotation.column * text.cellWidth;
      const y = code.y + EDITOR_PADDING + annotation.line * text.lineHeight;
      return {
        anchor: { x, y, width: annotation.cells * text.cellWidth },
        box: {
          x: x + annotation.offset.x,
          y: y + POPOVER.offset + annotation.offset.y,
          ...annotation.size,
        },
        lines: annotation.lines,
        clipped:
          annotation.size.width < annotation.natural.width ||
          annotation.size.height < annotation.natural.height,
      };
    }),
  };
}

/** Places a window and stretches its panes to fill the given size. The last pane takes the extra space. */
function placeWindow(draft: WindowDraft, rect: Rect, text: TextMetrics): WindowBox {
  const { spec, panes, headerHeight, frame } = draft;
  const outer = rect;
  // The panes and the title bar are inside the inset of the frame
  const inset = spec.frame ? frame.inset : 0;
  rect = {
    x: outer.x + inset,
    y: outer.y + inset,
    width: Math.max(0, outer.width - inset * 2),
    height: Math.max(0, outer.height - inset * 2),
  };
  const top = rect.y + headerHeight;
  const bodyHeight = Math.max(0, rect.height - headerHeight);
  const boxes: Array<PaneBox> = [];
  const dividers: WindowBox["dividers"] = [];

  let offset = 0;
  panes.forEach((pane, index) => {
    const last = index === panes.length - 1;
    const extent = paneExtent(pane, spec.split, panes.length);
    if (spec.split === "row") {
      const width = last ? Math.max(0, rect.width - offset) : extent;
      boxes.push(placePane(pane, { x: rect.x + offset, y: top, width, height: bodyHeight }, text));
      offset += width;
      if (!last) {
        dividers.push({
          x1: rect.x + offset + DIVIDER / 2,
          y1: top,
          x2: rect.x + offset + DIVIDER / 2,
          y2: rect.y + rect.height,
        });
        offset += DIVIDER;
      }
    } else {
      const height = last ? Math.max(0, bodyHeight - offset) : extent;
      boxes.push(placePane(pane, { x: rect.x, y: top + offset, width: rect.width, height }, text));
      offset += height;
      if (!last) {
        dividers.push({
          x1: rect.x,
          y1: top + offset + DIVIDER / 2,
          x2: rect.x + rect.width,
          y2: top + offset + DIVIDER / 2,
        });
        offset += DIVIDER;
      }
    }
  });

  const header =
    headerHeight > 0
      ? { x: rect.x, y: rect.y, width: rect.width, height: headerHeight }
      : undefined;
  return {
    ...outer,
    frame: spec.frame,
    radius: spec.frame ? frame.radius : 0,
    title: draft.title,
    controls: spec.controls,
    natural: draft.natural,
    ...(header && { header, titleBar: placeTitleBar(header, frame, panes[0]!.language) }),
    panes: boxes,
    dividers,
  };
}

/** Places the windows that follow direction and gap, from the origin */
function placeFlow(
  drafts: Array<WindowDraft>,
  spec: Spec,
  origin: number,
  text: TextMetrics,
): Array<WindowBox> {
  if (drafts.length === 0) return [];
  const minWidth = Math.max(0, MIN_FRAME_WIDTH - spec.padding * 2);
  const windows: Array<WindowBox> = [];

  if (spec.direction === "column") {
    // Stacked windows share one width, unless a window sets its own. The minimum width is for the
    // frame, so a window without a frame keeps the width of its code and the padding on all sides.
    const shares = (draft: WindowDraft) => draft.spec.width === undefined && draft.spec.frame;
    const width = Math.max(minWidth, ...drafts.filter(shares).map((d) => d.natural.width));
    let y = origin;
    for (const draft of drafts) {
      const rect = {
        x: origin,
        y,
        width: shares(draft) ? width : draft.natural.width,
        height: draft.natural.height,
      };
      windows.push(placeWindow(draft, rect, text));
      y += draft.natural.height + spec.gap;
    }
  } else {
    // Windows side by side share one height, unless a window sets its own
    const height = Math.max(
      ...drafts.map((draft) => (draft.spec.height === undefined ? draft.natural.height : 0)),
    );
    const naturalWidth =
      drafts.reduce((sum, draft) => sum + draft.natural.width, 0) + spec.gap * (drafts.length - 1);
    const extra = Math.max(0, minWidth - naturalWidth);
    let x = origin;
    drafts.forEach((draft, index) => {
      const stretch =
        index === drafts.length - 1 && draft.spec.width === undefined && draft.spec.frame;
      const width = draft.natural.width + (stretch ? extra : 0);
      const rect = { x, y: origin, width, height: draft.spec.height ?? height };
      windows.push(placeWindow(draft, rect, text));
      x += width + spec.gap;
    });
  }
  return windows;
}

/** The right and bottom edge of the windows and of their popovers */
function extent(windows: Array<WindowBox>): { right: number; bottom: number } {
  const boxes: Array<Rect> = windows.flatMap((window) => [
    window,
    ...window.panes.flatMap((pane) => pane.annotations.map((annotation) => annotation.box)),
  ]);
  return {
    right: Math.max(0, ...boxes.map((box) => box.x + box.width)),
    bottom: Math.max(0, ...boxes.map((box) => box.y + box.height)),
  };
}

function shiftRect<RECT extends Rect>(rect: RECT, dx: number, dy: number): RECT {
  return { ...rect, x: rect.x + dx, y: rect.y + dy };
}

function shiftTitleBar(bar: TitleBarBox, dx: number, dy: number): TitleBarBox {
  return {
    ...bar,
    ...(bar.controls && { controls: shiftRect(bar.controls, dx, dy) }),
    title: shiftRect(bar.title, dx, dy),
    ...(bar.language && {
      language: { ...bar.language, x: bar.language.x + dx, y: bar.language.y + dy },
    }),
  };
}

function shiftWindow(window: WindowBox, dx: number, dy: number): WindowBox {
  if (dx === 0 && dy === 0) return window;
  return {
    ...shiftRect(window, dx, dy),
    ...(window.header && { header: shiftRect(window.header, dx, dy) }),
    ...(window.titleBar && { titleBar: shiftTitleBar(window.titleBar, dx, dy) }),
    dividers: window.dividers.map((line) => ({
      x1: line.x1 + dx,
      y1: line.y1 + dy,
      x2: line.x2 + dx,
      y2: line.y2 + dy,
    })),
    panes: window.panes.map((pane) => ({
      ...shiftRect(pane, dx, dy),
      ...(pane.tab && { tab: shiftRect(pane.tab, dx, dy) }),
      code: shiftRect(pane.code, dx, dy),
      annotations: pane.annotations.map((annotation) => ({
        ...annotation,
        anchor: { ...annotation.anchor, x: annotation.anchor.x + dx, y: annotation.anchor.y + dy },
        box: shiftRect(annotation.box, dx, dy),
      })),
    })),
  };
}

// The largest width and height of the image, as the spec allows for a set size
const MAX_IMAGE_SIZE = SPEC_LIMITS.size;

function parseRatio(ratio: string): number {
  const [width, height] = ratio.split(":").map(Number) as [number, number];
  return width / height;
}

/** Throws when the image is too large to render */
function checkImageSize(width: number, height: number): void {
  const issues: Array<string> = [];
  if (Math.ceil(width) > MAX_IMAGE_SIZE)
    issues.push(
      `The image is ${Math.ceil(width)} px wide, at most ${MAX_IMAGE_SIZE} px. Shorten the code or set a width.`,
    );
  if (Math.ceil(height) > MAX_IMAGE_SIZE)
    issues.push(
      `The image is ${Math.ceil(height)} px high, at most ${MAX_IMAGE_SIZE} px. Use fewer lines or set a height.`,
    );
  if (issues.length > 0) throw new SpecError(issues);
}

/** Validates the spec, highlights the code and places every element of the image */
export async function layout(input: unknown, options: LayoutOptions = {}): Promise<Scene> {
  const spec = parseSpec(input);
  const theme = getTheme(spec.theme);
  const mode = resolveMode(theme, spec.mode);
  const font = resolveFont(spec, theme);
  const frame = getFrame(theme.id);

  const base: SceneBase = {
    theme,
    mode,
    syntax: getSyntax(theme, mode),
    frame: { ...getFrameColors(theme, mode), ...frame.colors[mode] },
    background: spec.background,
    font,
    text: textMetrics(font, FONT_SIZE, LINE_HEIGHT),
    popoverText: textMetrics(font, POPOVER.fontSize, POPOVER.lineHeight),
  };

  const drafts = await Promise.all(
    spec.windows.map(async (window, windowIndex) =>
      draftWindow(
        window,
        await Promise.all(
          window.panes.map((pane, paneIndex) =>
            draftPane(
              pane,
              window,
              spec,
              `windows.${windowIndex}.panes.${paneIndex}`,
              base,
              options,
            ),
          ),
        ),
        frame,
      ),
    ),
  );

  // A window with a position stays there. The other windows follow direction and gap.
  const positioned = (draft: WindowDraft) =>
    draft.spec.x !== undefined || draft.spec.y !== undefined;
  const flow = placeFlow(
    drafts.filter((draft) => !positioned(draft)),
    spec,
    spec.padding,
    base.text,
  );
  const fixed = new Map(
    drafts.flatMap((draft, index) => {
      if (!positioned(draft)) return [];
      const rect = {
        x: draft.spec.x ?? spec.padding,
        y: draft.spec.y ?? spec.padding,
        ...draft.natural,
      };
      return [[index, placeWindow(draft, rect, base.text)] as const];
    }),
  );

  // Popovers can reach outside of their window, and the image grows to show them
  const flowExtent = extent(flow);
  const fixedExtent = extent([...fixed.values()]);
  const natural = {
    width: Math.max(flowExtent.right, fixedExtent.right) + spec.padding,
    height: Math.max(flowExtent.bottom, fixedExtent.bottom) + spec.padding,
  };

  // A set size is the size of the image, and the image cuts off what is outside of it
  let width = spec.width ?? natural.width;
  let height = spec.height ?? natural.height;
  // The spec validation refuses an aspect ratio together with both a width and a height
  if (spec.aspectRatio) {
    const ratio = parseRatio(spec.aspectRatio);
    if (spec.width !== undefined) height = width / ratio;
    else if (spec.height !== undefined) width = height * ratio;
    else {
      // Without a set size, the windows must fit before the image grows to the ratio
      checkImageSize(width, height);
      if (width / height < ratio) width = height * ratio;
      else height = width / ratio;
    }
    // A ratio far from the shape of the windows must not make an image too large to render
    if (Math.ceil(width) > MAX_IMAGE_SIZE || Math.ceil(height) > MAX_IMAGE_SIZE)
      throw new SpecError([
        `aspectRatio: The ratio ${spec.aspectRatio} makes an image of ${Math.ceil(width)} x ${Math.ceil(height)} px, at most ${MAX_IMAGE_SIZE} px on each side. Use a ratio nearer to the shape of the windows, or a smaller width or height.`,
      ]);
  }
  checkImageSize(width, height);

  // The windows that follow direction and gap stay centered when the image size or ratio changes
  const dx = (width - natural.width) / 2;
  const dy = (height - natural.height) / 2;
  const shifted = flow.map((window) => shiftWindow(window, dx, dy));
  const windows = drafts.map((_, index) => fixed.get(index) ?? shifted.shift()!);

  return {
    ...base,
    width: Math.ceil(width),
    height: Math.ceil(height),
    windows,
  };
}
