import {
  expandLineRanges,
  inferLanguage,
  normalizeCode,
  parseSpec,
  resolveLanguage,
  SPEC_LIMITS,
  type SpecInput,
} from "@tin.so/core";

export type WindowInput = SpecInput["windows"][number];

/** A new spec, or a function that makes it from the current spec when the change is applied */
export type SpecUpdate = SpecInput | ((spec: SpecInput) => SpecInput);
export type PaneInput = WindowInput["panes"][number];

export function updateWindow(
  spec: SpecInput,
  windowIndex: number,
  update: (window: WindowInput) => WindowInput,
): SpecInput {
  return {
    ...spec,
    windows: spec.windows.map((window, index) => (index === windowIndex ? update(window) : window)),
  };
}

export function updatePane(
  spec: SpecInput,
  windowIndex: number,
  paneIndex: number,
  update: (pane: PaneInput) => PaneInput,
): SpecInput {
  return updateWindow(spec, windowIndex, (window) => ({
    ...window,
    panes: window.panes.map((pane, index) => (index === paneIndex ? update(pane) : pane)),
  }));
}

/** Adds the line to the highlighted lines, or removes it. Ranges are expanded to single lines. */
export function toggleHighlight(pane: PaneInput, line: number): PaneInput {
  const lines = expandLineRanges(pane.highlight ?? []);
  if (lines.has(line)) lines.delete(line);
  else lines.add(line);
  return { ...pane, highlight: [...lines].sort((a, b) => a - b) };
}

/**
 * Sets the line numbers of the image. The value is explicit, because a theme can show line numbers
 * by default, and the panes lose their own values, so that every pane follows the switch.
 */
export function setLineNumbers(spec: SpecInput, lineNumbers: boolean): SpecInput {
  return {
    ...spec,
    lineNumbers,
    windows: spec.windows.map((window) => ({
      ...window,
      panes: window.panes.map(({ lineNumbers: _lineNumbers, ...pane }) => pane),
    })),
  };
}

/**
 * The title that the title bar shows and edits. A single pane without a tab shows its own title
 * there, as in ray.so, so the title bar edits the pane title, which also gives the language.
 */
export function titleBarTarget(window: WindowInput): "window" | "pane" {
  return window.panes.length === 1 && !window.tabs && window.title === undefined
    ? "pane"
    : "window";
}

export function formatHighlight(highlight: PaneInput["highlight"]): string {
  return (highlight ?? []).join(", ");
}

export function parseHighlight(text: string): PaneInput["highlight"] {
  return text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => (/^\d+$/.test(part) ? Number(part) : part));
}

export type MarkStyle = NonNullable<PaneInput["marks"]>[number]["style"];

/** A part of one line, found again by its text and its occurrence in the line */
export type LinePart = { line: number; match: string; occurrence: number };

/** A pane or a popover: code with marks on it */
export type Marked = { code: string; marks?: PaneInput["marks"] };

/** The lines of a selection in the code, from 1, with the end line included */
export function selectionLines(code: string, start: number, end: number): [number, number] {
  const lineAt = (offset: number) => code.slice(0, offset).split("\n").length;
  // A selection that ends at the start of a line does not include that line
  const last = end > start && code[end - 1] === "\n" ? end - 1 : end;
  return [lineAt(start), lineAt(last)];
}

/**
 * The selected text of each line, without the indentation and the spaces at the end. Each part
 * keeps its occurrence in the line, so that it stays the same text when the line has it twice.
 */
export function selectionParts(code: string, start: number, end: number): Array<LinePart> {
  const parts: Array<LinePart> = [];
  let offset = 0;
  code.split("\n").forEach((text, index) => {
    const from = Math.max(start, offset) - offset;
    const to = Math.min(end, offset + text.length) - offset;
    offset += text.length + 1;
    if (to <= from) return;
    const lead = text.slice(from, to).length - text.slice(from, to).trimStart().length;
    const match = text.slice(from + lead, to).trimEnd();
    if (!match) return;
    parts.push({ line: index + 1, match, occurrence: occurrenceAt(text, match, from + lead) });
  });
  return parts;
}

/** Which occurrence of the match starts at the index, from 1 */
function occurrenceAt(text: string, match: string, index: number): number {
  let occurrence = 0;
  let found = -1;
  do {
    found = text.indexOf(match, found + 1);
    occurrence++;
  } while (found !== -1 && found < index);
  return occurrence;
}

