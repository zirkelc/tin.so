import {
  AUTO_ICON,
  CODE_FONTS,
  DEFAULT_THEME,
  getFrameColors,
  type Mode,
  parseSpec,
  resolveIcon,
  resolveMode,
  type Scene,
  SpecError,
  type SpecInput,
  type Theme,
  THEMES,
  themeBackground,
} from "@tin.so/core";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { BackgroundPicker, PreviewWindow, themePreview } from "./background-picker.tsx";
import { Field, Segmented, Switch } from "./controls.tsx";
import {
  ChevronIcon,
  CloseIcon,
  ControlsIcon,
  FrameIcon,
  PlusIcon,
  SplitColumnIcon,
  SplitRowIcon,
  TabsIcon,
  TitleBarIcon,
} from "./icons.tsx";
import { jsonTokens } from "./json-tokens.ts";
import { registerRegularFaces } from "./renderer.ts";
import { AUTO_LANGUAGE, iconOptions, LANGUAGE_OPTIONS } from "./options.tsx";
import { insertSpaces } from "./Preview.tsx";
import { IconSvg, Select, type SelectOption } from "./select.tsx";
import {
  fitToPadding,
  fitToRatio,
  fittedPadding,
  hasPart,
  isPositioned,
  type PaneInput,
  paneLanguage,
  resetPositions,
  setLineNumbers,
  titleBarTarget,
  withAspectRatio,
  withLanguage,
  type WindowInput,
} from "./spec-edits.ts";
import { DEFAULT_SPEC } from "./state.ts";

const PADDINGS = [16, 32, 64, 128];
const AUTO = "auto" as const;
/** The window color and the colors that the theme gives code most, as a row of dots */
function ThemePalette(props: { theme: Theme; mode: Mode }) {
  const colors = [
    getFrameColors(props.theme, props.mode).background.slice(0, 7).toLowerCase(),
    ...(themePreview(props.theme, props.mode)?.palette ?? []),
  ];
  return (
    <span className="theme-palette" aria-hidden="true">
      {[...new Set(colors)].map((color) => (
        <span key={color} style={{ background: color }} />
      ))}
    </span>
  );
}

// A new theme brings its own background. The opacity of the background stays.
function withTheme(spec: SpecInput, theme: string): SpecInput {
  const { background: _background, ...rest } = spec;
  return { ...rest, theme };
}

// The themes of code editors, each with a small window on its own background in the mode
function themeOptions(mode: Mode): Array<SelectOption<string>> {
  return THEMES.map((theme) => {
    const resolved = resolveMode(theme, mode);
    return {
      value: theme.id,
      label: theme.name,
      thumbnail: (
        <span
          className="theme-thumbnail"
          style={{ background: themeBackground(theme, resolved)?.css ?? theme.background.from }}
        >
          <PreviewWindow theme={theme} mode={resolved} />
        </span>
      ),
      trailing: <ThemePalette theme={theme} mode={resolved} />,
    };
  });
}

// Each font shows its name in its own font
const FONT_OPTIONS: Array<SelectOption<string>> = [
  { value: "", label: "Theme default" },
  ...CODE_FONTS.map((font) => ({
    value: font.id,
    label: font.name,
    labelStyle: { fontFamily: `ci-${font.id}, ui-monospace, monospace` },
  })),
];

const loadFontNames = () => void registerRegularFaces(CODE_FONTS).catch(() => {});

// Aspect ratios of the image, with the places that use them
const FORMAT_OPTIONS: Array<SelectOption<string>> = [
  { value: "", label: "Auto" },
  { value: "16:9", label: "16:9 · X post, YouTube", shortLabel: "16:9" },
  { value: "1.91:1", label: "1.91:1 · Open Graph, LinkedIn", shortLabel: "1.91:1" },
  { value: "1:1", label: "1:1 · Instagram square", shortLabel: "1:1" },
  { value: "4:5", label: "4:5 · Instagram portrait", shortLabel: "4:5" },
  { value: "9:16", label: "9:16 · Story, Reels, TikTok", shortLabel: "9:16" },
  { value: "4:3", label: "4:3 · Slides", shortLabel: "4:3" },
  { value: "3:2", label: "3:2" },
  { value: "2:1", label: "2:1" },
];

