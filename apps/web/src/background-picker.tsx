import {
  AMBIENT_BACKGROUNDS,
  AMBIENT_ENABLED,
  type AmbientBackground,
  ambientPreviewCss,
  BACKGROUNDS,
  type BackgroundPreset,
  getFrameColors,
  isAmbientBackground,
  isCssBackground,
  type Mode,
  resolveMode,
  type SpecInput,
  type Theme,
  themeBackground,
} from "@tin.so/core";
import { type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from "react";
import { CloseIcon } from "./icons.tsx";
import THEME_PREVIEWS from "./theme-previews.json";

export type Background = SpecInput["background"];

type Tab = "gradient" | "color" | "custom" | "ambient";

// The Ambient tab stays hidden until the ambient backgrounds are enabled
const TABS: Array<Tab> = AMBIENT_ENABLED
  ? ["gradient", "color", "custom", "ambient"]
  : ["gradient", "color", "custom"];

type Rgb = { r: number; g: number; b: number };

type Hsv = { h: number; s: number; v: number };

const CHECKERBOARD = "repeating-conic-gradient(#808080 0 25%, #c0c0c0 0 50%) 0 0 / 12px 12px";
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

const GRADIENTS = BACKGROUNDS.filter((preset) => preset.kind !== "color");
const COLORS = BACKGROUNDS.filter((preset) => preset.kind === "color");

// The names in the Ambient tab, and the names in the bar with "Ambient" before them
const AMBIENT_NAMES: Record<AmbientBackground, string> = {
  "ambient-blur": "Blur",
  "ambient-code": "Code",
  "ambient-theme": "Theme",
};

const TAB_NAMES: Record<Tab, string> = {
  gradient: "Gradient",
  color: "Color",
  custom: "Custom",
  ambient: "Ambient",
};

/** The CSS of the background: the spec value, the background preset of the theme, or its gradient */
export function backgroundCss(
  background: Background,
  theme: Theme | undefined,
  mode: Mode,
): string {
  if (background !== undefined && !isAmbientBackground(background)) return background;
  if (!theme) return CHECKERBOARD;
  // The renderer makes an ambient background from the image, so the bar shows the colors of the theme
  if (background !== undefined) return ambientPreviewCss(theme, mode);
  const preset = themeBackground(theme, resolveMode(theme, mode));
  return preset?.css ?? `linear-gradient(140deg, ${theme.background.from}, ${theme.background.to})`;
}

/** The name of a background: the theme, the name of a preset, or custom */
function backgroundName(background: Background, opacity: number): string {
  if (opacity === 0) return "Transparent";
  if (background === undefined) return "Theme";
  if (isAmbientBackground(background)) return `Ambient ${AMBIENT_NAMES[background].toLowerCase()}`;
  return BACKGROUNDS.find((preset) => preset.css === background)?.name ?? "Custom";
}

function initialTab(background: Background): Tab {
  if (background === undefined) return "gradient";
  if (isAmbientBackground(background)) return "ambient";
  const preset = BACKGROUNDS.find((preset) => preset.css === background);
  if (preset) return preset.kind === "color" ? "color" : "gradient";
  return HEX.test(background) ? "custom" : "gradient";
}

function toHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
}

function parseHex(hex: string): Rgb {
  const digits = hex.slice(1);
  const full = digits.length === 3 ? digits.replace(/./g, "$&$&") : digits;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function rgbToHsv({ r, g, b }: Rgb): Hsv {
  const [red, green, blue] = [r / 255, g / 255, b / 255];
  const max = Math.max(red, green, blue);
  const delta = max - Math.min(red, green, blue);
  let h = 0;
  if (delta > 0) {
    if (max === red) h = ((green - blue) / delta) % 6;
    else if (max === green) h = (blue - red) / delta + 2;
    else h = (red - green) / delta + 4;
  }
  return { h: (h * 60 + 360) % 360, s: max === 0 ? 0 : delta / max, v: max };
}

function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const channel = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255);
  };
  return { r: channel(5), g: channel(3), b: channel(1) };
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

/**
 * The background of the image: a bar with the background and an opacity slider. The bar opens a
 * panel with the gradient and color presets, a field for a CSS gradient and a color picker.
 */