/** The start and end of a part in its line, or undefined when the line does not have it */
export function partRange(code: string, part: LinePart): [number, number] | undefined {
  const text = code.split("\n")[part.line - 1];
  if (text === undefined) return undefined;
  let index = -1;
  for (let found = 0; found < (part.occurrence ?? 1); found++) {
    index = text.indexOf(part.match, index + 1);
    if (index === -1) return undefined;
  }
  return [index, index + part.match.length];
}

const samePart = (a: LinePart, b: Partial<LinePart>) =>
  a.line === b.line && a.match === b.match && a.occurrence === (b.occurrence ?? 1);

/** Highlights all lines of the range, or removes the highlight when all of them have it */
export function toggleHighlightRange(pane: PaneInput, from: number, to: number): PaneInput {
  const lines = expandLineRanges(pane.highlight ?? []);
  const range = Array.from({ length: to - from + 1 }, (_, index) => from + index);
  const all = range.every((line) => lines.has(line));
  for (const line of range) {
    if (all) lines.delete(line);
    else lines.add(line);
  }
  return { ...pane, highlight: [...lines].sort((a, b) => a - b) };
}

/** Adds the style to all parts, or removes it when all parts have it */
export function toggleMark<MARKED extends Marked>(
  pane: MARKED,
  parts: Array<LinePart>,
  style: MarkStyle,
): MARKED & Marked {
  const marks = pane.marks ?? [];
  const has = (part: LinePart) =>
    marks.some((mark) => mark.style === style && samePart(part, mark));
  if (parts.every(has)) {
    return {
      ...pane,
      marks: marks.filter((mark) => mark.style !== style || !parts.some((p) => samePart(p, mark))),
    };
  }
  return {
    ...pane,
    marks: [...marks, ...parts.filter((part) => !has(part)).map((part) => ({ ...part, style }))],
  };
}

export type MarkColorKind = "color" | "background";

/**
 * Gives the parts a text color or a fill, or removes it with undefined. The color goes into a mark
 * of its own, so that a style of the same part stays when the color changes.
 */
export function setMarkColor<MARKED extends Marked>(
  pane: MARKED,
  parts: Array<LinePart>,
  kind: MarkColorKind,
  color: string | undefined,
): MARKED & Marked {
  const kept = (pane.marks ?? []).flatMap((mark) => {
    if (mark[kind] === undefined || !parts.some((part) => samePart(part, mark))) return [mark];
    const rest = { ...mark };
    delete rest[kind];
    // A mark with no style and no color left changes nothing
    return rest.style || rest.color || rest.background ? [rest] : [];
  });
  const added = color ? parts.map((part) => ({ ...part, [kind]: color })) : [];
  return { ...pane, marks: [...kept, ...added] };
}

/** The text color or the fill that every part has, or undefined */
export function markColor(
  pane: Marked,
  parts: Array<LinePart>,
  kind: MarkColorKind,
): string | undefined {
  const colors = parts.map(
    (part) => (pane.marks ?? []).findLast((mark) => mark[kind] && samePart(part, mark))?.[kind],
  );
  const [first] = colors;
  return first && colors.every((color) => color === first) ? first : undefined;
}

/** Removes the marks that overlap the selection */
export function clearMarks<MARKED extends Marked>(
  pane: MARKED,
  start: number,
  end: number,
): MARKED & Marked {
  // The start of each line in the code
  let position = 0;
  const starts = pane.code.split("\n").map((text) => {
    const lineStart = position;
    position += text.length + 1;
    return lineStart;
  });
  return {
    ...pane,
    marks: (pane.marks ?? []).filter((mark) => {
      const range = partRange(pane.code, { ...mark, occurrence: mark.occurrence ?? 1 });
      if (!range) return true;
      const lineStart = starts[mark.line - 1]!;
      return lineStart + range[1] <= start || lineStart + range[0] >= end;
    }),
  };
}

/** The styles that every part has */
export function activeMarks(pane: Marked, parts: Array<LinePart>): Set<MarkStyle> {
  const marks = pane.marks ?? [];
  const styles = new Set<MarkStyle>();
  if (parts.length === 0) return styles;
  for (const style of ["strong", "emphasis", "underline", "strikethrough"] as const) {
    if (parts.every((part) => marks.some((mark) => mark.style === style && samePart(part, mark))))
      styles.add(style);
  }
  return styles;
}