export function Settings(props: {
  spec: SpecInput;
  /** The rendered image */
  scene: Scene | undefined;
  onChange: (spec: SpecInput) => void;
}) {
  const { spec, onChange } = props;
  const theme = THEMES.find((theme) => theme.id === (spec.theme ?? DEFAULT_THEME));
  const singleMode = theme && (!theme.syntax.light || !theme.syntax.dark);
  const positioned = isPositioned(spec);

  const { scene } = props;
  // The spec before a theme preview, which the preview restores when it ends without a choice
  const previewBase = useRef<SpecInput | undefined>(undefined);
  // The spec before a font preview
  const fontBase = useRef<SpecInput | undefined>(undefined);

  // In the free layout the image has its own size: a format or a padding fits it to the windows
  const setFormat = (aspectRatio: string) => {
    if (positioned && scene) return onChange(fitToRatio(spec, scene, aspectRatio || undefined));
    onChange(withAspectRatio(spec, aspectRatio || undefined));
  };
  const setPadding = (padding: number | typeof AUTO) => {
    if (padding === AUTO) return;
    if (positioned && scene) return onChange(fitToPadding(spec, scene, padding));
    onChange({ ...spec, padding });
  };

  return (
    <section className="section">
      <h2 className="section-title">Image</h2>
      <Select
        label="Theme"
        searchable
        sticky
        // The chosen theme keeps the check mark while another one shows as a preview
        value={(previewBase.current ?? spec).theme ?? DEFAULT_THEME}
        options={themeOptions(spec.mode ?? "dark")}
        onPreview={(theme) => {
          if (theme === undefined) {
            if (previewBase.current) onChange(previewBase.current);
            previewBase.current = undefined;
            return;
          }
          previewBase.current ??= spec;
          onChange(withTheme(previewBase.current, theme));
        }}
        onChange={(theme) => {
          const base = previewBase.current ?? spec;
          previewBase.current = undefined;
          onChange(withTheme(base, theme));
        }}
      />
      <BackgroundPicker
        value={spec.background}
        opacity={spec.backgroundOpacity ?? 1}
        theme={theme}
        mode={spec.mode ?? "dark"}
        onChange={(background) => {
          const { background: _background, ...rest } = spec;
          onChange(background === undefined ? rest : { ...rest, background });
        }}
        onOpacityChange={(opacity) => {
          const { backgroundOpacity: _opacity, ...rest } = spec;
          onChange(opacity === 1 ? rest : { ...rest, backgroundOpacity: opacity });
        }}
      />
      <div className="grid">
        <Segmented
          label="Mode"
          value={spec.mode ?? "dark"}
          disabled={singleMode}
          options={[
            { value: "dark", label: "Dark" },
            { value: "light", label: "Light" },
          ]}
          onChange={(mode) => onChange({ ...spec, mode })}
        />
        <Select
          label="Format"
          value={spec.aspectRatio ?? ""}
          options={FORMAT_OPTIONS}
          onChange={setFormat}
        />
      </div>
      <Segmented<number | typeof AUTO>
        label="Padding"
        // In the free layout the windows do not follow the padding, until a padding fits the image again
        value={positioned ? ((scene && fittedPadding(spec, scene)) ?? AUTO) : (spec.padding ?? 64)}
        options={[
          ...(positioned ? [{ value: AUTO, label: "Auto" }] : []),
          ...PADDINGS.map((padding) => ({ value: padding, label: padding })),
        ]}
        onChange={setPadding}
      />
      {positioned && (
        <div className="notice">
          <span>Free layout. Pick a padding to fit the image to the windows.</span>
          <button
            type="button"
            className="secondary"
            onClick={() => onChange(resetPositions(spec))}
          >
            Reset
          </button>
        </div>
      )}
      <Select
        label="Font"
        sticky
        value={(fontBase.current ?? spec).font ?? ""}
        options={FONT_OPTIONS}
        onOpen={loadFontNames}
        onPreview={(font) => {
          if (font === undefined) {
            if (fontBase.current) onChange(fontBase.current);
            fontBase.current = undefined;
            return;
          }
          fontBase.current ??= spec;
          onChange({ ...fontBase.current, font: font || undefined });
        }}
        onChange={(font) => {
          const base = fontBase.current ?? spec;
          fontBase.current = undefined;
          onChange({ ...base, font: font || undefined });
        }}
      />
      <div className="switches">
        <Switch
          label="Line numbers"
          checked={spec.lineNumbers ?? false}
          onChange={(lineNumbers) => onChange(setLineNumbers(spec, lineNumbers))}
        />
      </div>
      {spec.windows.length > 1 && (
        <Segmented
          label="Windows"
          value={spec.direction ?? "column"}
          disabled={positioned}
          options={[
            {
              value: "row",
              label: (
                <>
                  <SplitRowIcon />
                  Columns
                </>
              ),
            },
            {
              value: "column",
              label: (
                <>
                  <SplitColumnIcon />
                  Rows
                </>
              ),
            },
          ]}
          onChange={(direction) => onChange({ ...spec, direction })}
        />
      )}
    </section>
  );
}

