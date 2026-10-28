import {
  AUTO_ICON,
  expandLineRanges,
  getFace,
  measureUiText,
  type PaneBox,
  POPOVER,
  type Scene,
  type SpecInput,
  TAB_HEADER,
  type TextMetrics,
  type WindowBox,
} from "@tin.so/core";
import {
  type ClipboardEvent,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { canFormat, formatCode, pasteAndFormat } from "./format.ts";
import {
  AlignBottomIcon,
  AlignCenterIcon,
  AlignLeftIcon,
  AlignMiddleIcon,
  AlignRightIcon,
  AlignTopIcon,
  CenterHorizontalIcon,
  CenterVerticalIcon,
  CloseIcon,
  BringToFrontIcon,
  CopyIcon,
  DistributeHorizontalIcon,
  DistributeVerticalIcon,
  FormatIcon,
  MinusIcon,
  PlusIcon,
  SendToBackIcon,
  SplitColumnIcon,
  SplitRowIcon,
  TrashIcon,
} from "./icons.tsx";
import { applyMarkShortcut, MarkPanel, useStylePanel } from "./mark-panel.tsx";
import { ContextMenu, type MenuItem } from "./menu.tsx";
import { iconOptions } from "./options.tsx";
import type { Rendered } from "./renderer.ts";
import { Select } from "./select.tsx";
import {
  type Alignment,
  alignWindows,
  annotationAt,
  type Axis,
  boundsOf,
  centerWindow,
  clearMarks,
  distributeWindows,
  duplicateWindow,
  isPositioned,
  keepImageSize,
  type Layer,
  moveLayer,
  type Marked,
  type PaneInput,
  paneLanguage,
  positionWindows,
  copyWindows,
  pasteWindows,
  readCopiedWindows,
  removeWindows,
  resetPositions,
  resizeImage,
  selectionLines,
  selectionParts,
  type SpecUpdate,
  type WindowInput,
  titleBarTarget,
  toggleHighlight,
  toggleHighlightRange,
  updatePane,
  updateWindow,
  visibleAnnotations,
  withCode,
  withPopoverCode,
  withFormattedCode,
  snapBox,
  type Guide,
} from "./spec-edits.ts";

// The preview shows the image larger than 1x, as a retina screen does, when there is space
const MAX_ZOOM = 1.5;
const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
const EDITOR_PADDING = 16;
const STAGE_PADDING = 48;
// The space below the image for its size and the button to add a window
const FOOTER_HEIGHT = 56;
// Distance in screen pixels at which a moved or resized window snaps to a guide line
const SNAP_DISTANCE = 8;
// Distance in screen pixels that the pointer moves before a window moves
const DRAG_THRESHOLD = 3;
const MIN_PANE_SIZE = 24;
const MIN_WINDOW_SIZE = 48;
const MIN_POPOVER_WIDTH = 40;
const MIN_POPOVER_HEIGHT = 32;
const REMOVE_SIZE = 18;

const LAYER_ITEMS: Array<{ layer: Layer; label: string; shortcut: string }> = [
  { layer: "front", label: "Bring to front", shortcut: "⌘⇧]" },
  { layer: "forward", label: "Bring forward", shortcut: "⌘]" },
  { layer: "backward", label: "Send backward", shortcut: "⌘[" },
  { layer: "back", label: "Send to back", shortcut: "⌘⇧[" },
];

/** The layer move of a shortcut, as in Figma, or undefined for other keys */
function layerShortcut(event: globalThis.KeyboardEvent): Layer | undefined {
  if (!(event.metaKey || event.ctrlKey) || event.altKey) return undefined;
  // The code and not the key, because Shift changes the key of a bracket
  if (event.code === "BracketRight") return event.shiftKey ? "front" : "forward";
  if (event.code === "BracketLeft") return event.shiftKey ? "back" : "backward";
  return undefined;
}

/** Windows overlap only in the free layout. In the normal layout, the order of the windows sets their places. */
function canMoveLayers(spec: SpecInput): boolean {
  return isPositioned(spec) && spec.windows.length > 1;
}

const ALIGN_ITEMS: Array<{ alignment: Alignment; label: string; icon: ReactNode }> = [
  { alignment: "left", label: "Align left", icon: <AlignLeftIcon /> },
  { alignment: "center", label: "Align centers horizontally", icon: <AlignCenterIcon /> },
  { alignment: "right", label: "Align right", icon: <AlignRightIcon /> },
  { alignment: "top", label: "Align top", icon: <AlignTopIcon /> },
  { alignment: "middle", label: "Align centers vertically", icon: <AlignMiddleIcon /> },
  { alignment: "bottom", label: "Align bottom", icon: <AlignBottomIcon /> },
];

// The sides that a resize handle moves
type Edges = { left?: boolean; right?: boolean; top?: boolean; bottom?: boolean };

const RESIZE_HANDLES: Array<{ edges: Edges; cursor: string }> = [
  { edges: { top: true }, cursor: "ns-resize" },
  { edges: { bottom: true }, cursor: "ns-resize" },
  { edges: { left: true }, cursor: "ew-resize" },
  { edges: { right: true }, cursor: "ew-resize" },
  { edges: { top: true, left: true }, cursor: "nwse-resize" },
  { edges: { top: true, right: true }, cursor: "nesw-resize" },
  { edges: { bottom: true, left: true }, cursor: "nesw-resize" },
  { edges: { bottom: true, right: true }, cursor: "nwse-resize" },
];

// The image grows to the right and down, so that the windows keep their places
const IMAGE_HANDLES: Array<{ edges: Edges; cursor: string }> = [
  { edges: { right: true }, cursor: "ew-resize" },
  { edges: { bottom: true }, cursor: "ns-resize" },
  { edges: { bottom: true, right: true }, cursor: "nwse-resize" },
];

// Size of the resize handles in screen pixels, and their distance from the window, as the outline has
const CORNER_SIZE = 9;
const EDGE_SIZE = 8;
const HANDLE_OFFSET = 5;

/** The place of a resize handle in image pixels, so that it keeps its size on the screen */
function handleStyle(box: Box, edges: Edges, zoom: number): CSSProperties {
  const corner = (edges.left || edges.right) && (edges.top || edges.bottom);
  const size = (corner ? CORNER_SIZE : EDGE_SIZE) / zoom;
  const offset = HANDLE_OFFSET / zoom + size / 2;
  const x = edges.left ? box.x - offset : edges.right ? box.x + box.width + offset - size : box.x;
  const y = edges.top ? box.y - offset : edges.bottom ? box.y + box.height + offset - size : box.y;
  return {
    left: x,
    top: y,
    width: edges.left || edges.right ? size : box.width,
    height: edges.top || edges.bottom ? size : box.height,
  };
}

function intersects(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** Puts a copy of a window in front of it, and selects the copy */
function duplicate(
  spec: SpecInput,
  windowIndex: number,
  onChange: (update: SpecUpdate) => void,
  onSelect: (windowIndex: number) => void,
) {
  const { index } = duplicateWindow(spec, windowIndex);
  onChange((current) => duplicateWindow(current, windowIndex).spec);
  onSelect(index);
}

/** Changes a popover of a pane. A change to undefined removes the popover. */
function changeAnnotation(
  spec: SpecInput,
  windowIndex: number,
  paneIndex: number,
  index: number,
  change: (annotation: Annotation) => Annotation | undefined,
): SpecInput {
  return updatePane(spec, windowIndex, paneIndex, (pane) => ({
    ...pane,
    annotations: (pane.annotations ?? []).flatMap((old, i) => {
      if (i !== index) return [old];
      const next = change(old);
      return next ? [next] : [];
    }),
  }));
}

/** Moves a window to another layer, and keeps the window selected at its new index */
function changeLayer(
  spec: SpecInput,
  windowIndex: number,
  layer: Layer,
  onChange: (update: SpecUpdate) => void,
  onSelect: (windowIndex: number) => void,
) {
  if (!canMoveLayers(spec)) return;
  const { index } = moveLayer(spec, windowIndex, layer);
  onChange((current) => moveLayer(current, windowIndex, layer).spec);
  onSelect(index);
}

/** Inserts two spaces for the Tab key, so that the editor keeps the focus */
export function insertSpaces(
  event: KeyboardEvent<HTMLTextAreaElement>,
  onChange: (code: string) => void,
) {
  if (event.key !== "Tab" || event.shiftKey) return;
  event.preventDefault();
  const target = event.currentTarget;
  const { selectionStart, selectionEnd, value } = target;
  onChange(`${value.slice(0, selectionStart)}  ${value.slice(selectionEnd)}`);
  requestAnimationFrame(() => target.setSelectionRange(selectionStart + 2, selectionStart + 2));
}

function useSize<ELEMENT extends HTMLElement>() {
  const ref = useRef<ELEMENT>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry!.contentRect.width, height: entry!.contentRect.height }),
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}