/** The index of the annotation on the part, or -1 */
export function annotationAt(pane: PaneInput, part: LinePart): number {
  return (pane.annotations ?? []).findIndex((annotation) => samePart(part, annotation));
}

type SceneWindow = {
  x: number;
  y: number;
  width: number;
  height: number;
  natural: { width: number; height: number };
};

type SceneSize = { width: number; height: number; windows: Array<SceneWindow> };

/**
 * Makes the current image size the smallest size, so that a window that moves inside the image
 * does not make the image smaller.
 */
export function keepImageSize(spec: SpecInput, scene: SceneSize): SpecInput {
  return withImageSize(spec, scene.width, scene.height);
}

/**
 * Gives every window its place in the image, so that the user can move each window. A window
 * that the layout made larger than its code keeps that size.
 */
export function positionWindows(spec: SpecInput, scene: SceneSize): SpecInput {
  return {
    ...keepImageSize(spec, scene),
    windows: spec.windows.map((window, index) => {
      const box = scene.windows[index]!;
      return {
        ...window,
        x: Math.round(box.x),
        y: Math.round(box.y),
        ...(window.width === undefined &&
          box.width !== box.natural.width && { width: Math.round(box.width) }),
        ...(window.height === undefined &&
          box.height !== box.natural.height && { height: Math.round(box.height) }),
      };
    }),
  };
}

/** Removes the window positions and the image size, so that padding and direction apply again */
export function resetPositions(spec: SpecInput): SpecInput {
  const { width: _width, height: _height, ...rest } = spec;
  return {
    ...rest,
    windows: spec.windows.map(({ x: _x, y: _y, ...window }) => window),
  };
}

export function isPositioned(spec: SpecInput): boolean {
  return spec.windows.some((window) => window.x !== undefined || window.y !== undefined);
}

/** The language that the renderer uses, also when the pane infers it from the file name */
export function paneLanguage(pane: PaneInput): string {
  const language = pane.language ?? "auto";
  return language === "auto" ? inferLanguage(pane.title) : resolveLanguage(language);
}

/**
 * Sets the result of the formatter, which runs async. When the code changed while the formatter
 * ran, the pane keeps the new code, so that no typed text is lost.
 */
export function withFormattedCode(pane: PaneInput, input: string, formatted: string): PaneInput {
  return pane.code === input ? withCode(pane, formatted) : pane;
}

/**
 * How the line numbers change when the code changes. Lines above the edit keep their number, lines
 * below it move with it, and a line that the edit removed with its line break gives undefined. The
 * caret after the edit tells where the edit is when the same text is on several lines.
 */
function lineMover(
  previous: string,
  code: string,
  caret?: number,
): { move: (line: number) => number | undefined; editLine: number } {
  const maxPrefix = Math.min(previous.length, code.length, caret ?? code.length);
  let prefix = 0;
  while (prefix < maxPrefix && previous[prefix] === code[prefix]) prefix++;
  const maxSuffix = Math.min(
    previous.length - prefix,
    code.length - prefix,
    caret === undefined ? code.length : code.length - caret,
  );
  let suffix = 0;
  while (
    suffix < maxSuffix &&
    previous[previous.length - 1 - suffix] === code[code.length - 1 - suffix]
  )
    suffix++;

  const removedEnd = previous.length - suffix;
  const breaks = (text: string) => text.split("\n").length - 1;
  const delta =
    breaks(code.slice(prefix, code.length - suffix)) - breaks(previous.slice(prefix, removedEnd));
  const starts = [0];
  for (let index = 0; index < previous.length; index++)
    if (previous[index] === "\n") starts.push(index + 1);

  const move = (line: number) => {
    const start = starts[line - 1];
    // A line after the last line, for example of a popover that is not visible, moves as a line below
    if (start === undefined) return line + delta;
    const end = line < starts.length ? starts[line]! - 1 : previous.length;
    const removed = start >= prefix && end <= removedEnd && (end < removedEnd || start > prefix);
    if (removed) return undefined;
    return start < prefix ? line : line + delta;
  };
  return { move, editLine: breaks(previous.slice(0, prefix)) + 1 };
}

/**
 * Sets the code of a pane and moves the line highlights, marks and popovers with their lines, when
 * the edit adds or removes lines above them. The edit removes the highlights and marks of a line
 * that it removes. A popover of such a line moves to the line of the edit, so that its content
 * stays. The caret is the cursor position after the edit, when the user typed it.
 */