export function BackgroundPicker(props: {
  value: Background;
  /** The opacity of the background, from 0 (transparent) to 1 */
  opacity: number;
  theme: Theme | undefined;
  mode: Mode;
  onChange: (background: Background) => void;
  onOpacityChange: (opacity: number) => void;
}) {
  const { value, opacity, theme, mode, onChange } = props;
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>(() => initialTab(value));
  const ref = useRef<HTMLDivElement>(null);
  // The background before a preview under the mouse, which the preview restores when it ends
  const previewBase = useRef<{ value: Background } | undefined>(undefined);
  const committed = previewBase.current ? previewBase.current.value : value;

  const preview = (background: Background) => {
    previewBase.current ??= { value };
    onChange(background);
  };
  const endPreview = () => {
    if (previewBase.current) onChange(previewBase.current.value);
    previewBase.current = undefined;
  };
  const choose = (background: Background) => {
    previewBase.current = undefined;
    onChange(background);
  };
  const closePanel = () => {
    endPreview();
    setOpen(false);
  };
  // The listeners of the open panel call the latest close, which knows the latest preview
  const closeRef = useRef(closePanel);
  closeRef.current = closePanel;

  useEffect(() => {
    if (!open) return;
    const outside = (event: globalThis.PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) closeRef.current();
    };
    const onKey = (event: globalThis.KeyboardEvent) => event.key === "Escape" && closeRef.current();
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const name = backgroundName(value, opacity);
  const css = backgroundCss(value, theme, mode);

  return (
    <div ref={ref} className="field background-field">
      <span className="field-label">Background</span>
      <button
        type="button"
        className="background-trigger"
        aria-label={`Background: ${name}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={name}
        onClick={() => {
          if (open) return closePanel();
          setTab(initialTab(value));
          setOpen(true);
        }}
      >
        <span className="background-bar">
          <span style={{ background: css, opacity }} />
        </span>
      </button>
      <label className="background-opacity">
        <span className="field-label">Opacity</span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          aria-label="Opacity"
          value={Math.round(opacity * 100)}
          onChange={(event) => props.onOpacityChange(Number(event.target.value) / 100)}
        />
        <output>{Math.round(opacity * 100)} %</output>
      </label>
      {open && (
        <div className="background-panel" role="dialog" aria-label="Background">
          <div className="background-panel-header">
            <span>Background</span>
            <button type="button" className="tool" aria-label="Close" onClick={closePanel}>
              <CloseIcon />
            </button>
          </div>
          <div className="segmented" role="radiogroup" aria-label="Kind of background">
            {TABS.map((kind) => (
              <button
                key={kind}
                type="button"
                role="radio"
                aria-checked={tab === kind}
                onClick={() => setTab(kind)}
              >
                {TAB_NAMES[kind]}
              </button>
            ))}
          </div>
          {tab === "gradient" && (
            <>
              <GradientField css={css} onChange={onChange} />
              <Swatches
                presets={GRADIENTS}
                value={committed}
                theme={theme}
                mode={mode}
                onPreview={preview}
                onPreviewEnd={endPreview}
                onChange={choose}
              />
            </>
          )}
          {tab === "color" && (
            <Swatches
              presets={COLORS}
              value={committed}
              theme={theme}
              mode={mode}
              onPreview={preview}
              onPreviewEnd={endPreview}
              onChange={choose}
            />
          )}
          {tab === "ambient" && (
            <div className="background-ambient">
              {AMBIENT_BACKGROUNDS.map((ambient) => (
                <button
                  key={ambient}
                  type="button"
                  className="background-ambient-option"
                  aria-pressed={value === ambient}
                  onClick={() => onChange(ambient)}
                >
                  <span
                    className="background-ambient-preview"
                    style={{
                      background: theme ? ambientPreviewCss(theme, mode) : CHECKERBOARD,
                      filter: ambient === "ambient-blur" ? "blur(3px)" : undefined,
                    }}
                  />
                  {AMBIENT_NAMES[ambient]}
                </button>
              ))}
            </div>
          )}
          {tab === "custom" && (
            <ColorPicker
              color={
                value !== undefined && HEX.test(value)
                  ? value
                  : (theme?.background.from.slice(0, 7) ?? "#000000")
              }
              onChange={onChange}
            />
          )}
        </div>
      )}
    </div>
  );
}

type ThemePreview = {
  /** Lines of tokens as a color and a length in characters; a token without a color is a space */
  lines: Array<Array<[string | null, number]>>;
  /** The colors that the start example uses most, without the plain text color */
  palette: Array<string>;
};

/** The preview of a theme in a mode, made by the real highlighter from the start example */
export function themePreview(theme: Theme, mode: Mode): ThemePreview | undefined {
  return PREVIEWS[theme.id]?.[mode];
}

// JSON gives arrays where the previews have tuples of a color and a length
const PREVIEWS = THEME_PREVIEWS as unknown as Record<string, Partial<Record<Mode, ThemePreview>>>;

// The number of characters that fill the width of a preview window
const PREVIEW_WIDTH = 48;

/** A small window of the theme with lines of code in its colors, as in the image */
export function PreviewWindow(props: { theme: Theme; mode: Mode }) {
  const mode = resolveMode(props.theme, props.mode);
  const frame = getFrameColors(props.theme, mode);
  const preview = themePreview(props.theme, mode);
  return (
    <span
      className="background-preview-window"
      style={{ background: frame.background, borderColor: frame.shadowBorder }}
    >
      <span className="background-preview-controls">
        {[0, 1, 2].map((dot) => (
          <span key={dot} style={{ background: frame.control }} />
        ))}
      </span>
      {preview?.lines.map((tokens, line) => (
        <span key={line} className="background-preview-line">
          {tokens.map(([color, length], index) => (
            <span
              key={index}
              style={{
                width: `${(length / PREVIEW_WIDTH) * 100}%`,
                background: color ?? "transparent",
              }}
            />
          ))}
        </span>
      ))}
    </span>
  );
}

// The grid has two columns, so up and down move by two presets
const SWATCH_COLUMNS = 2;
const SWATCH_STEPS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -SWATCH_COLUMNS,
  ArrowDown: SWATCH_COLUMNS,
};

function Swatches(props: {
  presets: Array<BackgroundPreset>;
  value: Background;
  theme: Theme | undefined;
  mode: Mode;
  /** Shows a preset under the mouse at once */
  onPreview: (background: Background) => void;
  /** Restores the background from before when the mouse leaves the presets */
  onPreviewEnd: () => void;
  onChange: (background: Background) => void;
}) {
  // The arrow keys move the focus through the grid and show the preset under the focus
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = SWATCH_STEPS[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button")];
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = Math.min(buttons.length - 1, Math.max(0, at === -1 ? 0 : at + step));
    buttons[next]?.focus();
    const preset = props.presets[next];
    if (preset) props.onPreview(preset.css);
  };

  return (
    <div
      className="background-swatches"
      onPointerLeave={props.onPreviewEnd}
      onKeyDown={onKeyDown}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) props.onPreviewEnd();
      }}
    >
      {props.presets.map((preset) => (
        <button
          key={preset.id}
          type="button"
          className="background-swatch"
          aria-label={preset.name}
          aria-pressed={preset.css === props.value}
          title={preset.name}
          onPointerEnter={(event) => {
            // The focus follows the mouse, so only one tile shows as the preview and the arrow
            // keys go on from there
            if (event.currentTarget.parentElement?.contains(document.activeElement)) {
              event.currentTarget.focus({ preventScroll: true });
            }
            props.onPreview(preset.css);
          }}
          onClick={() => props.onChange(preset.css)}
        >
          <span className="background-swatch-canvas" style={{ background: preset.css }}>
            {props.theme && <PreviewWindow theme={props.theme} mode={props.mode} />}
          </span>
          <span className="background-swatch-name">{preset.name}</span>
        </button>
      ))}
    </div>
  );
}

/** The CSS of the gradient as text. A valid gradient applies at once. */
function GradientField(props: { css: string; onChange: (background: Background) => void }) {
  const [text, setText] = useState(props.css);
  const valid = isCssBackground(text);
  // A swatch or a new theme replaces the text. The text that made the background stays as typed.
  useEffect(() => {
    setText((current) => (current.trim() === props.css ? current : props.css));
  }, [props.css]);
  return (
    <input
      className="background-css"
      aria-label="CSS gradient"
      aria-invalid={!valid}
      spellCheck={false}
      value={text}
      onChange={(event) => {
        setText(event.target.value);
        if (isCssBackground(event.target.value)) props.onChange(event.target.value.trim());
      }}
    />
  );
}

type EyeDropperResult = { sRGBHex: string };
type EyeDropperConstructor = new () => { open: () => Promise<EyeDropperResult> };

/** A color picker: saturation and value in a square, a hue slider, an eyedropper and RGB fields */
function ColorPicker(props: { color: string; onChange: (background: Background) => void }) {
  const [hsv, setHsv] = useState(() => rgbToHsv(parseHex(props.color)));
  const rgb = hsvToRgb(hsv);
  const hex = toHex(rgb);
  const square = useRef<HTMLDivElement>(null);
  const EyeDropper = (globalThis as { EyeDropper?: EyeDropperConstructor }).EyeDropper;

  const apply = (next: Hsv) => {
    setHsv(next);
    props.onChange(toHex(hsvToRgb(next)));
  };
  const applyRgb = (next: Rgb) => {
    // Gray has no hue, so the hue of the slider stays
    const converted = rgbToHsv(next);
    apply(converted.s === 0 ? { ...converted, h: hsv.h } : converted);
  };

  const pick = (event: PointerEvent<HTMLDivElement>) => {
    const box = square.current!.getBoundingClientRect();
    apply({
      h: hsv.h,
      s: clamp((event.clientX - box.left) / box.width),
      v: clamp(1 - (event.clientY - box.top) / box.height),
    });
  };
  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.1 : 0.01;
    const moves: Record<string, Partial<Hsv>> = {
      ArrowLeft: { s: clamp(hsv.s - step) },
      ArrowRight: { s: clamp(hsv.s + step) },
      ArrowUp: { v: clamp(hsv.v + step) },
      ArrowDown: { v: clamp(hsv.v - step) },
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    apply({ ...hsv, ...move });
  };

  return (
    <div className="color-picker">
      <div
        ref={square}
        className="color-square"
        role="slider"
        tabIndex={0}
        aria-label="Saturation and brightness"
        aria-valuetext={hex}
        style={{ background: `hsl(${hsv.h} 100% 50%)` }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          pick(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) pick(event);
        }}
        onKeyDown={onKey}
      >
        <span
          className="color-square-thumb"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
        />
      </div>
      <div className="color-picker-row">
        {EyeDropper && (
          <button
            type="button"
            className="tool"
            aria-label="Pick a color from the screen"
            title="Pick a color from the screen"
            onClick={async () => {
              try {
                const result = await new EyeDropper().open();
                applyRgb(parseHex(result.sRGBHex.slice(0, 7)));
              } catch {
                // The user closed the eyedropper
              }
            }}
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path
                d="M11.5 1.5a1.8 1.8 0 0 1 2.5 2.5l-1.8 1.8.7.7-1.1 1.1-.7-.7-5.6 5.6H3.4v-2.1L9 4.8l-.7-.7 1.1-1.1.7.7z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
        <span className="color-current" style={{ background: hex }} />
        <input
          className="color-hue"
          type="range"
          min={0}
          max={359}
          aria-label="Hue"
          value={Math.round(hsv.h)}
          onChange={(event) => apply({ ...hsv, h: Number(event.target.value) })}
        />
      </div>
      <div className="color-channels">
        {(["r", "g", "b"] as const).map((channel) => (
          <label key={channel}>
            <input
              type="number"
              min={0}
              max={255}
              aria-label={channel.toUpperCase()}
              value={rgb[channel]}
              onChange={(event) => {
                const number = Number(event.target.value);
                if (Number.isFinite(number))
                  applyRgb({ ...rgb, [channel]: clamp(Math.round(number), 0, 255) });
              }}
            />
            <span>{channel.toUpperCase()}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
