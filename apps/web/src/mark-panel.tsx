import { cellCount, type MarkStyle, type TextMetrics } from "@tin.so/core";
import { type CSSProperties, type KeyboardEvent, useState } from "react";
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
  const track = (event: { currentTarget: HTMLTextAreaElement }) => {
    const { selectionStart: start, selectionEnd: end } = event.currentTarget;
    setSelection(end > start ? { start, end } : undefined);
  };
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
    fieldProps: { onSelect: track, onBlur: () => setSelection(undefined) },
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

const STYLES: Array<{ style: MarkStyle; label: string; shortcut: string }> = [
  { style: "strong", label: "Bold", shortcut: "⌘B" },
  { style: "emphasis", label: "Italic", shortcut: "⌘I" },
  { style: "underline", label: "Underline", shortcut: "⌘U" },
  { style: "strikethrough", label: "Strike", shortcut: "⌘⇧X" },
];

function ColorRow(props: {
  label: string;
  kind: MarkColorKind;
  current: string | undefined;
  onPick: (color: string | undefined) => void;
}) {
  const suffix = props.kind === "background" ? FILL_ALPHA : "";
  return (
    <div className="mark-panel-row" role="group" aria-label={props.label}>
      <span className="mark-panel-label">{props.label}</span>
      <button
        type="button"
        className="swatch swatch-none"
        aria-label={`No ${props.label.toLowerCase()} color`}
        aria-pressed={props.current === undefined}
        title="None"
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
            onClick={() => props.onPick(value)}
          />
        );
      })}
    </div>
  );
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
  const { pane, parts, onChange } = props;
  const active = activeMarks(pane, parts);
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
        onPick={(color) => onChange((old) => setMarkColor(old, parts, "color", color))}
      />
      <ColorRow
        label="Fill"
        kind="background"
        current={markColor(pane, parts, "background")}
        onPick={(color) => onChange((old) => setMarkColor(old, parts, "background", color))}
      />
      <div className="mark-panel-row" role="group" aria-label="Style">
        <span className="mark-panel-label">Style</span>
        {STYLES.map(({ style, label, shortcut }) => (
          <button
            key={style}
            type="button"
            className={`mark-style mark-style-${style}`}
            aria-pressed={active.has(style)}
            title={`${label} (${shortcut})`}
            onClick={() => onChange((old) => toggleMark(old, parts, style))}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          className="mark-style mark-clear"
          title="Clear styles and colors of the selection"
          onClick={() =>
            onChange((old) => clearMarks(old, props.selection.start, props.selection.end))
          }
        >
          Clear
        </button>
      </div>
    </div>
  );
}