export function withCode(pane: PaneInput, code: string, caret?: number): PaneInput {
  const { move, editLine } = lineMover(pane.code, code, caret);
  const lineCount = code.split("\n").length;
  const lines = [...expandLineRanges(pane.highlight ?? [])]
    .flatMap((line) => move(line) ?? [])
    .filter((line) => line >= 1 && line <= lineCount);
  return {
    ...pane,
    code,
    highlight: [...new Set(lines)].sort((a, b) => a - b),
    ...(pane.marks && { marks: moveMarks(pane.marks, move) }),
    ...(pane.annotations && {
      annotations: pane.annotations.map((annotation) => ({
        ...annotation,
        line: move(annotation.line) ?? editLine,
      })),
    }),
  };
}

function moveMarks(
  marks: NonNullable<Marked["marks"]>,
  move: (line: number) => number | undefined,
): NonNullable<Marked["marks"]> {
  return marks.flatMap((mark) => {
    const line = move(mark.line);
    return line === undefined ? [] : [{ ...mark, line }];
  });
}

/** New code for a popover. Its marks move with their lines, as in a pane. */
export function withPopoverCode<MARKED extends Marked>(
  popover: MARKED,
  code: string,
  caret?: number,
): MARKED & Marked {
  const { move } = lineMover(popover.code, code, caret);
  return {
    ...popover,
    code,
    ...(popover.marks && { marks: moveMarks(popover.marks, move) }),
  };
}

type StoredPart = Omit<LinePart, "occurrence"> & { occurrence?: number };

/** true when the line of the part has its text, so that the image can show the part */
export function hasPart(code: string, part: StoredPart): boolean {
  return (
    partRange(normalizeCode(code), { ...part, occurrence: part.occurrence ?? 1 }) !== undefined
  );
}

/** The indexes of the popovers that the image shows, in the order of the image */
export function visibleAnnotations(pane: PaneInput): Array<number> {
  return (pane.annotations ?? []).flatMap((annotation, index) =>
    hasPart(pane.code, annotation) ? [index] : [],
  );
}

/**
 * Removes the marks and popovers whose text is not in their line. The editor keeps them while
 * the user types, so that they come back when the text does, but the image must not have them.
 */
export function withoutMissingParts(spec: SpecInput): SpecInput {
  const found = (code: string) => (part: StoredPart) => hasPart(code, part);
  return {
    ...spec,
    windows: spec.windows.map((window) => ({
      ...window,
      panes: window.panes.map((pane) => ({
        ...pane,
        ...(pane.marks && { marks: pane.marks.filter(found(pane.code)) }),
        ...(pane.annotations && {
          annotations: pane.annotations.filter(found(pane.code)).map((annotation) => ({
            ...annotation,
            ...(annotation.marks && { marks: annotation.marks.filter(found(annotation.code)) }),
          })),
        }),
      })),
    })),
  };
}

export type Axis = "horizontal" | "vertical";

/**
 * Centers a window in the image, and changes nothing else. A window that follows the padding gets
 * a place first, unless it is already centered.
 */
export function centerWindow(
  spec: SpecInput,
  scene: SceneSize,
  windowIndex: number,
  axis: Axis,
): SpecInput {
  const box = scene.windows[windowIndex];
  if (!box) return spec;
  const x = Math.round((scene.width - box.width) / 2);
  const y = Math.round((scene.height - box.height) / 2);
  const centered = axis === "horizontal" ? Math.abs(box.x - x) < 1 : Math.abs(box.y - y) < 1;
  if (centered && !isPositioned(spec)) return spec;
  const base = isPositioned(spec) ? keepImageSize(spec, scene) : positionWindows(spec, scene);
  return updateWindow(base, windowIndex, (window) =>
    axis === "horizontal" ? { ...window, x } : { ...window, y },
  );
}

function ratioOf(aspectRatio: string): number {
  const [width, height] = aspectRatio.split(":").map(Number) as [number, number];
  return width / height;
}

/**
 * Sets the image size. With an aspect ratio, the width alone gives the height, and the spec loses
 * its height, because the spec validation refuses a ratio together with a width and a height.
 */
function withImageSize(spec: SpecInput, width: number, height: number): SpecInput {
  return {
    ...spec,
    width: Math.round(width),
    height: spec.aspectRatio ? undefined : Math.round(height),
  };
}

