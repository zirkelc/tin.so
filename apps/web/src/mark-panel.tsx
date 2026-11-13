import { cellCount, type MarkStyle, type TextMetrics } from "@tin.so/core";
import {
  type CSSProperties,
  type KeyboardEvent,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  activeMarks,
  clearMarks,
  type LinePart,
  type Marked,
  type MarkColorKind,
  markColor,
  selectionParts,
  setMarkColor,
  toggleMark,
} from "./spec-edits.ts";

type Range = { start: number; end: number };

/**
 * Follows the selection of a code field while it has the focus, for the panel of styles and
 * colors. `origin` is the place of the code field in the image.
 */
export function useStylePanel(
  code: string,
  origin: { left: number; top: number },
  text: TextMetrics,
  zoom: number,
) {
  const [selection, setSelection] = useState<Range>();
  const field = useRef<HTMLTextAreaElement>(null);
  const read = (element: HTMLTextAreaElement) => {
    const { selectionStart: start, selectionEnd: end } = element;
    setSelection(end > start ? { start, end } : undefined);
  };
  const track = (event: { currentTarget: HTMLTextAreaElement }) => read(event.currentTarget);

  /**
   * The select event fires only for a new selection. A click or a key that clears the selection
   * fires only the selectionchange event of the document.
   */
  useEffect(() => {
    const onSelectionChange = () => {
      if (field.current && document.activeElement === field.current) read(field.current);
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);
  const parts = selection ? selectionParts(code, selection.start, selection.end) : [];

  // The panel stands above the start of the selection, at its size on the screen
  const panelStyle = (): CSSProperties => {
    const before = code.slice(0, selection?.start ?? 0);
    const lineIndex = before.split("\n").length - 1;
    let cells = 0;
    for (const char of before.slice(before.lastIndexOf("\n") + 1)) cells += cellCount(char);
    return {
      left: origin.left + cells * text.cellWidth,
      top: origin.top + lineIndex * text.lineHeight - 6 / zoom,
      transform: `translateY(-100%) scale(${1 / zoom})`,
    };
  };

  return {
    selection: parts.length > 0 ? selection : undefined,
    parts,
    panelStyle,
    fieldProps: { ref: field, onSelect: track, onBlur: () => setSelection(undefined) },
    track,
  };
}

/** The style of a mark shortcut, such as ⌘B, or undefined for other keys */
export function markShortcut(event: KeyboardEvent): MarkStyle | undefined {
  if (!(event.metaKey || event.ctrlKey) || event.altKey) return undefined;
  const key = event.key.toLowerCase();
  if (event.shiftKey) return key === "x" ? "strikethrough" : undefined;
  return ({ b: "strong", i: "emphasis", u: "underline" } as const)[key as "b" | "i" | "u"];
}

/**
 * Toggles the style of a mark shortcut on the selected text of a code field. Gives true when the
 * key was a shortcut.
 */
export function applyMarkShortcut(
  event: KeyboardEvent<HTMLTextAreaElement>,
  onChange: (change: (marked: Marked) => Marked) => void,
): boolean {
  const style = markShortcut(event);
  if (!style) return false;
  event.preventDefault();
  const { selectionStart, selectionEnd, value } = event.currentTarget;
  const parts = selectionParts(value, selectionStart, selectionEnd);
  if (parts.length > 0) onChange((marked) => toggleMark(marked, parts, style));
  return true;
}

// One palette for all themes: a dark and a light shade of each hue, then gray, white and black
const PALETTE: Array<[name: string, color: string]> = [
  ["Gray", "#71717a"],
  ["Red", "#f43f5e"],
  ["Rose", "#fb7185"],
  ["Orange", "#f59e0b"],
  ["Yellow", "#fcd34d"],
  ["Green", "#22c55e"],
  ["Mint", "#86efac"],
  ["Cyan", "#06b6d4"],
  ["Sky", "#67e8f9"],
  ["Blue", "#3b82f6"],
  ["Light blue", "#93c5fd"],
  ["Purple", "#a855f7"],
  ["Lavender", "#d8b4fe"],
  ["Silver", "#d4d4d8"],
  ["White", "#fafafa"],
  ["Black", "#18181b"],
];

// A fill is translucent, as a highlighter, so that the text on it stays readable
const FILL_ALPHA = "40";

const STYLES: Array<{ style: MarkStyle; label: string; shortcut?: string }> = [
  { style: "strong", label: "Bold", shortcut: "⌘B" },
  { style: "emphasis", label: "Italic", shortcut: "⌘I" },
  { style: "underline", label: "Underline", shortcut: "⌘U" },
  { style: "strikethrough", label: "Strike", shortcut: "⌘⇧X" },
  { style: "wavy", label: "Wavy" },
];

// The pointer events of a button that shows its change in the image before a click
type Hover = { onPointerEnter: () => void; onPointerLeave: () => void };

function ColorRow(props: {
  label: string;
  kind: MarkColorKind;
  current: string | undefined;
  onPick: (color: string | undefined) => void;
  hover: (color: string | undefined) => Hover;
}) {
  const suffix = props.kind === "background" ? FILL_ALPHA : "";
  // A color from the spec that the palette does not have gets its own swatch, so the row shows it
  const custom =
    props.current !== undefined &&
    !PALETTE.some(([, color]) => `${color}${suffix}` === props.current)
      ? props.current
      : undefined;
  return (
    <div className="mark-panel-row" role="group" aria-label={props.label}>
      <span className="mark-panel-label">{props.label}</span>
      <button
        type="button"
        className="swatch swatch-none"
        aria-label={`No ${props.label.toLowerCase()} color`}
        aria-pressed={props.current === undefined}
        title="None"
        {...props.hover(undefined)}
        onClick={() => props.onPick(undefined)}
      />
      {PALETTE.map(([name, color]) => {
        const value = `${color}${suffix}`;
        return (
          <button
            key={name}
            type="button"
            className="swatch"
            aria-label={`${props.label} ${name}`}
            aria-pressed={props.current === value}
            title={name}
            style={{ "--swatch": value } as CSSProperties}
            {...props.hover(value)}
            onClick={() => props.onPick(value)}
          />
        );
      })}
      {custom && (
        <button
          type="button"
          className="swatch"
          aria-label={`${props.label} ${custom}`}
          aria-pressed="true"
          title={custom}
          style={{ "--swatch": custom } as CSSProperties}
          {...props.hover(custom)}
          onClick={() => props.onPick(custom)}
        />
      )}
    </div>
  );
}

/**
 * The marked code with these marks. The field stays when it is undefined, because the editor
 * merges the result into the pane, and a missing field would keep the marks of the preview.
 */
function withMarks<MARKED extends Marked>(marked: MARKED, marks: Marked["marks"]): MARKED {
  return { ...marked, marks };
}

/**
 * The panel above a selection in the code: a text color, a fill and the text styles. A press in
 * the panel keeps the focus in the code, so that the selection stays.
 */
export function MarkPanel(props: {
  pane: Marked;
  parts: Array<LinePart>;
  /** The selection in the code, which the clear button empties of all marks */
  selection: { start: number; end: number };
  style: CSSProperties;
  onChange: (change: (marked: Marked) => Marked) => void;
}) {
  const { parts, onChange } = props;
  // The marks before the first preview, which come back when the pointer leaves a button without a click
  const base = useRef<{ marks: Marked["marks"] } | undefined>(undefined);
  // A click can give the spec of the preview, so the panel renders itself after a click
  const [, render] = useReducer((count: number) => count + 1, 0);
  // The buttons show the marks without the preview
  const pane = base.current ? withMarks(props.pane, base.current.marks) : props.pane;
  const active = activeMarks(pane, parts);

  // The saved marks stay until a click, because the pane of this render can still show the
  // preview of the button that the pointer just left
  // The pointer is on a button and the image shows its preview
  const previewing = useRef(false);
  const end = () => {
    const saved = base.current;
    previewing.current = false;
    if (saved) onChange((old) => withMarks(old, saved.marks));
  };
  const commit = (change: (marked: Marked) => Marked) => {
    const saved = base.current;
    base.current = undefined;
    previewing.current = false;
    render();
    onChange((old) => change(saved ? withMarks(old, saved.marks) : old));
  };
  const hover = (change: (marked: Marked) => Marked): Hover => ({
    onPointerEnter: () => {
      previewing.current = true;
      base.current ??= { marks: props.pane.marks };
      const saved = base.current;
      onChange((old) => change(withMarks(old, saved.marks)));
    },
    onPointerLeave: end,
  });

  // A panel that closes during a preview, for example on Escape, puts the marks back. After a
  // preview, an edit of the code can move the marks, so the saved marks are old then.
  const endRef = useRef(end);
  endRef.current = end;
  useEffect(() => () => void (previewing.current && endRef.current()), []);

  return (
    <div
      className="mark-panel"
      role="toolbar"
      aria-label="Text style"
      style={props.style}
      onMouseDown={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <ColorRow
        label="Text"
        kind="color"
        current={markColor(pane, parts, "color")}
        onPick={(color) => commit((old) => setMarkColor(old, parts, "color", color))}
        hover={(color) => hover((old) => setMarkColor(old, parts, "color", color))}
      />
      <ColorRow
        label="Fill"
        kind="background"
        current={markColor(pane, parts, "background")}
        onPick={(color) => commit((old) => setMarkColor(old, parts, "background", color))}
        hover={(color) => hover((old) => setMarkColor(old, parts, "background", color))}
      />
      <div className="mark-panel-row" role="group" aria-label="Style">
        <span className="mark-panel-label">Style</span>
        {STYLES.map(({ style, label, shortcut }) => (
          <button
            key={style}
            type="button"
            className={`mark-style mark-style-${style}`}
            aria-pressed={active.has(style)}
            title={shortcut ? `${label} (${shortcut})` : label}
            {...hover((old) => toggleMark(old, parts, style))}
            onClick={() => commit((old) => toggleMark(old, parts, style))}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          className="mark-style mark-clear"
          title="Clear styles and colors of the selection"
          {...hover((old) => clearMarks(old, props.selection.start, props.selection.end))}
          onClick={() =>
            commit((old) => clearMarks(old, props.selection.start, props.selection.end))
          }
        >
          Clear
        </button>
      </div>
    </div>
  );
}