/**
 * Follows the pointer from a pointerdown until it is released. The callback gets the distance
 * in image pixels, at most once per frame.
 */
function drag(
  event: PointerEvent<HTMLElement>,
  zoom: number,
  onMove: (dx: number, dy: number) => void,
  onEnd?: () => void,
) {
  if (event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  const target = event.currentTarget;
  target.setPointerCapture(event.pointerId);
  const { clientX, clientY } = event;
  let frame = 0;
  let pending: (() => void) | undefined;
  const move = (moved: globalThis.PointerEvent) => {
    cancelAnimationFrame(frame);
    pending = () => onMove((moved.clientX - clientX) / zoom, (moved.clientY - clientY) / zoom);
    frame = requestAnimationFrame(() => {
      pending?.();
      pending = undefined;
    });
  };
  const end = () => {
    // The last move runs before the end, so that the end has the last word
    cancelAnimationFrame(frame);
    pending?.();
    target.removeEventListener("pointermove", move);
    target.removeEventListener("pointerup", end);
    target.removeEventListener("pointercancel", end);
    onEnd?.();
  };
  target.addEventListener("pointermove", move);
  target.addEventListener("pointerup", end);
  target.addEventListener("pointercancel", end);
}

/** CSS of a text editor that puts its characters on the cell grid of the image */
function gridText(scene: Scene, text: TextMetrics): CSSProperties {
  const face = getFace(scene.font);
  return {
    fontFamily: `ci-${scene.font.id}`,
    fontWeight: face.weight,
    fontSize: text.fontSize,
    lineHeight: `${text.lineHeight}px`,
    letterSpacing:
      text.cellWidth - (scene.font.metrics.advance / scene.font.metrics.unitsPerEm) * text.fontSize,
    caretColor: scene.syntax.foreground,
  };
}

type Menu = {
  x: number;
  y: number;
  /** The window below the pointer, or undefined for a right-click on the background */
  windowIndex?: number;
  /** The popover below the pointer, by the index of its pane and its index in the pane */
  popover?: { pane: number; annotation: number };
  /** The code below the pointer, for a right-click on the code */
  code?: {
    paneIndex: number;
    start: number;
    end: number;
    /** The line below the pointer, for a right-click without a selection */
    line: number;
  };
};

type EditProps = {
  rendered: Rendered;
  spec: SpecInput;
  zoom: number;
  onChange: (update: SpecUpdate) => void;
};

function CodeEditor(
  props: EditProps & {
    pane: PaneBox;
    windowIndex: number;
    paneIndex: number;
    onMenu: (menu: Menu) => void;
  },
) {
  const { rendered, spec, pane, windowIndex, paneIndex, zoom, onChange } = props;
  const { scene } = rendered;
  const { text } = scene;
  const paneSpec = spec.windows[windowIndex]?.panes[paneIndex];
  const code = paneSpec?.code ?? "";
  const lineCount = Math.max(pane.lines.length, code.split("\n").length);

  const style: CSSProperties = {
    left: pane.code.x + pane.gutter,
    top: pane.code.y + EDITOR_PADDING,
    width: Math.max(pane.code.width - pane.gutter - EDITOR_PADDING, text.cellWidth * 4),
    height: lineCount * text.lineHeight,
    ...gridText(scene, text),
  };

  const update = (change: (pane: PaneInput) => PaneInput) =>
    onChange((current) => updatePane(current, windowIndex, paneIndex, change));
  const setCode = (next: string) => update((pane) => withCode(pane, next));

  const panel = useStylePanel(
    code,
    { left: Number(style.left), top: Number(style.top) },
    text,
    zoom,
  );
  const updateMarks = (change: (marked: Marked) => Marked) =>
    update((pane) => ({ ...pane, ...change(pane) }));

  const lineAt = (event: MouseEvent<HTMLTextAreaElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return Math.floor((event.clientY - bounds.top) / zoom / text.lineHeight) + 1;
  };

  // Option+click toggles the highlight of a line, as in ray.so
  const onMouseDown = (event: MouseEvent<HTMLTextAreaElement>) => {
    if (!event.altKey) return;
    event.preventDefault();
    const line = lineAt(event);
    if (line < 1 || line > pane.lines.length) return;
    update((pane) => toggleHighlight(pane, line));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Shift+Option+F formats the code, as in VS Code
    if (event.shiftKey && event.altKey && event.code === "KeyF") {
      event.preventDefault();
      if (paneSpec) formatPane(paneSpec);
      return;
    }
    if (applyMarkShortcut(event, updateMarks)) return;
    insertSpaces(event, setCode);
  };

  const formatPane = (pane: PaneInput) => {
    const language = paneLanguage(pane);
    if (!canFormat(language)) return;
    formatCode(pane.code, language).then(
      (code) => setFormatted(pane.code, code),
      () => {},
    );
  };

  const setFormatted = (input: string, formatted: string) =>
    update((pane) => withFormattedCode(pane, input, formatted));

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (paneSpec) pasteAndFormat(event, paneLanguage(paneSpec), setCode, setFormatted);
  };

  return (
    <>
      <textarea
        aria-label={`Code of window ${windowIndex + 1}, pane ${paneIndex + 1}`}
        {...panel.fieldProps}
        onFocus={panel.track}
        className="overlay overlay-code"
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        style={style}
        value={code}
        onChange={(event) => setCode(event.target.value)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onMouseDown={onMouseDown}
        onContextMenu={(event) => {
          event.preventDefault();
          const { selectionStart, selectionEnd } = event.currentTarget;
          props.onMenu({
            x: event.clientX,
            y: event.clientY,
            windowIndex,
            code: {
              paneIndex,
              start: selectionStart,
              end: selectionEnd,
              line: Math.min(Math.max(1, lineAt(event)), pane.lines.length),
            },
          });
        }}
        // The rendered image is the visible text, so the textarea must never scroll away from it
        onScroll={(event) => {
          event.currentTarget.scrollTop = 0;
          event.currentTarget.scrollLeft = 0;
        }}
      />
      {paneSpec && panel.selection && (
        <MarkPanel
          pane={paneSpec}
          parts={panel.parts}
          selection={panel.selection}
          style={panel.panelStyle()}
          onChange={updateMarks}
        />
      )}
    </>
  );
}

// Space behind the text of a title field for the caret and the next character
const TITLE_SLACK = 12;

/** A title field is only as wide as its text, so that the rest of the bar moves the window */
function titleWidth(text: string, fontSize: number, available: number, spacing = 0): number {
  const width = measureUiText(text, fontSize) + spacing * text.length + TITLE_SLACK;
  return Math.max(0, Math.min(available, Math.ceil(width)));
}

function TitleInput(props: {
  label: string;
  value: string;
  placeholder: string;
  style: CSSProperties;
  className: string;
  color: string;
  onChange: (value: string | undefined) => void;
  onContextMenu: (event: MouseEvent<HTMLElement>) => void;
}) {
  return (
    <input
      aria-label={props.label}
      className={`overlay ${props.className}`}
      spellCheck={false}
      value={props.value}
      placeholder={props.placeholder}
      style={
        { ...props.style, caretColor: props.color, "--placeholder": props.color } as CSSProperties
      }
      onChange={(event) => props.onChange(event.target.value || undefined)}
      onContextMenu={props.onContextMenu}
    />
  );
}

type Annotation = NonNullable<PaneInput["annotations"]>[number];

/**
 * The selected windows, or a popover by the index of the pane and the popover in the spec. A popover
 * is in the only selected window.
 */
export type Selection = {
  windows: Array<number>;
  popover?: { pane: number; annotation: number };
  /** Shift-click or a drag made the selection. It adds windows and does not open their settings. */
  added?: boolean;
};

/** The code of a popover, with the panel of styles and colors and the mark shortcuts */
function PopoverCodeField(props: {
  label: string;
  code: string;
  popover: Annotation | undefined;
  style: { left: number; top: number; width: number; height: number };
  scene: Scene;
  zoom: number;
  onFocus: () => void;
  onChange: (change: (marked: Marked) => Marked) => void;
}) {
  const { code, popover, scene, zoom, onChange } = props;
  const text = scene.popoverText;
  const panel = useStylePanel(code, props.style, text, zoom);
  const setCode = (next: string) => onChange((old) => withPopoverCode(old, next));
  return (
    <>
      <textarea
        aria-label={`Code of ${props.label}`}
        className="overlay overlay-code"
        spellCheck={false}
        style={{ ...props.style, ...gridText(scene, text) }}
        value={code}
        {...panel.fieldProps}
        onFocus={(event) => {
          props.onFocus();
          panel.track(event);
        }}
        onChange={(event) => setCode(event.target.value)}
        onKeyDown={(event) => {
          if (!applyMarkShortcut(event, onChange)) insertSpaces(event, setCode);
        }}
        onScroll={(event) => {
          event.currentTarget.scrollTop = 0;
          event.currentTarget.scrollLeft = 0;
        }}
      />
      {popover && panel.selection && (
        <MarkPanel
          pane={popover}
          parts={panel.parts}
          selection={panel.selection}
          style={panel.panelStyle()}
          onChange={onChange}
        />
      )}
    </>
  );
}

/** Editors for the popovers, at their places in the image, with handles to move, resize and remove them */
function PopoverEditors(
  props: EditProps & {
    window: WindowBox;
    windowIndex: number;
    selected: Selection | undefined;
    onSelect: (selection: Selection) => void;
    onMenu: (menu: Menu) => void;
  },
) {
  const { rendered, spec, window, windowIndex, zoom, onChange, selected } = props;
  const { scene } = rendered;
  const text = scene.popoverText;
  return window.panes.flatMap((pane, paneIndex) => {
    const paneSpec = spec.windows[windowIndex]?.panes[paneIndex];
    if (!paneSpec) return [];
    const indexes = visibleAnnotations(paneSpec);
    return pane.annotations.map((annotation, visibleIndex) => {
      const index = indexes[visibleIndex]!;
      const annotationSpec = paneSpec.annotations?.[index];
      const code = annotationSpec?.code ?? "";
      const { box } = annotation;
      const label = `popover ${index + 1} of window ${windowIndex + 1}, pane ${paneIndex + 1}`;

      const updateAnnotation = (change: (annotation: Annotation) => Annotation | undefined) =>
        onChange((current) => changeAnnotation(current, windowIndex, paneIndex, index, change));
      const isSelected =
        selected?.windows[0] === windowIndex &&
        selected.popover?.pane === paneIndex &&
        selected.popover.annotation === index;
      const popover = { pane: paneIndex, annotation: index };
      const select = () => props.onSelect({ windows: [windowIndex], popover });

      const move = (event: PointerEvent<HTMLElement>) => {
        select();
        const start = { x: annotationSpec?.offsetX ?? 0, y: annotationSpec?.offsetY ?? 0 };
        drag(event, zoom, (dx, dy) =>
          updateAnnotation((old) => ({
            ...old,
            offsetX: Math.round(start.x + dx),
            offsetY: Math.round(start.y + dy),
          })),
        );
      };
      const resize = (event: PointerEvent<HTMLElement>) =>
        drag(event, zoom, (dx, dy) =>
          updateAnnotation((old) => ({
            ...old,
            width: Math.round(Math.max(MIN_POPOVER_WIDTH, box.width + dx)),
            height: Math.round(Math.max(MIN_POPOVER_HEIGHT, box.height + dy)),
          })),
        );

      return (
        <div
          key={`${paneIndex}-${index}`}
          className={isSelected ? "hover-group selected" : "hover-group"}
        >
          <div
            className={isSelected ? "selection selected" : "selection"}
            style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
          />
          <div
            className="handle handle-popover"
            title="Drag to move the popover. Double-click to put it back below its text."
            style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
            onPointerDown={move}
            onDoubleClick={() => updateAnnotation(({ offsetX: _x, offsetY: _y, ...old }) => old)}
            onContextMenu={(event) => {
              event.preventDefault();
              select();
              props.onMenu({ x: event.clientX, y: event.clientY, windowIndex, popover });
            }}
          />
          <PopoverCodeField
            label={label}
            code={code}
            popover={annotationSpec}
            style={{
              left: box.x + POPOVER.paddingX,
              top: box.y + POPOVER.paddingY,
              width: Math.max(box.width - POPOVER.paddingX * 2, text.cellWidth * 4),
              height: Math.min(
                Math.max(1, code.split("\n").length) * text.lineHeight,
                Math.max(text.lineHeight, box.height - POPOVER.paddingY * 2),
              ),
            }}
            scene={scene}
            zoom={zoom}
            onFocus={select}
            onChange={(change) => updateAnnotation((old) => ({ ...old, ...change(old) }))}
          />
          <div
            className="handle handle-corner on-hover"
            title="Drag to resize the popover. Double-click to fit it to the code."
            style={{ left: box.x + box.width - 12, top: box.y + box.height - 12 }}
            onPointerDown={resize}
            onDoubleClick={() => updateAnnotation(({ width: _w, height: _h, ...old }) => old)}
          />
          <RemoveButton
            label={`Remove ${label}`}
            style={{ left: box.x + box.width - 9, top: box.y - 9 }}
            onClick={() => updateAnnotation(() => undefined)}
          />
        </div>
      );
    });
  });
}

function RemoveButton(props: { label: string; style: CSSProperties; onClick: () => void }) {
  return (
    <button
      type="button"
      className="remove on-hover"
      aria-label={props.label}
      title={props.label}
      style={props.style}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={props.onClick}
    >
      <CloseIcon />
    </button>
  );
}

function Tool(props: {
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="tool"
      aria-label={props.label}
      title={props.label}
      aria-pressed={props.pressed}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

function WindowEditors(
  props: EditProps & {
    window: WindowBox;
    windowIndex: number;
    /** The window has an outline */
    selected: boolean;
    /** The window is the only selected window, and shows its toolbar and resize handles */
    active: boolean;
    /** The pointer is on the window in the list of windows */
    hovered: boolean;
    /** The boxes of all popovers in the image, which the outline of the window does not cross */
    popovers: Array<Box>;
    onMenu: (menu: Menu) => void;
    onSelect: (windowIndex: number) => void;
    onPointerSelect: (event: PointerEvent<HTMLElement>, windowIndex: number) => void;
    onFocusSelect: (windowIndex: number) => void;
    onMoveStart: (event: PointerEvent<HTMLElement>, windowIndex: number) => void;
    /** Shows the lines that a resized window snaps to */
    onGuides: (guides: Array<Guide>) => void;
  },
) {
  const { window, windowIndex, spec, zoom, onChange, rendered } = props;
  const windowSpec = spec.windows[windowIndex];
  if (!windowSpec) return null;
  const titleColor = rendered.scene.frame.title;
  const split = windowSpec.split ?? "row";
  const canRemovePane = windowSpec.panes.length > 1;

  const change = (update: (window: WindowInput) => WindowInput) =>
    onChange((current) => updateWindow(current, windowIndex, update));
  const removePane = (paneIndex: number) =>
    change((old) => ({ ...old, panes: old.panes.filter((_, i) => i !== paneIndex) }));

  const titleTarget = titleBarTarget(windowSpec);
  const title = titleTarget === "pane" ? windowSpec.panes[0]?.title : windowSpec.title;
  const setTitle = (value: string | undefined) =>
    onChange((current) =>
      titleTarget === "pane"
        ? updatePane(current, windowIndex, 0, (pane) => ({ ...pane, title: value }))
        : updateWindow(current, windowIndex, (window) => ({ ...window, title: value })),
    );

  const bar = window.titleBar;
  const titleField = bar
    ? titleWidth(title || "Untitled", bar.fontSize, bar.title.width, bar.letterSpacing)
    : 0;

  const openMenu = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    props.onMenu({ x: event.clientX, y: event.clientY, windowIndex });
  };
  const moveStart = (event: PointerEvent<HTMLElement>) => props.onMoveStart(event, windowIndex);
  const addPane = (direction: "row" | "column") =>
    change((old) => ({
      ...old,
      split: direction,
      panes: [...old.panes, { title: "untitled.ts", code: "" }],
    }));
  const center = (axis: Axis) =>
    onChange((current) => centerWindow(current, rendered.scene, windowIndex, axis));
  const formattable = windowSpec.panes.some((pane) => canFormat(paneLanguage(pane)));

  // A resize at the left or the top moves the window too, so the window gets its place in the image
  const resizeWindow = (event: PointerEvent<HTMLElement>, edges: Edges) => {
    const { scene } = rendered;
    const moves = edges.left || edges.top;
    const base = !moves
      ? spec
      : isPositioned(spec)
        ? keepImageSize(spec, scene)
        : positionWindows(spec, scene);
    const start = {
      x: base.windows[windowIndex]?.x ?? window.x,
      y: base.windows[windowIndex]?.y ?? window.y,
      width: window.width,
      height: window.height,
    };
    const others = scene.windows.filter((_, index) => index !== windowIndex);
    const sides = {
      x: edges.left ? [0] : edges.right ? [1] : [],
      y: edges.top ? [0] : edges.bottom ? [1] : [],
    };
    drag(
      event,
      zoom,
      (dx, dy) => {
        let width = start.width + (edges.left ? -dx : dx);
        let height = start.height + (edges.top ? -dy : dy);
        // The moved edges snap to the center of the image and to the other windows
        const box = {
          x: edges.left ? window.x + window.width - width : window.x,
          y: edges.top ? window.y + window.height - height : window.y,
          width,
          height,
        };
        const snapped = snapBox(box, others, scene, SNAP_DISTANCE / zoom, sides);
        width += edges.left ? -snapped.dx : snapped.dx;
        height += edges.top ? -snapped.dy : snapped.dy;
        width = Math.max(MIN_WINDOW_SIZE, width);
        height = Math.max(MIN_WINDOW_SIZE, height);
        props.onGuides(snapped.guides);
        const resize = (old: WindowInput): WindowInput => ({
          ...old,
          ...((edges.left || edges.right) && { width: Math.round(width) }),
          ...((edges.top || edges.bottom) && { height: Math.round(height) }),
          ...(edges.left && { x: Math.round(start.x + start.width - width) }),
          ...(edges.top && { y: Math.round(start.y + start.height - height) }),
        });
        if (moves) onChange(updateWindow(base, windowIndex, resize));
        else change(resize);
      },
      () => props.onGuides([]),
    );
  };

  // Moves the divider between two panes. The two panes share their space, so the window keeps its size.
  const resizePanes = (event: PointerEvent<HTMLElement>, index: number) => {
    const sizes = window.panes.map((pane) => (split === "row" ? pane.width : pane.height));
    const total = sizes[index]! + sizes[index + 1]!;
    drag(event, zoom, (dx, dy) => {
      const first = Math.round(
        Math.min(
          total - MIN_PANE_SIZE,
          Math.max(MIN_PANE_SIZE, sizes[index]! + (split === "row" ? dx : dy)),
        ),
      );
      change((old) => ({
        ...old,
        panes: old.panes.map((pane, i) =>
          i === index
            ? { ...pane, size: first }
            : i === index + 1
              ? { ...pane, size: total - first }
              : pane,
        ),
      }));
    });
  };

  return (
    <div
      className="hover-group"
      // Every pointer press and focus in the window selects it, also in its title and its code
      onPointerDownCapture={(event) => props.onPointerSelect(event, windowIndex)}
      // Shift adds the window to the selection, and does not put the cursor into its text
      onMouseDownCapture={(event) => event.shiftKey && event.preventDefault()}
      onFocusCapture={() => props.onFocusSelect(windowIndex)}
    >
      <div
        className={
          props.selected ? "selection selected" : props.hovered ? "selection hovered" : "selection"
        }
        style={{
          ...selectionStyle(window),
          // The outline follows the corners of the window, which the frame of the theme gives
          borderRadius: window.radius,
          clipPath: outsideOf(window, props.popovers),
        }}
      />
      <div
        className="handle window-hit"
        title="Drag to move the window"
        style={{ left: window.x, top: window.y, width: window.width, height: window.height }}
        onPointerDown={moveStart}
        onContextMenu={openMenu}
      />
      {window.header && (
        <div
          className="handle handle-header"
          title="Drag to move the window"
          style={{
            left: window.header.x,
            top: window.header.y,
            width: window.header.width,
            height: window.header.height,
          }}
          onPointerDown={moveStart}
          onContextMenu={openMenu}
        />
      )}
      {bar?.controls && (
        <button
          type="button"
          className="window-controls"
          aria-label="Switch the colors of the window controls"
          title="Click to switch the colors of the window controls"
          style={{
            left: bar.controls.x - 4,
            top: bar.controls.y,
            width: bar.controls.width + 8,
            height: bar.controls.height,
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() =>
            change((old) => ({
              ...old,
              controls: old.controls === "color" ? undefined : "color",
            }))
          }
        />
      )}
      {bar && (
        <TitleInput
          label={`Title of window ${windowIndex + 1}`}
          className="overlay-title"
          value={title ?? ""}
          placeholder="Untitled"
          color={titleColor}
          style={{
            left:
              bar.align === "center"
                ? bar.title.x + (bar.title.width - titleField) / 2
                : bar.title.x,
            top: bar.title.y,
            width: titleField,
            height: bar.title.height,
            fontSize: bar.fontSize,
            fontWeight: bar.fontWeight,
            letterSpacing: bar.letterSpacing,
            textAlign: bar.align,
            ...(bar.font === "code" && { fontFamily: `ci-${rendered.scene.font.id}` }),
          }}
          onChange={setTitle}
          onContextMenu={openMenu}
        />
      )}
      {window.panes.map((pane, paneIndex) => {
        const tab = pane.tab;
        const paneSpec = windowSpec.panes[paneIndex];
        const iconWidth = pane.icon ? TAB_HEADER.icon + TAB_HEADER.iconGap : 0;
        const removeWidth = canRemovePane ? REMOVE_SIZE + 4 : 0;
        const label = `pane ${paneIndex + 1} of window ${windowIndex + 1}`;
        return (
          <div key={paneIndex}>
            {tab && pane.icon && paneSpec && (
              <Select
                label={`Tab icon of ${label}`}
                hideLabel
                searchable
                className="overlay-select"
                style={{
                  left: tab.x + TAB_HEADER.paddingX - 3,
                  top: tab.y + (tab.height - TAB_HEADER.icon) / 2 - 3,
                  width: TAB_HEADER.icon + 6,
                  height: TAB_HEADER.icon + 6,
                }}
                trigger={<span />}
                value={paneSpec.icon ?? AUTO_ICON}
                options={iconOptions(pane.language)}
                onChange={(icon) =>
                  onChange((current) =>
                    updatePane(current, windowIndex, paneIndex, (pane) => ({ ...pane, icon })),
                  )
                }
              />
            )}
            {tab && (
              <TitleInput
                label={`File name of ${label}`}
                className="overlay-tab"
                value={paneSpec?.title ?? ""}
                placeholder="untitled"
                color={titleColor}
                style={{
                  left: tab.x + TAB_HEADER.paddingX + iconWidth,
                  top: tab.y,
                  width: titleWidth(
                    paneSpec?.title || "untitled",
                    TAB_HEADER.titleSize,
                    tab.width - TAB_HEADER.paddingX * 2 - iconWidth - removeWidth,
                  ),
                  height: tab.height,
                }}
                onChange={(value) =>
                  onChange((current) =>
                    updatePane(current, windowIndex, paneIndex, (pane) => ({
                      ...pane,
                      title: value,
                    })),
                  )
                }
                onContextMenu={openMenu}
              />
            )}
            <CodeEditor {...props} pane={pane} paneIndex={paneIndex} />
            {canRemovePane && (
              <RemoveButton
                label={`Remove ${label}`}
                style={
                  tab
                    ? {
                        left: tab.x + tab.width - TAB_HEADER.paddingX - REMOVE_SIZE + 4,
                        top: tab.y + (tab.height - REMOVE_SIZE) / 2,
                      }
                    : { left: pane.x + pane.width - REMOVE_SIZE - 6, top: pane.y + 6 }
                }
                onClick={() => removePane(paneIndex)}
              />
            )}
          </div>
        );
      })}
      {window.dividers.map((divider, index) => (
        <div
          key={index}
          className={`handle handle-divider ${split}`}
          title="Drag to resize the panes. Double-click to fit them to the code."
          style={
            split === "row"
              ? { left: divider.x1 - 4, top: divider.y1, width: 8, height: divider.y2 - divider.y1 }
              : { left: divider.x1, top: divider.y1 - 4, width: divider.x2 - divider.x1, height: 8 }
          }
          onPointerDown={(event) => resizePanes(event, index)}
          onDoubleClick={() =>
            change((old) => ({ ...old, panes: old.panes.map(({ size: _size, ...pane }) => pane) }))
          }
        />
      ))}
      {props.active && (
        <>
          {RESIZE_HANDLES.map(({ edges, cursor }) => (
            <div
              key={Object.keys(edges).join("-")}
              className={
                (edges.left || edges.right) && (edges.top || edges.bottom)
                  ? "handle resize-handle corner"
                  : "handle resize-handle"
              }
              title="Drag to resize the window. Double-click to fit it to the code."
              style={{ ...handleStyle(window, edges, zoom), cursor }}
              onPointerDown={(event) => resizeWindow(event, edges)}
              onDoubleClick={() => change(({ width: _w, height: _h, ...old }) => old)}
            />
          ))}
          <div
            className="window-toolbar"
            role="toolbar"
            aria-label={`Window ${windowIndex + 1}`}
            // The toolbar keeps its size on the screen at every zoom of the preview
            style={{
              left: window.x + window.width / 2,
              top: window.y - 10 / zoom,
              transform: `translate(-50%, -100%) scale(${1 / zoom})`,
            }}
          >
            <Tool label="Add a pane to the right" onClick={() => addPane("row")}>
              <SplitRowIcon />
            </Tool>
            <Tool label="Add a pane below" onClick={() => addPane("column")}>
              <SplitColumnIcon />
            </Tool>
            <span className="tool-separator" />
            <Tool label="Center horizontally" onClick={() => center("horizontal")}>
              <CenterHorizontalIcon />
            </Tool>
            <Tool label="Center vertically" onClick={() => center("vertical")}>
              <CenterVerticalIcon />
            </Tool>
            {canMoveLayers(spec) && (
              <>
                <span className="tool-separator" />
                <Tool
                  label="Bring to front (⌘⇧])"
                  disabled={windowIndex === spec.windows.length - 1}
                  onClick={() => changeLayer(spec, windowIndex, "front", onChange, props.onSelect)}
                >
                  <BringToFrontIcon />
                </Tool>
                <Tool
                  label="Send to back (⌘⇧[)"
                  disabled={windowIndex === 0}
                  onClick={() => changeLayer(spec, windowIndex, "back", onChange, props.onSelect)}
                >
                  <SendToBackIcon />
                </Tool>
              </>
            )}
            <span className="tool-separator" />
            <Tool
              label="Format the code (⇧⌥F)"
              disabled={!formattable}
              onClick={() => formatPanes(spec, [windowIndex], onChange)}
            >
              <FormatIcon />
            </Tool>
            <Tool
              label="Remove the window"
              disabled={spec.windows.length < 2}
              onClick={() => onChange((current) => removeWindows(current, [windowIndex]))}
            >
              <TrashIcon />
            </Tool>
          </div>
        </>
      )}
    </div>
  );
}

type Box = { x: number; y: number; width: number; height: number };

function selectionStyle(box: Box): CSSProperties {
  return { left: box.x, top: box.y, width: box.width, height: box.height };
}

/**
 * A clip path that cuts the popovers out of the outline of a window. The popovers are a part of the
 * image below the outline, so without the cut the outline would cross them.
 */
function outsideOf(window: Box, popovers: Array<Box>): string | undefined {
  if (popovers.length === 0) return undefined;
  const far = 1_000;
  const outer = `M${-far},${-far}H${window.width + far}V${window.height + far}H${-far}Z`;
  const holes = popovers.map(
    (box) => `M${box.x - window.x},${box.y - window.y}h${box.width}v${box.height}h${-box.width}Z`,
  );
  return `path(evenodd, "${outer}${holes.join("")}")`;
}

/** Formats the code of the panes that have a formatter. Code that does not parse stays as it is. */
export function formatPanes(
  spec: SpecInput,
  windowIndexes: Array<number>,
  onChange: (update: SpecUpdate) => void,
) {
  for (const windowIndex of windowIndexes) {
    spec.windows[windowIndex]?.panes.forEach((pane, paneIndex) => {
      const language = paneLanguage(pane);
      if (!canFormat(language)) return;
      formatCode(pane.code, language).then(
        (code) =>
          onChange((current) =>
            updatePane(current, windowIndex, paneIndex, (next) =>
              withFormattedCode(next, pane.code, code),
            ),
          ),
        () => {},
      );
    });
  }
}

/** What the menus and the toolbar of the selected windows can do */
type Actions = {
  spec: SpecInput;
  scene: Scene;
  /** The selected windows */
  windows: Array<number>;
  onChange: (update: SpecUpdate) => void;
  onSelect: (selection: Selection | undefined) => void;
  /** Copies some windows as an image, or the full image without windows */
  onCopyImage: (windowIndexes?: Array<number>) => void;
  onAddWindow: () => void;
};

function windowItems(actions: Actions, windowIndex: number): Array<MenuItem> {
  const { spec, scene, onChange, onSelect, onCopyImage } = actions;
  const window = spec.windows[windowIndex];
  const formattable = (window?.panes ?? []).some((pane) => canFormat(paneLanguage(pane)));
  const selectWindow = (index: number) => onSelect({ windows: [index] });
  const center = (axis: Axis) =>
    onChange((current) => centerWindow(current, scene, windowIndex, axis));
  return [
    {
      label: "Duplicate window",
      shortcut: "⌘D",
      onSelect: () => duplicate(spec, windowIndex, onChange, selectWindow),
    },
    {
      label: "Fit window to code",
      disabled: window?.width === undefined && window?.height === undefined,
      onSelect: () =>
        onChange((current) =>
          updateWindow(current, windowIndex, ({ width: _w, height: _h, ...old }) => old),
        ),
    },
    {
      label: "Reset position",
      disabled: window?.x === undefined && window?.y === undefined,
      onSelect: () =>
        onChange((current) =>
          updateWindow(current, windowIndex, ({ x: _x, y: _y, ...old }) => old),
        ),
    },
    { label: "Center horizontally", onSelect: () => center("horizontal") },
    { label: "Center vertically", onSelect: () => center("vertical") },
    "separator",
    ...LAYER_ITEMS.map(({ layer, label, shortcut }) => ({
      label,
      shortcut,
      disabled:
        !canMoveLayers(spec) ||
        (layer === "front" || layer === "forward"
          ? windowIndex === spec.windows.length - 1
          : windowIndex === 0),
      onSelect: () => changeLayer(spec, windowIndex, layer, onChange, selectWindow),
    })),
    "separator",
    {
      label: "Format code of the window",
      disabled: !formattable,
      onSelect: () => formatPanes(spec, [windowIndex], onChange),
    },
    {
      label: "Remove window",
      shortcut: "⌫",
      disabled: spec.windows.length < 2,
      onSelect: () => {
        onChange((current) => removeWindows(current, [windowIndex]));
        onSelect(undefined);
      },
    },
    "separator",
    { label: "Copy image of the window", onSelect: () => onCopyImage([windowIndex]) },
    { label: "Copy image", onSelect: () => onCopyImage() },
  ];
}

function groupItems(actions: Actions): Array<MenuItem> {
  const { spec, scene, windows, onChange, onCopyImage } = actions;
  return [
    ...ALIGN_ITEMS.map(({ alignment, label }) => ({
      label,
      onSelect: () => onChange((current) => alignWindows(current, scene, windows, alignment)),
    })),
    "separator",
    ...(["horizontal", "vertical"] as const).map((axis) => ({
      label: `Distribute ${axis}ly`,
      disabled: windows.length < 3,
      onSelect: () => onChange((current) => distributeWindows(current, scene, windows, axis)),
    })),
    "separator",
    {
      label: `Remove ${windows.length} windows`,
      shortcut: "⌫",
      disabled: windows.length >= spec.windows.length,
      onSelect: () => {
        onChange((current) => removeWindows(current, windows));
        actions.onSelect(undefined);
      },
    },
    "separator",
    { label: `Copy image of ${windows.length} windows`, onSelect: () => onCopyImage(windows) },
    { label: "Copy image", onSelect: () => onCopyImage() },
  ];
}

function backgroundItems(actions: Actions): Array<MenuItem> {
  const { spec, onChange, onSelect } = actions;
  return [
    { label: "Add window", onSelect: actions.onAddWindow },
    {
      label: "Select all windows",
      shortcut: "⌘A",
      onSelect: () => onSelect({ windows: spec.windows.map((_, index) => index) }),
    },
    "separator",
    {
      label: "Reset layout",
      disabled: !isPositioned(spec),
      onSelect: () => onChange(resetPositions),
    },
    "separator",
    { label: "Copy image", onSelect: () => actions.onCopyImage() },
  ];
}

function popoverItems(
  actions: Actions,
  windowIndex: number,
  popover: NonNullable<Menu["popover"]>,
): Array<MenuItem> {
  const { spec, onChange } = actions;
  const annotation =
    spec.windows[windowIndex]?.panes[popover.pane]?.annotations?.[popover.annotation];
  if (!annotation) return [];
  const update = (change: (annotation: Annotation) => Annotation | undefined) =>
    onChange((current) =>
      changeAnnotation(current, windowIndex, popover.pane, popover.annotation, change),
    );
  return [
    {
      label: "Reset position",
      disabled: (annotation.offsetX ?? 0) === 0 && (annotation.offsetY ?? 0) === 0,
      onSelect: () => update(({ offsetX: _x, offsetY: _y, ...old }) => old),
    },
    {
      label: "Fit popover to code",
      disabled: annotation.width === undefined && annotation.height === undefined,
      onSelect: () => update(({ width: _w, height: _h, ...old }) => old),
    },
    "separator",
    {
      label: "Remove popover",
      shortcut: "⌫",
      onSelect: () => {
        update(() => undefined);
        actions.onSelect({ windows: [windowIndex] });
      },
    },
  ];
}

function codeItems(
  spec: SpecInput,
  windowIndex: number,
  code: NonNullable<Menu["code"]>,
  onChange: (update: SpecUpdate) => void,
): Array<MenuItem> {
  const pane = spec.windows[windowIndex]?.panes[code.paneIndex];
  if (!pane) return [];
  const update = (change: (pane: PaneInput) => PaneInput) =>
    onChange((current) => updatePane(current, windowIndex, code.paneIndex, change));

  const selected = code.end > code.start;
  const [from, to] = selected
    ? selectionLines(pane.code, code.start, code.end)
    : [code.line, code.line];
  const parts = selectionParts(pane.code, code.start, code.end);
  const highlighted = isHighlighted(pane, from, to);
  const lines = from === to ? `line ${from}` : `lines ${from}–${to}`;
  const part = parts.length === 1 ? parts[0] : undefined;
  const annotation = part ? annotationAt(pane, part) : -1;
  const language = paneLanguage(pane);

  return [
    {
      label: highlighted ? `Remove highlight of ${lines}` : `Highlight ${lines}`,
      onSelect: () => update((pane) => toggleHighlightRange(pane, from, to)),
    },
    "separator",
    {
      label: "Clear styles",
      disabled: !selected || (pane.marks ?? []).length === 0,
      onSelect: () => update((pane) => clearMarks(pane, code.start, code.end)),
    },
    "separator",
    annotation === -1
      ? {
          label: "Add popover",
          disabled: !part,
          onSelect: () =>
            update((pane) => ({
              ...pane,
              annotations: [...(pane.annotations ?? []), { ...part!, code: part!.match }],
            })),
        }
      : {
          label: "Remove popover",
          onSelect: () =>
            update((pane) => ({
              ...pane,
              annotations: (pane.annotations ?? []).filter((_, i) => i !== annotation),
            })),
        },
    "separator",
    {
      label: "Format code",
      shortcut: "⇧⌥F",
      disabled: !canFormat(language),
      onSelect: () =>
        void formatCode(pane.code, language).then(
          (code) => update((next) => withFormattedCode(next, pane.code, code)),
          () => {},
        ),
    },
  ];
}

function menuItems(actions: Actions, menu: Menu): Array<MenuItem> {
  const { windowIndex } = menu;
  if (windowIndex === undefined) return backgroundItems(actions);
  if (menu.popover) return popoverItems(actions, windowIndex, menu.popover);
  const group = actions.windows.length > 1 && actions.windows.includes(windowIndex);
  if (group && !menu.code) return groupItems(actions);
  const window = windowItems(actions, windowIndex);
  if (!menu.code) return window;
  return [
    ...codeItems(actions.spec, windowIndex, menu.code, actions.onChange),
    "separator",
    ...window.slice(-2),
  ];
}

/** The toolbar above the selected windows */
function GroupToolbar(props: { actions: Actions; zoom: number }) {
  const { spec, scene, windows, onChange, onSelect, onCopyImage } = props.actions;
  const boxes = windows.flatMap((index) => scene.windows[index] ?? []);
  if (boxes.length < 2) return null;
  const bounds = boundsOf(boxes);
  return (
    <div
      className="window-toolbar"
      role="toolbar"
      aria-label={`${windows.length} windows`}
      style={{
        left: bounds.x + bounds.width / 2,
        top: bounds.y - 10 / props.zoom,
        transform: `translate(-50%, -100%) scale(${1 / props.zoom})`,
      }}
    >
      {ALIGN_ITEMS.map(({ alignment, label, icon }, index) => (
        <span key={alignment} className="tool-group">
          {index === 3 && <span className="tool-separator" />}
          <Tool
            label={label}
            onClick={() => onChange((current) => alignWindows(current, scene, windows, alignment))}
          >
            {icon}
          </Tool>
        </span>
      ))}
      <span className="tool-separator" />
      <Tool
        label="Distribute horizontally"
        disabled={windows.length < 3}
        onClick={() =>
          onChange((current) => distributeWindows(current, scene, windows, "horizontal"))
        }
      >
        <DistributeHorizontalIcon />
      </Tool>
      <Tool
        label="Distribute vertically"
        disabled={windows.length < 3}
        onClick={() =>
          onChange((current) => distributeWindows(current, scene, windows, "vertical"))
        }
      >
        <DistributeVerticalIcon />
      </Tool>
      <span className="tool-separator" />
      <Tool label={`Copy image of ${windows.length} windows`} onClick={() => onCopyImage(windows)}>
        <CopyIcon />
      </Tool>
      <Tool
        label={`Remove ${windows.length} windows`}
        disabled={windows.length >= spec.windows.length}
        onClick={() => {
          onChange((current) => removeWindows(current, windows));
          onSelect(undefined);
        }}
      >
        <TrashIcon />
      </Tool>
    </div>
  );
}

function isHighlighted(pane: PaneInput, from: number, to: number): boolean {
  const lines = expandLineRanges(pane.highlight ?? []);
  for (let line = from; line <= to; line++) if (!lines.has(line)) return false;
  return true;
}

/** The next zoom step in a direction, from the current zoom */
function zoomStep(zoom: number, direction: 1 | -1): number {
  const steps = direction === 1 ? ZOOM_STEPS : [...ZOOM_STEPS].reverse();
  return steps.find((step) => (direction === 1 ? step > zoom + 0.01 : step < zoom - 0.01)) ?? zoom;
}

/** The rendered image, with editors for the code and the titles at their places in the image */
export function Preview(props: {
  rendered: Rendered | undefined;
  spec: SpecInput;
  stale: boolean;
  selected: Selection | undefined;
  onSelect: (selection: Selection | undefined) => void;
  onChange: (update: SpecUpdate) => void;
  /** Copies some windows as an image, or the full image without windows */
  onCopyImage: (windowIndexes?: Array<number>) => void;
  /** The window that the pointer is on in the list of windows */
  hovered?: number;
}) {
  const [stageRef, stage] = useSize<HTMLDivElement>();
  const contentRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<Menu>();
  const [guides, setGuides] = useState<Array<Guide>>([]);
  // The box that a drag on the background draws, in image pixels
  const [marquee, setMarquee] = useState<Box>();
  // A number is a zoom that the user set, and undefined fits the image into the stage
  const [userZoom, setUserZoom] = useState<number>();
  const { rendered, spec, onChange, onSelect, onCopyImage } = props;
  const width = rendered?.scene.width ?? 0;
  const height = rendered?.scene.height ?? 0;
  const fitZoom =
    width > 0 && height > 0
      ? Math.min(
          MAX_ZOOM,
          Math.max(
            0.1,
            Math.min(
              (stage.width - STAGE_PADDING) / width,
              (stage.height - STAGE_PADDING - FOOTER_HEIGHT) / height,
            ),
          ),
        )
      : 1;
  const zoom = userZoom ?? fitZoom;
  const closeMenu = useCallback(() => setMenu(undefined), []);
  const popover = props.selected?.popover;
  const windows = props.selected && !popover ? props.selected.windows : [];
  const active = windows.length === 1 ? windows[0] : undefined;
  // The newest selection, for the handlers that run before the next render
  const windowsRef = useRef(windows);
  windowsRef.current = windows;

  const selectWindows = useCallback(
    (next: Array<number>, added = false) => {
      windowsRef.current = next;
      onSelect(next.length > 0 ? { windows: next, ...(added && { added }) } : undefined);
    },
    [onSelect],
  );
  const selectWindow = useCallback((window: number) => selectWindows([window]), [selectWindows]);
  const popovers = (rendered?.scene.windows ?? []).flatMap((window) =>
    window.panes.flatMap((pane) => pane.annotations.map((annotation) => annotation.box)),
  );

  const addWindow = () => {
    onChange((current) => ({
      ...current,
      windows: [...current.windows, { panes: [{ title: "untitled.ts", code: "" }] }],
    }));
    selectWindow(spec.windows.length);
  };

  const actions: Actions | undefined = rendered && {
    spec,
    scene: rendered.scene,
    windows,
    onChange,
    onSelect,
    onCopyImage,
    onAddWindow: addWindow,
  };

  // The shortcuts for the selection. In a text field, only the shortcuts that the field does not use work.
  useEffect(() => {
    if (menu) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const editing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable;
      const command = (event.metaKey || event.ctrlKey) && !event.altKey;
      const layer = layerShortcut(event);
      if (layer && active !== undefined) {
        event.preventDefault();
        changeLayer(spec, active, layer, onChange, selectWindow);
        return;
      }
      if (command && !event.shiftKey && event.code === "KeyD" && active !== undefined) {
        event.preventDefault();
        duplicate(spec, active, onChange, selectWindow);
        return;
      }
      if (editing) return;
      if (command && !event.shiftKey && event.code === "KeyA") {
        event.preventDefault();
        selectWindows(spec.windows.map((_, index) => index));
      } else if (event.key === "Escape") {
        onSelect(undefined);
      } else if (event.key === "Backspace" || event.key === "Delete") {
        const selected = props.selected;
        if (!selected) return;
        event.preventDefault();
        if (selected.popover) {
          const { pane, annotation } = selected.popover;
          const windowIndex = selected.windows[0]!;
          onChange((current) =>
            changeAnnotation(current, windowIndex, pane, annotation, () => undefined),
          );
          selectWindow(windowIndex);
        } else if (windows.length > 0 && windows.length < spec.windows.length) {
          onChange((current) => removeWindows(current, windows));
          onSelect(undefined);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    menu,
    spec,
    active,
    windows,
    props.selected,
    onChange,
    onSelect,
    selectWindow,
    selectWindows,
  ]);

  // ⌘C and ⌘V copy and paste the selected windows as spec text, outside of the text fields
  useEffect(() => {
    const inText = (event: globalThis.ClipboardEvent) => {
      const target = event.target as HTMLElement;
      return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      );
    };
    const onCopy = (event: globalThis.ClipboardEvent) => {
      if (inText(event) || windows.length === 0 || !event.clipboardData) return;
      event.preventDefault();
      event.clipboardData.setData("text/plain", copyWindows(spec, windows));
    };
    const onPaste = (event: globalThis.ClipboardEvent) => {
      if (inText(event)) return;
      const pasted = readCopiedWindows(event.clipboardData?.getData("text/plain") ?? "");
      if (!pasted) return;
      event.preventDefault();
      const { indexes } = pasteWindows(spec, pasted);
      onChange((current) => pasteWindows(current, pasted).spec);
      selectWindows(indexes);
    };
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
    };
  }, [spec, windows, onChange, selectWindows]);

  /**
   * Shift+click adds a window to the selection or removes it. A press on a window of the selection
   * keeps the selection, so that a drag moves all its windows. A press in a text selects only the
   * window.
   */
  const onPointerSelect = (event: PointerEvent<HTMLElement>, windowIndex: number) => {
    const current = windowsRef.current;
    const member = current.includes(windowIndex);
    if (event.shiftKey && event.button === 0) {
      selectWindows(
        member ? current.filter((index) => index !== windowIndex) : [...current, windowIndex],
        true,
      );
      return;
    }
    const onHandle = (event.target as Element).closest(".window-hit, .handle-header");
    if (member && (event.button === 2 || onHandle)) return;
    selectWindow(windowIndex);
  };

  const onFocusSelect = (windowIndex: number) => {
    if (!windowsRef.current.includes(windowIndex)) selectWindow(windowIndex);
  };

  // The first move gives every window its place, and then the windows keep their places
  const onMoveStart = (event: PointerEvent<HTMLElement>, windowIndex: number) => {
    if (!rendered) return;
    const { scene } = rendered;
    const current = windowsRef.current;
    const group = current.length > 1 && current.includes(windowIndex) ? current : [windowIndex];
    const base = isPositioned(spec) ? keepImageSize(spec, scene) : positionWindows(spec, scene);
    const starts = group.map((index) => ({
      index,
      x: base.windows[index]?.x ?? scene.windows[index]!.x,
      y: base.windows[index]?.y ?? scene.windows[index]!.y,
    }));
    const box = boundsOf(group.map((index) => scene.windows[index]!));
    const snap = SNAP_DISTANCE / zoom;
    const shift = event.shiftKey;
    let moved = false;
    drag(
      event,
      zoom,
      (dx, dy) => {
        // A click without a move keeps the layout as it is
        if (!moved && Math.hypot(dx, dy) * zoom < DRAG_THRESHOLD) return;
        moved = true;
        // The box around the windows snaps to the center of the image and to the other windows
        const others = scene.windows.filter((_, index) => !group.includes(index));
        const snapped = snapBox({ ...box, x: box.x + dx, y: box.y + dy }, others, scene, snap);
        dx += snapped.dx;
        dy += snapped.dy;
        setGuides(snapped.guides);
        let moving = base;
        for (const start of starts) {
          moving = updateWindow(moving, start.index, (window) => ({
            ...window,
            x: Math.round(start.x + dx),
            y: Math.round(start.y + dy),
          }));
        }
        onChange(moving);
      },
      () => {
        setGuides([]);
        // A click on a window of the selection selects only that window
        if (!moved && !shift && group.length > 1) selectWindow(windowIndex);
      },
    );
  };

  // A drag on the background selects the windows that its box touches. Shift adds them to the selection.
  const onBackgroundDown = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as Element;
    if (target !== event.currentTarget && !target.closest(".canvas-image")) return;
    const bounds = contentRef.current?.getBoundingClientRect();
    if (!rendered || !bounds || event.button !== 0) {
      onSelect(undefined);
      return;
    }
    (document.activeElement as HTMLElement | null)?.blur();
    const { scene } = rendered;
    const start = {
      x: (event.clientX - bounds.left) / zoom,
      y: (event.clientY - bounds.top) / zoom,
    };
    const additive = event.shiftKey;
    const before = additive ? windowsRef.current : [];
    let moved = false;
    drag(
      event,
      zoom,
      (dx, dy) => {
        if (!moved && Math.hypot(dx, dy) * zoom < DRAG_THRESHOLD) return;
        moved = true;
        const box = {
          x: Math.min(start.x, start.x + dx),
          y: Math.min(start.y, start.y + dy),
          width: Math.abs(dx),
          height: Math.abs(dy),
        };
        setMarquee(box);
        const touched = scene.windows.flatMap((window, index) =>
          intersects(window, box) ? [index] : [],
        );
        selectWindows([...new Set([...before, ...touched])], true);
      },
      () => {
        setMarquee(undefined);
        if (!moved && !additive) onSelect(undefined);
      },
    );
  };

  // A drag at an edge or the corner of the image sets its size, from the spec at the start
  const resizeImageStart = (event: PointerEvent<HTMLElement>, edges: Edges) => {
    if (!rendered) return;
    const { scene } = rendered;
    const start = spec;
    drag(event, zoom, (dx, dy) => {
      // With an aspect ratio, the corner follows the width, and the ratio gives the height
      const size = {
        ...(edges.right && { width: scene.width + dx }),
        ...(edges.bottom && !(edges.right && start.aspectRatio) && { height: scene.height + dy }),
      };
      onChange(resizeImage(start, scene, size));
    });
  };

  return (
    <div className="preview-frame">
      <div
        ref={stageRef}
        className={props.stale ? "preview stale" : "preview"}
        onPointerDown={onBackgroundDown}
        onContextMenu={(event) => {
          const target = event.target as Element;
          if (target !== event.currentTarget && !target.closest(".canvas-image")) return;
          event.preventDefault();
          setMenu({ x: event.clientX, y: event.clientY });
        }}
      >
        {rendered && (
          <div className="canvas" style={{ width: width * zoom, height: height * zoom }}>
            <div
              ref={contentRef}
              className="canvas-content"
              style={
                { width, height, transform: `scale(${zoom})`, "--zoom": zoom } as CSSProperties
              }
            >
              <div
                className="canvas-image"
                // The SVG comes from the renderer, which escapes all text of the spec
                dangerouslySetInnerHTML={{ __html: rendered.svg }}
              />
              {rendered.scene.windows.map((window, windowIndex) => (
                <WindowEditors
                  key={windowIndex}
                  rendered={rendered}
                  spec={spec}
                  zoom={zoom}
                  onChange={onChange}
                  window={window}
                  windowIndex={windowIndex}
                  selected={windows.includes(windowIndex)}
                  active={active === windowIndex}
                  hovered={props.hovered === windowIndex}
                  popovers={popovers}
                  onMenu={setMenu}
                  onSelect={selectWindow}
                  onPointerSelect={onPointerSelect}
                  onFocusSelect={onFocusSelect}
                  onMoveStart={onMoveStart}
                  onGuides={setGuides}
                />
              ))}
              {rendered.scene.windows.map((window, windowIndex) => (
                <PopoverEditors
                  key={windowIndex}
                  rendered={rendered}
                  spec={spec}
                  zoom={zoom}
                  onChange={onChange}
                  window={window}
                  windowIndex={windowIndex}
                  selected={props.selected}
                  onSelect={onSelect}
                  onMenu={setMenu}
                />
              ))}
              {actions && windows.length > 1 && (
                <>
                  <div
                    className="group-bounds"
                    style={selectionStyle(
                      boundsOf(windows.flatMap((index) => rendered.scene.windows[index] ?? [])),
                    )}
                  />
                  <GroupToolbar actions={actions} zoom={zoom} />
                </>
              )}
              {marquee && <div className="marquee" style={selectionStyle(marquee)} />}
              {IMAGE_HANDLES.map(({ edges, cursor }) => (
                <div
                  key={Object.keys(edges).join("-")}
                  className={
                    edges.right && edges.bottom
                      ? "handle image-handle corner"
                      : "handle image-handle"
                  }
                  title={
                    spec.aspectRatio
                      ? "Drag to resize the image. It keeps its aspect ratio. Double-click to fit it to the windows."
                      : "Drag to resize the image. Double-click to fit it to the windows."
                  }
                  style={{ ...handleStyle({ x: 0, y: 0, width, height }, edges, zoom), cursor }}
                  onPointerDown={(event) => resizeImageStart(event, edges)}
                  onDoubleClick={() =>
                    onChange(({ width: _width, height: _height, ...rest }) => rest)
                  }
                />
              ))}
              {guides.map((guide) => (
                <div
                  key={`${guide.axis}-${guide.kind}-${guide.at}`}
                  className={`guide ${guide.axis} ${guide.kind}`}
                  style={
                    guide.axis === "vertical"
                      ? { left: guide.at, top: guide.from, height: guide.to - guide.from }
                      : { top: guide.at, left: guide.from, width: guide.to - guide.from }
                  }
                />
              ))}
            </div>
          </div>
        )}
        {rendered && (
          <div className="canvas-footer">
            <span className="canvas-size">
              {width} × {height}
            </span>
            <button type="button" className="add-window" onClick={addWindow}>
              <PlusIcon />
              Add window
            </button>
          </div>
        )}
      </div>
      <div className="zoom-controls" role="group" aria-label="Zoom">
        <button
          type="button"
          className="tool"
          aria-label="Zoom out"
          title="Zoom out"
          onClick={() => setUserZoom(zoomStep(zoom, -1))}
        >
          <MinusIcon />
        </button>
        <button
          type="button"
          className="tool zoom-value"
          title="Show the image at 100%"
          onClick={() => setUserZoom(1)}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          className="tool"
          aria-label="Zoom in"
          title="Zoom in"
          onClick={() => setUserZoom(zoomStep(zoom, 1))}
        >
          <PlusIcon />
        </button>
        <span className="tool-separator" />
        <button
          type="button"
          className="tool zoom-value"
          aria-pressed={userZoom === undefined}
          title="Fit the image into the window"
          onClick={() => setUserZoom(undefined)}
        >
          Fit
        </button>
      </div>
      {menu && actions && (
        <ContextMenu x={menu.x} y={menu.y} items={menuItems(actions, menu)} onClose={closeMenu} />
      )}
    </div>
  );
}