/**
 * Sets the aspect ratio of the normal layout. When the image has a width and a height, the width
 * stays and gives the height with the ratio.
 */
export function withAspectRatio(spec: SpecInput, aspectRatio: string | undefined): SpecInput {
  const next = { ...spec, aspectRatio };
  if (!aspectRatio || spec.width === undefined || spec.height === undefined) return next;
  return withImageSize(next, spec.width, spec.height);
}

/** Moves every window by the same distance */
function shiftWindows(spec: SpecInput, dx: number, dy: number): SpecInput {
  return {
    ...spec,
    windows: spec.windows.map((window) => ({
      ...window,
      ...(window.x !== undefined && { x: Math.round(window.x + dx) }),
      ...(window.y !== undefined && { y: Math.round(window.y + dy) }),
    })),
  };
}

/**
 * Fits the image of the free layout to its windows: the windows with the padding around them,
 * grown to the aspect ratio. The windows keep their places relative to each other.
 */
export function fitToPadding(spec: SpecInput, scene: SceneSize, padding: number): SpecInput {
  const left = Math.min(...scene.windows.map((box) => box.x));
  const top = Math.min(...scene.windows.map((box) => box.y));
  const right = Math.max(...scene.windows.map((box) => box.x + box.width));
  const bottom = Math.max(...scene.windows.map((box) => box.y + box.height));
  const fitted = { width: right - left + padding * 2, height: bottom - top + padding * 2 };
  const size = { ...fitted };
  if (spec.aspectRatio) {
    const ratio = ratioOf(spec.aspectRatio);
    if (size.width / size.height < ratio) size.width = size.height * ratio;
    else size.height = size.width / ratio;
  }
  const dx = padding - left + (size.width - fitted.width) / 2;
  const dy = padding - top + (size.height - fitted.height) / 2;
  return withImageSize(shiftWindows({ ...spec, padding }, dx, dy), size.width, size.height);
}

/**
 * Changes the aspect ratio of the free layout. The image grows to the ratio around its current
 * size, and the windows stay in the middle. Without a ratio, the image keeps its current size.
 */
export function fitToRatio(
  spec: SpecInput,
  scene: SceneSize,
  aspectRatio: string | undefined,
): SpecInput {
  if (!aspectRatio)
    return { ...spec, aspectRatio: undefined, width: scene.width, height: scene.height };
  const ratio = ratioOf(aspectRatio);
  const size = { width: scene.width, height: scene.height };
  if (size.width / size.height < ratio) size.width = size.height * ratio;
  else size.height = size.width / ratio;
  const shifted = shiftWindows(
    { ...spec, aspectRatio },
    (size.width - scene.width) / 2,
    (size.height - scene.height) / 2,
  );
  return withImageSize(shifted, size.width, size.height);
}

/**
 * Puts the window boxes of a scene in the order of the windows in a new spec. A window that only
 * moved to another layer keeps its box. A changed window has a new object, so it keeps its index.
 */
export function alignScene(before: SceneSize, beforeSpec: SpecInput, spec: SpecInput): SceneSize {
  const windows = spec.windows.flatMap((window, index) => {
    const old = beforeSpec.windows.indexOf(window);
    const box = before.windows[old === -1 ? index : old];
    return box ? [box] : [];
  });
  return { ...before, windows };
}

/**
 * Grows the image of the free layout when a window gets larger and reaches past the right or
 * bottom edge, so that the window keeps its distance to that edge. A window that only moved
 * does not grow the image.
 */
export function growForLargerWindows(
  spec: SpecInput,
  before: SceneSize,
  after: SceneSize,
): SpecInput {
  let width = after.width;
  let height = after.height;
  after.windows.forEach((box, index) => {
    const old = before.windows[index];
    if (!old) return;
    if (box.width > old.width) {
      const margin = Math.max(0, before.width - (old.x + old.width));
      // Whole pixels, as the image has them, so that a second pass does not grow the image again
      width = Math.max(width, Math.ceil(box.x + box.width + margin));
    }
    if (box.height > old.height) {
      const margin = Math.max(0, before.height - (old.y + old.height));
      height = Math.max(height, Math.ceil(box.y + box.height + margin));
    }
  });
  if (width === after.width && height === after.height) return spec;
  if (spec.aspectRatio) {
    const ratio = ratioOf(spec.aspectRatio);
    width = Math.max(width, height * ratio);
    height = width / ratio;
  }
  return withImageSize(spec, width, height);
}