/** The languages, with the auto option named after the language that it gives */
function languageOptions(auto: string): Array<SelectOption<string>> {
  return LANGUAGE_OPTIONS.map((option) =>
    option.value === AUTO_LANGUAGE
      ? {
          ...option,
          label: `Auto (${auto})`,
          icon: <IconSvg icon={resolveIcon(AUTO_ICON, auto)} />,
        }
      : option,
  );
}

function PartToggle(props: {
  label: string;
  pressed: boolean;
  disabled?: boolean;
  icon: ReactNode;
  onChange: (pressed: boolean) => void;
}) {
  return (
    <button
      type="button"
      className="part"
      aria-pressed={props.pressed}
      disabled={props.disabled}
      onClick={() => props.onChange(!props.pressed)}
    >
      {props.icon}
      {props.label}
    </button>
  );
}

// The code of the default image counts as an example, so that a new language replaces it
const DEFAULT_CODES = DEFAULT_SPEC.windows.flatMap((window) =>
  window.panes.map((pane) => pane.code),
);

function PaneEditor(props: {
  pane: PaneInput;
  index: number;
  tabs: boolean;
  /** The line numbers of the image, which the pane follows unless it has its own */
  lineNumbers: boolean;
  canRemove: boolean;
  onChange: (pane: PaneInput) => void;
  onRemove: () => void;
  /** The selected popover of this pane, by its index in the spec */
  selectedPopover: number | undefined;
  onSelectPopover: (index: number | undefined) => void;
  onHoverPopover: (index: number | undefined) => void;
}) {
  const { pane, onChange } = props;
  const language = paneLanguage(pane);
  const hidden = (pane.annotations ?? []).filter((annotation) => !hasPart(pane.code, annotation));
  // The auto option shows the language that the file name gives

  return (
    <div className="pane-editor">
      <div className="pane-editor-header">
        <input
          aria-label={`File name of pane ${props.index + 1}`}
          className="plain"
          placeholder="File name"
          value={pane.title ?? ""}
          onChange={(event) => onChange({ ...pane, title: event.target.value || undefined })}
        />
        {props.canRemove && (
          <button
            type="button"
            className="tool"
            aria-label={`Remove pane ${props.index + 1}`}
            title="Remove pane"
            onClick={props.onRemove}
          >
            <CloseIcon />
          </button>
        )}
      </div>
      <div className="pane-fields">
        <Select
          label="Language"
          searchable
          value={pane.language ?? AUTO_LANGUAGE}
          options={languageOptions(language)}
          onChange={(language) =>
            language === AUTO_LANGUAGE
              ? onChange({ ...pane, language })
              : void import("./examples.ts").then(({ SIMPLE_EXAMPLES }) =>
                  onChange(withLanguage(pane, language, SIMPLE_EXAMPLES, DEFAULT_CODES)),
                )
          }
        />
        <Select
          label="Tab icon"
          searchable
          disabled={!props.tabs}
          value={pane.icon ?? AUTO_ICON}
          options={iconOptions(language)}
          onChange={(icon) => onChange({ ...pane, icon })}
        />
      </div>
      <div className="switches">
        <Switch
          label="Line numbers"
          ariaLabel={`Line numbers of pane ${props.index + 1}`}
          checked={pane.lineNumbers ?? props.lineNumbers}
          onChange={(lineNumbers) => {
            // A pane keeps its own value only when it differs from the image
            const { lineNumbers: _lineNumbers, ...rest } = pane;
            onChange(lineNumbers === props.lineNumbers ? rest : { ...rest, lineNumbers });
          }}
        />
      </div>
      {(pane.annotations ?? []).length > 0 && (
        <PopoverList
          pane={pane}
          paneIndex={props.index}
          selected={props.selectedPopover}
          onSelect={props.onSelectPopover}
          onHover={props.onHoverPopover}
          onChange={onChange}
        />
      )}
      {hidden.length > 0 && (
        <div className="notice">
          <span>
            {hidden.length === 1 ? "1 popover is" : `${hidden.length} popovers are`} not in the
            image, because the code does not have its text.
          </span>
          <button
            type="button"
            className="secondary"
            onClick={() =>
              onChange({
                ...pane,
                annotations: pane.annotations?.filter((annotation) =>
                  hasPart(pane.code, annotation),
                ),
              })
            }
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

/** The name of a window in the list: its title, or the file names of its panes */
function windowName(window: WindowInput, index: number): string {
  const titles = window.panes.flatMap((pane) => (pane.title ? [pane.title] : []));
  return window.title || titles.join(", ") || `Window ${index + 1}`;
}

/**
 * All windows, also the windows that other windows hide in the image. A click selects a window,
 * and shift-click or ⌘-click adds it to the selection. The only selected window shows its settings.
 */
export function WindowList(props: {
  windows: Array<WindowInput>;
  selected: Array<number>;
  /** The window that shows its settings */
  open: number | undefined;
  /** Shift-click and ⌘-click add windows, and do not open their settings */
  onSelect: (windows: Array<number>, added: boolean) => void;
  onHover: (index: number | undefined) => void;
  onAdd: () => void;
  /** The settings of the open window */
  children?: ReactNode;
}) {
  const { selected, open } = props;
  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">Windows</h2>
        {selected.length > 1 && <span className="badge">{selected.length} selected</span>}
        <button
          type="button"
          className="tool"
          aria-label="Add window"
          title="Add window"
          onClick={props.onAdd}
        >
          <PlusIcon />
        </button>
      </div>
      <ul className="window-list" onPointerLeave={() => props.onHover(undefined)}>
        {props.windows.map((window, index) => {
          const isSelected = selected.includes(index);
          return (
            <li key={index} className={isSelected ? "selected" : undefined}>
              <button
                type="button"
                className="window-row"
                aria-pressed={isSelected}
                aria-expanded={open === index}
                onPointerEnter={() => props.onHover(index)}
                // Shift does not select the text of the list
                onMouseDown={(event) => event.shiftKey && event.preventDefault()}
                onClick={(event) => {
                  if (event.shiftKey || event.metaKey || event.ctrlKey) {
                    props.onSelect(
                      isSelected ? selected.filter((i) => i !== index) : [...selected, index],
                      true,
                    );
                  } else {
                    // A click on the open window closes it
                    props.onSelect(open === index ? [] : [index], false);
                  }
                }}
              >
                <ChevronIcon />
                <span className="window-row-name">{windowName(window, index)}</span>
                {window.panes.length > 1 && (
                  <span className="window-row-meta">{window.panes.length} panes</span>
                )}
              </button>
              {open === index && <div className="window-row-body">{props.children}</div>}
            </li>
          );
        })}
      </ul>
      {selected.length > 1 && (
        <p className="hint">
          Drag one of them in the image to move all. The toolbar above them aligns them.
        </p>
      )}
    </section>
  );
}

/**
 * The settings of a window, in the list of windows. The code, highlights, styles and popovers are
 * edited in the image.
 */
export function WindowEditor(props: {
  window: WindowInput;
  /** The line numbers of the image, which a pane follows unless it has its own */
  lineNumbers: boolean;
  onChange: (window: WindowInput) => void;
  /** The selected popover of this window, by the index of its pane and its index in the pane */
  selectedPopover?: PopoverRef;
  onSelectPopover: (popover: PopoverRef | undefined) => void;
  onHoverPopover: (popover: PopoverRef | undefined) => void;
}) {
  const { window, onChange } = props;
  const frame = window.frame ?? true;
  const titleBar = window.titleBar ?? true;
  const updatePane = (index: number, pane: PaneInput) =>
    onChange({ ...window, panes: window.panes.map((old, i) => (i === index ? pane : old)) });
  const sized = window.width !== undefined || window.height !== undefined;
  // A pane size divides the window, so it has no effect on the only pane
  const paneSized = window.panes.length > 1 && window.panes.some((pane) => pane.size !== undefined);

  return (
    <div className="window-editor">
      <Field label="Title">
        <input
          placeholder={titleBarTarget(window) === "pane" ? window.panes[0]?.title : "Untitled"}
          value={window.title ?? ""}
          disabled={!frame || !titleBar}
          onChange={(event) => onChange({ ...window, title: event.target.value || undefined })}
        />
      </Field>
      <div className="field">
        <span className="field-label">Frame</span>
        <div className="parts">
          <PartToggle
            label="Window"
            icon={<FrameIcon />}
            pressed={frame}
            onChange={(frame) => onChange({ ...window, frame })}
          />
          <PartToggle
            label="Title bar"
            icon={<TitleBarIcon />}
            pressed={frame && titleBar}
            disabled={!frame}
            onChange={(titleBar) => onChange({ ...window, titleBar })}
          />
          <PartToggle
            label="Tabs"
            icon={<TabsIcon />}
            pressed={frame && (window.tabs ?? false)}
            disabled={!frame}
            onChange={(tabs) => onChange({ ...window, tabs })}
          />
          <PartToggle
            label="Colors"
            icon={<ControlsIcon />}
            pressed={frame && titleBar && window.controls === "color"}
            disabled={!frame || !titleBar}
            onChange={(color) => onChange({ ...window, controls: color ? "color" : undefined })}
          />
        </div>
      </div>
      {window.panes.length > 1 && (
        <Segmented
          label="Panes"
          value={window.split ?? "row"}
          options={[
            {
              value: "row",
              label: (
                <>
                  <SplitRowIcon />
                  Columns
                </>
              ),
            },
            {
              value: "column",
              label: (
                <>
                  <SplitColumnIcon />
                  Rows
                </>
              ),
            },
          ]}
          onChange={(split) => onChange({ ...window, split })}
        />
      )}
      {(sized || paneSized) && (
        <div className="notice">
          <span>
            {sized
              ? `Size ${window.width ?? "auto"} × ${window.height ?? "auto"}`
              : "Pane sizes are set"}
            . Drag the corner or a divider in the image to change it.
          </span>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              const { width: _width, height: _height, ...rest } = window;
              onChange({ ...rest, panes: window.panes.map(({ size: _size, ...pane }) => pane) });
            }}
          >
            Fit
          </button>
        </div>
      )}
      {window.panes.map((pane, index) => (
        <PaneEditor
          key={index}
          pane={pane}
          index={index}
          tabs={frame && (window.tabs ?? false)}
          lineNumbers={props.lineNumbers}
          canRemove={window.panes.length > 1}
          onChange={(pane) => updatePane(index, pane)}
          onRemove={() =>
            onChange({ ...window, panes: window.panes.filter((_, i) => i !== index) })
          }
          selectedPopover={
            props.selectedPopover?.pane === index ? props.selectedPopover.annotation : undefined
          }
          onSelectPopover={(annotation) =>
            props.onSelectPopover(
              annotation === undefined ? undefined : { pane: index, annotation },
            )
          }
          onHoverPopover={(annotation) =>
            props.onHoverPopover(annotation === undefined ? undefined : { pane: index, annotation })
          }
        />
      ))}
    </div>
  );
}

type Annotation = NonNullable<PaneInput["annotations"]>[number];

/** A popover by the index of its pane in the window and its index in the pane */
export type PopoverRef = { pane: number; annotation: number };

/**
 * The popovers of a pane, as the list of windows: a click on a row selects the popover and opens its
 * settings, and the pointer on a row highlights the popover in the image.
 */
function PopoverList(props: {
  pane: PaneInput;
  paneIndex: number;
  selected: number | undefined;
  onSelect: (index: number | undefined) => void;
  onHover: (index: number | undefined) => void;
  onChange: (pane: PaneInput) => void;
}) {
  const { pane, selected } = props;
  const annotations = pane.annotations ?? [];
  const setAnnotation = (index: number, annotation: Annotation | undefined) => {
    props.onChange({
      ...pane,
      annotations: annotations.flatMap((old, i) =>
        i !== index ? [old] : annotation ? [annotation] : [],
      ),
    });
    // A removed popover is no longer selected, and the indexes of the next popovers change
    if (!annotation) props.onSelect(undefined);
    if (!annotation) props.onHover(undefined);
  };
  return (
    <div className="field">
      <span className="field-label">Popovers</span>
      <ul
        className="window-list"
        aria-label={`Popovers of pane ${props.paneIndex + 1}`}
        onPointerLeave={() => props.onHover(undefined)}
      >
        {annotations.map((annotation, index) => {
          const isSelected = selected === index;
          const missing = !hasPart(pane.code, annotation);
          return (
            <li key={index} className={isSelected ? "selected" : undefined}>
              <button
                type="button"
                className="window-row"
                aria-label={`Popover ${annotation.match}, line ${annotation.line}`}
                aria-pressed={isSelected}
                aria-expanded={isSelected}
                title={missing ? "The code does not have this text" : undefined}
                onPointerEnter={() => props.onHover(index)}
                onClick={() => props.onSelect(isSelected ? undefined : index)}
              >
                <ChevronIcon />
                <code className="window-row-name">{annotation.match}</code>
                {missing ? (
                  <span className="popover-row-missing">not in code</span>
                ) : (
                  <span className="window-row-meta">
                    {(annotation.occurrence ?? 1) > 1 && `${annotation.occurrence}. · `}line{" "}
                    {annotation.line}
                  </span>
                )}
              </button>
              {isSelected && (
                <div className="window-row-body">
                  <PopoverEditor
                    annotation={annotation}
                    pane={pane}
                    onChange={(annotation) => setAnnotation(index, annotation)}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The settings of the selected popover. Its code, place and size are edited in the image. */
function PopoverEditor(props: {
  annotation: Annotation;
  pane: PaneInput;
  onChange: (annotation: Annotation | undefined) => void;
}) {
  const { annotation, onChange } = props;
  const moved = (annotation.offsetX ?? 0) !== 0 || (annotation.offsetY ?? 0) !== 0;
  const sized = annotation.width !== undefined || annotation.height !== undefined;
  return (
    <div className="popover-editor" role="group" aria-label="Selected popover">
      <Select
        label="Language"
        searchable
        value={annotation.language ?? AUTO_LANGUAGE}
        options={languageOptions(paneLanguage(props.pane))}
        onChange={(language) =>
          onChange({ ...annotation, language: language === AUTO_LANGUAGE ? undefined : language })
        }
      />
      <div className="buttons">
        <button
          type="button"
          className="secondary"
          disabled={!moved}
          title="Put the popover back below its text"
          onClick={() => {
            const { offsetX: _x, offsetY: _y, ...rest } = annotation;
            onChange(rest);
          }}
        >
          Reset
        </button>
        <button
          type="button"
          className="secondary"
          disabled={!sized}
          title="Fit the popover to its code"
          onClick={() => {
            const { width: _width, height: _height, ...rest } = annotation;
            onChange(rest);
          }}
        >
          Fit
        </button>
        <button type="button" className="secondary" onClick={() => onChange(undefined)}>
          Remove
        </button>
      </div>
    </div>
  );
}

/**
 * The spec as JSON text, with syntax highlighting. A highlighted copy of the text is below the
 * transparent text field. The spec changes only when the text is valid, and the problems show below.
 */
export function JsonEditor(props: { spec: SpecInput; onChange: (spec: SpecInput) => void }) {
  const [text, setText] = useState(() => JSON.stringify(props.spec, null, 2));
  const [issues, setIssues] = useState<Array<string>>([]);
  const highlightRef = useRef<HTMLPreElement>(null);
  // The spec that this editor gave, so that only changes from other places replace the text
  const appliedRef = useRef(props.spec);

  useEffect(() => {
    if (props.spec === appliedRef.current) return;
    appliedRef.current = props.spec;
    setText(JSON.stringify(props.spec, null, 2));
    setIssues([]);
  }, [props.spec]);

  const change = (next: string) => {
    setText(next);
    let value: unknown;
    try {
      value = JSON.parse(next);
    } catch (caught) {
      setIssues([(caught as Error).message]);
      return;
    }
    try {
      parseSpec(value);
    } catch (caught) {
      if (!(caught instanceof SpecError)) throw caught;
      setIssues(caught.issues);
      return;
    }
    setIssues([]);
    appliedRef.current = value as SpecInput;
    props.onChange(value as SpecInput);
  };

  return (
    <div className="json-editor">
      <div className="json-text">
        <pre ref={highlightRef} aria-hidden="true">
          {jsonTokens(text).map((token, index) =>
            token.kind ? (
              <span key={index} className={`json-${token.kind}`}>
                {token.text}
              </span>
            ) : (
              token.text
            ),
          )}
          {/* A last line break keeps the height of an empty last line, as the text field has */}
          {"\n"}
        </pre>
        <textarea
          aria-label="Spec as JSON"
          aria-invalid={issues.length > 0}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          value={text}
          onChange={(event) => change(event.target.value)}
          onKeyDown={(event) => insertSpaces(event, change)}
          onScroll={(event) => {
            const highlight = highlightRef.current;
            if (!highlight) return;
            highlight.scrollTop = event.currentTarget.scrollTop;
            highlight.scrollLeft = event.currentTarget.scrollLeft;
          }}
        />
      </div>
      {issues.length > 0 && (
        <ul className="json-issues" role="alert">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
