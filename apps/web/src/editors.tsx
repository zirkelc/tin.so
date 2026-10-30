import {
  AUTO_ICON,
  CODE_FONTS,
  DEFAULT_THEME,
  parseSpec,
  resolveIcon,
  type Scene,
  SpecError,
  type SpecInput,
  THEMES,
} from "@tin.so/core";
import { type ReactNode, useEffect, useRef, useState } from "react";
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
const VISIBLE_THEMES = THEMES.filter((theme) => !theme.hidden);
// The logos of the partner themes from ray.so, by theme id
const PARTNER_LOGOS = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>("./assets/partners/*.svg", {
      query: "?raw",
      import: "default",
      eager: true,
    }),
  ).map(([path, svg]) => [path.split("/").at(-1)!.replace(".svg", ""), svg]),
);

// The theme list hides the themes of companies for now. A spec or a link can still use them.
const SHOW_COMPANY_THEMES = false;

const COMPANY_THEME_IDS = new Set(
  VISIBLE_THEMES.filter((theme) => theme.partner).map((theme) => theme.id),
);

/**
 * The themes of the list: the classic themes, and the themes of companies when they show or when
 * the image uses one. Without company themes, the list needs no group headings.
 */
function themeOptions(current: string): Array<SelectOption<string>> {
  if (SHOW_COMPANY_THEMES) return THEME_OPTIONS;
  const options = THEME_OPTIONS.filter(
    (option) => !COMPANY_THEME_IDS.has(option.value) || option.value === current,
  );
  return COMPANY_THEME_IDS.has(current)
    ? options
    : options.map(({ group: _group, ...option }) => option);
}

// The classic themes first, then the themes of companies with their brand colors
const THEME_OPTIONS: Array<SelectOption<string>> = [
  ...VISIBLE_THEMES.filter((theme) => !theme.partner),
  ...VISIBLE_THEMES.filter((theme) => theme.partner),
].map((theme) => {
  const logo = PARTNER_LOGOS[theme.id];
  return {
    value: theme.id,
    label: theme.name,
    group: theme.partner ? "Companies" : "Classic",
    icon: logo ? (
      <span
        className="select-icon theme-logo"
        aria-hidden="true"
        // The logos are static SVG files of this app
        dangerouslySetInnerHTML={{ __html: logo }}
      />
    ) : (
      <span
        className="select-icon swatch"
        style={{
          background: `linear-gradient(140deg, ${theme.background.from}, ${theme.background.to})`,
        }}
      />
    ),
  };
});

const FONT_OPTIONS: Array<SelectOption<string>> = [
  { value: "", label: "Theme default" },
  ...CODE_FONTS.map((font) => ({ value: font.id, label: font.name })),
];

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
  const theme = VISIBLE_THEMES.find((theme) => theme.id === (spec.theme ?? DEFAULT_THEME));
  const singleMode = theme && (!theme.syntax.light || !theme.syntax.dark);
  const positioned = isPositioned(spec);

  const { scene } = props;

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
        preview
        value={spec.theme ?? DEFAULT_THEME}
        options={themeOptions(spec.theme ?? DEFAULT_THEME)}
        onChange={(theme) => onChange({ ...spec, theme })}
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
        value={spec.font ?? ""}
        options={FONT_OPTIONS}
        onChange={(font) => onChange({ ...spec, font: font || undefined })}
      />
      <div className="switches">
        <Switch
          label="Background"
          checked={spec.background ?? true}
          onChange={(background) => onChange({ ...spec, background })}
        />
        <Switch
          label="Line numbers"
          checked={spec.lineNumbers ?? theme?.lineNumbers ?? false}
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
  canRemove: boolean;
  onChange: (pane: PaneInput) => void;
  onRemove: () => void;
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
  onChange: (window: WindowInput) => void;
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
          canRemove={window.panes.length > 1}
          onChange={(pane) => updatePane(index, pane)}
          onRemove={() =>
            onChange({ ...window, panes: window.panes.filter((_, i) => i !== index) })
          }
        />
      ))}
    </div>
  );
}

type Annotation = NonNullable<PaneInput["annotations"]>[number];

/** The settings of the selected popover. Its code, place and size are edited in the image. */
export function PopoverEditor(props: {
  annotation: Annotation;
  pane: PaneInput;
  onChange: (annotation: Annotation | undefined) => void;
}) {
  const { annotation, onChange } = props;
  const moved = (annotation.offsetX ?? 0) !== 0 || (annotation.offsetY ?? 0) !== 0;
  const sized = annotation.width !== undefined || annotation.height !== undefined;
  const occurrence = (annotation.occurrence ?? 1) > 1 ? ` (${annotation.occurrence}.)` : "";
  return (
    <section className="section">
      <h2 className="section-title">Popover</h2>
      <p className="hint">
        Points to <code>{annotation.match}</code>
        {occurrence} in line {annotation.line}.
      </p>
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
    </section>
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