/**
 * The padding of the free layout when the image still fits its windows with that padding, as a
 * padding button makes it. An aspect ratio adds the same space on two sides.
 */
export function fittedPadding(spec: SpecInput, scene: SceneSize): number | undefined {
  const padding = spec.padding ?? DEFAULT_PADDING;
  const left = Math.min(...scene.windows.map((box) => box.x));
  const top = Math.min(...scene.windows.map((box) => box.y));
  const right = scene.width - Math.max(...scene.windows.map((box) => box.x + box.width));
  const bottom = scene.height - Math.max(...scene.windows.map((box) => box.y + box.height));
  const near = (a: number, b: number) => Math.abs(a - b) <= 1;
  const fitted = near(left, right) && near(top, bottom) && near(Math.min(left, top), padding);
  return fitted ? padding : undefined;
}

export type Layer = "front" | "forward" | "backward" | "back";

/**
 * Moves a window in the paint order. The image paints the windows in their order in the spec, so
 * the last window is in front. Gives the spec and the new index of the window.
 */
export function moveLayer(
  spec: SpecInput,
  index: number,
  layer: Layer,
): { spec: SpecInput; index: number } {
  const last = spec.windows.length - 1;
  const target = {
    front: last,
    forward: Math.min(last, index + 1),
    backward: Math.max(0, index - 1),
    back: 0,
  }[layer];
  if (target === index) return { spec, index };
  const windows = spec.windows.filter((_, i) => i !== index);
  windows.splice(target, 0, spec.windows[index]!);
  return { spec: { ...spec, windows }, index: target };
}

// The default space around the windows, as in the spec schema
const DEFAULT_PADDING = 64;

/**
 * A spec with only some windows. In the free layout, the windows keep their places to each other,
 * and the padding goes around them. In the other layouts, direction and gap place them again.
 */
export function windowsOnly(spec: SpecInput, scene: SceneSize, indexes: Array<number>): SpecInput {
  const kept = [...indexes].sort((a, b) => a - b);
  if (!isPositioned(spec)) {
    return resetPositions({ ...spec, windows: kept.map((index) => spec.windows[index]!) });
  }
  const positioned = positionWindows(spec, scene);
  const bounds = boundsOf(kept.map((index) => scene.windows[index]!));
  const padding = spec.padding ?? DEFAULT_PADDING;
  const { width: _width, height: _height, aspectRatio: _ratio, ...rest } = positioned;
  return {
    ...rest,
    windows: kept.map((index) => {
      const window = positioned.windows[index]!;
      return {
        ...window,
        x: (window.x ?? 0) - Math.round(bounds.x) + padding,
        y: (window.y ?? 0) - Math.round(bounds.y) + padding,
      };
    }),
  };
}

type Bounds = { x: number; y: number; width: number; height: number };

/** The smallest box around all boxes */
export function boundsOf(boxes: Array<Bounds>): Bounds {
  const x = Math.min(...boxes.map((box) => box.x));
  const y = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  return { x, y, width: right - x, height: bottom - y };
}

// The largest side of an image that the renderer makes
const MAX_IMAGE_SIZE = SPEC_LIMITS.size;

/**
 * The smallest image that still shows all windows with the padding around them. A window of the
 * free layout stays at its place, so the image can only get smaller at the right and the bottom.
 */
function minImageSize(spec: SpecInput, scene: SceneSize): { width: number; height: number } {
  const padding = spec.padding ?? DEFAULT_PADDING;
  const bounds = boundsOf(scene.windows);
  if (isPositioned(spec)) {
    return { width: bounds.x + bounds.width + padding, height: bounds.y + bounds.height + padding };
  }
  return { width: bounds.width + padding * 2, height: bounds.height + padding * 2 };
}

/**
 * Sets the size of the image from a drag of its edge or its corner. With an aspect ratio, the
 * image keeps its ratio: the spec gets only one side, and the layout gives the other side.
 */
export function resizeImage(
  spec: SpecInput,
  scene: SceneSize,
  size: { width?: number; height?: number },
): SpecInput {
  const min = minImageSize(spec, scene);
  const fit = (value: number, smallest: number) =>
    Math.round(Math.min(MAX_IMAGE_SIZE, Math.max(smallest, value)));
  if (!spec.aspectRatio) {
    return {
      ...spec,
      ...(size.width !== undefined && { width: fit(size.width, min.width) }),
      ...(size.height !== undefined && { height: fit(size.height, min.height) }),
    };
  }
  const ratio = ratioOf(spec.aspectRatio);
  const minWidth = Math.max(min.width, min.height * ratio);
  const { width: _width, height: _height, ...rest } = spec;
  return size.width !== undefined
    ? { ...rest, width: fit(size.width, minWidth) }
    : { ...rest, height: fit(size.height ?? scene.height, minWidth / ratio) };
}

export function removeWindows(spec: SpecInput, indexes: Array<number>): SpecInput {
  return { ...spec, windows: spec.windows.filter((_, index) => !indexes.includes(index)) };
}

// The distance of a copy from its window, so that the window stays visible below the copy
const DUPLICATE_OFFSET = 24;

/** Puts a copy of a window in front of it. Gives the spec and the index of the copy. */
export function duplicateWindow(
  spec: SpecInput,
  index: number,
): { spec: SpecInput; index: number } {
  const window = spec.windows[index];
  if (!window) return { spec, index };
  const copy = {
    ...structuredClone(window),
    ...(window.x !== undefined && { x: window.x + DUPLICATE_OFFSET }),
    ...(window.y !== undefined && { y: window.y + DUPLICATE_OFFSET }),
  };
  const windows = [...spec.windows];
  windows.splice(index + 1, 0, copy);
  return { spec: { ...spec, windows }, index: index + 1 };
}

/** The text that the clipboard gets for windows: a spec with only these windows */
export function copyWindows(spec: SpecInput, indexes: Array<number>): string {
  const windows = indexes.flatMap((index) => spec.windows[index] ?? []);
  return JSON.stringify({ windows }, null, 2);
}

/** The windows of a spec in a text from the clipboard, or undefined for other text */
export function readCopiedWindows(text: string): Array<WindowInput> | undefined {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (typeof value !== "object" || value === null || !("windows" in value)) return undefined;
  const windows = (value as { windows: unknown }).windows;
  try {
    // The schema checks the windows, and the other fields of the copied spec do not matter
    parseSpec({ windows });
  } catch {
    return undefined;
  }
  return windows as Array<WindowInput>;
}

/**
 * Adds windows at the end. In the free layout, each window goes a little to the right and down
 * from its old place, so that a copy does not hide the window it came from. The normal layout
 * places the windows itself.
 */
export function pasteWindows(
  spec: SpecInput,
  windows: Array<WindowInput>,
): { spec: SpecInput; indexes: Array<number> } {
  const padding = spec.padding ?? DEFAULT_PADDING;
  const positioned = isPositioned(spec);
  const added = windows.map(({ x, y, ...window }) =>
    positioned
      ? { ...window, x: (x ?? padding) + DUPLICATE_OFFSET, y: (y ?? padding) + DUPLICATE_OFFSET }
      : window,
  );
  return {
    spec: { ...spec, windows: [...spec.windows, ...added] },
    indexes: added.map((_, index) => spec.windows.length + index),
  };
}

export type Alignment = "left" | "center" | "right" | "top" | "middle" | "bottom";

/** Aligns the windows to the edge or the center of the box around them, in the free layout */
export function alignWindows(
  spec: SpecInput,
  scene: SceneSize,
  indexes: Array<number>,
  alignment: Alignment,
): SpecInput {
  const bounds = boundsOf(indexes.map((index) => scene.windows[index]!));
  let result = positionWindows(spec, scene);
  for (const index of indexes) {
    const box = scene.windows[index]!;
    const x = {
      left: bounds.x,
      center: bounds.x + (bounds.width - box.width) / 2,
      right: bounds.x + bounds.width - box.width,
    }[alignment as "left" | "center" | "right"];
    const y = {
      top: bounds.y,
      middle: bounds.y + (bounds.height - box.height) / 2,
      bottom: bounds.y + bounds.height - box.height,
    }[alignment as "top" | "middle" | "bottom"];
    result = updateWindow(result, index, (window) => ({
      ...window,
      ...(x !== undefined && { x: Math.round(x) }),
      ...(y !== undefined && { y: Math.round(y) }),
    }));
  }
  return result;
}

/** Puts the same space between the windows. The first and the last window stay in their places. */
export function distributeWindows(
  spec: SpecInput,
  scene: SceneSize,
  indexes: Array<number>,
  axis: Axis,
): SpecInput {
  const horizontal = axis === "horizontal";
  const start = (box: Bounds) => (horizontal ? box.x : box.y);
  const size = (box: Bounds) => (horizontal ? box.width : box.height);
  const sorted = [...indexes].sort((a, b) => start(scene.windows[a]!) - start(scene.windows[b]!));
  const boxes = sorted.map((index) => scene.windows[index]!);
  const first = boxes[0]!;
  const last = boxes.at(-1)!;
  const total = boxes.reduce((sum, box) => sum + size(box), 0);
  const gap = (start(last) + size(last) - start(first) - total) / (boxes.length - 1);
  let result = positionWindows(spec, scene);
  let position = start(first);
  sorted.forEach((index, i) => {
    const value = Math.round(position);
    result = updateWindow(result, index, (window) =>
      horizontal ? { ...window, x: value } : { ...window, y: value },
    );
    position += size(boxes[i]!) + gap;
  });
  return result;
}

/** A line that a moved or resized window snaps to. A center line crosses the full image. */
export type Guide = {
  axis: "vertical" | "horizontal";
  kind: "center" | "window";
  at: number;
  from: number;
  to: number;
};

/** The places on an axis of a box that can snap, as parts of its size: 0 start, 0.5 center, 1 end */
export type SnapSides = { x: Array<number>; y: Array<number> };

export const ALL_SIDES: SnapSides = { x: [0, 0.5, 1], y: [0, 0.5, 1] };

type Target = { at: number; kind: Guide["kind"]; box?: Bounds };

/**
 * Snaps the sides of a box to the center of the image and to the edges and centers of other boxes.
 * Gives the distance to move the box and the lines that the box touches after the move.
 */
export function snapBox(
  box: Bounds,
  others: Array<Bounds>,
  image: { width: number; height: number },
  distance: number,
  sides: SnapSides = ALL_SIDES,
): { dx: number; dy: number; guides: Array<Guide> } {
  const targets = (horizontal: boolean): Array<Target> => [
    { at: (horizontal ? image.width : image.height) / 2, kind: "center" },
    ...others.flatMap((other) =>
      [0, 0.5, 1].map((part) => ({
        at: horizontal ? other.x + other.width * part : other.y + other.height * part,
        kind: "window" as const,
        box: other,
      })),
    ),
  ];
  const offset = (points: Array<number>, lines: Array<Target>) => {
    let best: number | undefined;
    for (const point of points) {
      for (const line of lines) {
        const delta = line.at - point;
        if (Math.abs(delta) < distance && (best === undefined || Math.abs(delta) < Math.abs(best)))
          best = delta;
      }
    }
    return best ?? 0;
  };
  const xTargets = targets(true);
  const yTargets = targets(false);
  const dx = offset(
    sides.x.map((part) => box.x + box.width * part),
    xTargets,
  );
  const dy = offset(
    sides.y.map((part) => box.y + box.height * part),
    yTargets,
  );
  const moved = { ...box, x: box.x + dx, y: box.y + dy };

  const guides: Array<Guide> = [];
  const add = (axis: Guide["axis"], lines: Array<Target>, points: Array<number>) => {
    const vertical = axis === "vertical";
    for (const line of lines) {
      if (!points.some((point) => Math.abs(point - line.at) < 0.5)) continue;
      const span = line.box ? [moved, line.box] : undefined;
      const from = span ? Math.min(...span.map((b) => (vertical ? b.y : b.x))) : 0;
      const to = span
        ? Math.max(...span.map((b) => (vertical ? b.y + b.height : b.x + b.width)))
        : vertical
          ? image.height
          : image.width;
      // Lines at the same place become one line. The center of the image comes first and stays.
      const same = guides.find(
        (guide) => guide.axis === axis && Math.abs(guide.at - line.at) < 0.5,
      );
      if (same) {
        same.from = Math.min(same.from, from);
        same.to = Math.max(same.to, to);
      } else guides.push({ axis, kind: line.kind, at: line.at, from, to });
    }
  };
  add(
    "vertical",
    xTargets,
    sides.x.map((part) => moved.x + moved.width * part),
  );
  add(
    "horizontal",
    yTargets,
    sides.y.map((part) => moved.y + moved.height * part),
  );
  return { dx, dy, guides };
}
