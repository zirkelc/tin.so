import {
  createLink,
  METADATA_BY_DEFAULT,
  parseSpec,
  readImageSpec,
  type Scene,
  SpecError,
  type SpecInput,
} from "@tin.so/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { installApi, markApiReady } from "./api.ts";
import { JsonEditor, PopoverEditor, Settings, WindowEditor, WindowList } from "./editors.tsx";
import {
  BackIcon,
  ChevronIcon,
  FormatIcon,
  GitHubIcon,
  LinkIcon,
  QuestionIcon,
  XIcon,
} from "./icons.tsx";
import { Dropdown } from "./menu.tsx";
import { Preview, type Selection } from "./Preview.tsx";
import { type ImageFormat, type Rendered, renderImage, renderPreview } from "./renderer.ts";
import {
  alignScene,
  growForLargerWindows,
  isPositioned,
  type SpecUpdate,
  updatePane,
  updateWindow,
  windowsOnly,
  withoutMissingParts,
} from "./spec-edits.ts";
import { DEFAULT_SPEC, readSpecFromUrl, writeSpecToUrl } from "./state.ts";

const SCALES = [1, 2, 4];
// How long the message about an invalid link shows, in ms
const LINK_ERROR_TIME = 6_000;

type ExportAction = "png" | "svg" | "copy";

const EXPORT_ACTIONS: Array<{ action: ExportAction; label: string }> = [
  { action: "copy", label: "Copy image" },
  { action: "png", label: "Save PNG" },
  { action: "svg", label: "Save SVG" },
];

const EXPORT_KEY = "code-image:export";

type ExportChoice = { action: ExportAction; scale: number; metadata: boolean };

// The last export options of this browser. The storage can be missing or blocked.
function readExportChoice(): ExportChoice {
  const fallback = { action: "png" as ExportAction, scale: 2, metadata: METADATA_BY_DEFAULT };
  try {
    const stored = JSON.parse(localStorage.getItem(EXPORT_KEY) ?? "{}") as Record<string, unknown>;
    return {
      action:
        EXPORT_ACTIONS.find(({ action }) => action === stored.action)?.action ?? fallback.action,
      scale: SCALES.find((scale) => scale === stored.scale) ?? fallback.scale,
      metadata: typeof stored.metadata === "boolean" ? stored.metadata : fallback.metadata,
    };
  } catch {
    return fallback;
  }
}

function writeExportChoice(choice: ExportChoice) {
  try {
    localStorage.setItem(EXPORT_KEY, JSON.stringify(choice));
  } catch {}
}

const SHORTCUTS: Array<[string, string]> = [
  ["Right-click code", "Highlight, popovers, clear styles"],
  ["⌥ Click a line", "Highlight the line"],
  ["Select code", "Colors and styles"],
  ["⌘B  ⌘I  ⌘U", "Bold, italic, underline"],
  ["⌘⇧X", "Strikethrough"],
  ["⇧⌥F", "Format the code"],
  ["Drag a window", "Move it"],
  ["Drag an edge, a corner or a divider", "Resize. Double-click to fit."],
  ["Drag on the background", "Select windows"],
  ["⇧ Click a window", "Add it to the selection"],
  ["⌘A  Esc", "Select all, select none"],
  ["⌘D", "Duplicate the window"],
  ["⌘C  ⌘V", "Copy and paste windows"],
  ["Drag the image corner", "Resize the image. Double-click to fit."],
  ["⌫", "Remove the selection"],
  ["Drop an exported image", "Edit it again"],
];

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  // Some browsers start the download after the click returns, so the URL must stay valid a moment
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function App() {
  const [spec, setSpec] = useState<SpecInput>();
  const [rendered, setRendered] = useState<Rendered>();
  const [issues, setIssues] = useState<Array<string>>([]);
  const [json, setJson] = useState(false);
  const [selected, setSelected] = useState<Selection | undefined>({ windows: [0] });
  const [exportChoice, setExportChoice] = useState(readExportChoice);
  const { action: lastAction, scale, metadata } = exportChoice;
  const [status, setStatus] = useState<string>();
  // The window that the pointer is on in the list of windows
  const [hovered, setHovered] = useState<number>();
  const specRef = useRef<SpecInput>(DEFAULT_SPEC);
  const renderId = useRef(0);
  // The last rendered spec and its scene
  const sceneRef = useRef<{ spec: SpecInput; scene: Scene }>(undefined);

  // A spec that the image grew for renders without a second growth
  const showSpec = useCallback(async (next: SpecInput, grown = false): Promise<void> => {
    // A spec from a link or from the page API can have any shape, and the editors need a valid spec
    try {
      parseSpec(next);
    } catch (error) {
      if (error instanceof SpecError) setIssues(error.issues);
      throw error;
    }
    specRef.current = next;
    setSpec(next);
    const id = ++renderId.current;
    try {
      const result = await renderPreview(withoutMissingParts(next));
      if (id !== renderId.current) return;
      // In the free layout, a window that gets larger grows the image, and a moved window does not
      const before = sceneRef.current;
      if (before && !grown && isPositioned(next)) {
        const aligned = alignScene(before.scene, before.spec, next);
        const larger = growForLargerWindows(next, aligned, result.scene);
        if (larger !== next) return await showSpec(larger, true);
      }
      sceneRef.current = { spec: next, scene: result.scene };
      setRendered(result);
      setIssues([]);
      markApiReady();
      await writeSpecToUrl(next);
    } catch (error) {
      if (id !== renderId.current) return;
      setIssues(error instanceof SpecError ? error.issues : [(error as Error).message]);
      throw error;
    }
  }, []);

  // A function update applies to the newest spec, also when it runs after an async step
  const update = useCallback(
    (next: SpecUpdate) =>
      void showSpec(typeof next === "function" ? next(specRef.current) : next).catch(() => {}),
    [showSpec],
  );

  useEffect(() => {
    installApi({ getSpec: () => specRef.current, setSpec: showSpec });
    // A link with an invalid spec opens the default spec
    void readSpecFromUrl().then((fromUrl) =>
      showSpec(fromUrl ?? DEFAULT_SPEC).catch(() => {
        if (!fromUrl) return;
        void showSpec(DEFAULT_SPEC).catch(() => {});
        setStatus("The link has an invalid spec, so the default image shows");
        setTimeout(() => setStatus(undefined), LINK_ERROR_TIME);
      }),
    );
    const onHashChange = () => void readSpecFromUrl().then((fromUrl) => fromUrl && update(fromUrl));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [showSpec, update]);

  const flash = (message: string) => {
    setStatus(message);
    setTimeout(() => setStatus(undefined), 2_000);
  };

  // An image file that this app made carries its spec, so a drop opens it again
  useEffect(() => {
    const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes("Files") ?? false;
    const onDragOver = (event: DragEvent) => {
      if (hasFiles(event)) event.preventDefault();
    };
    const onDrop = (event: DragEvent) => {
      const file = event.dataTransfer?.files[0];
      if (!file) return;
      event.preventDefault();
      void readImageSpec(file).then((fromImage) => {
        if (!fromImage) return flash(`${file.name} has no tin.so spec`);
        showSpec(fromImage as SpecInput).then(
          () => {
            setSelected({ windows: [0] });
            flash(`Opened ${file.name}`);
          },
          () => flash(`${file.name} has an invalid spec`),
        );
      });
    };
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [showSpec]);

  const exportImage = async (format: ImageFormat) => {
    const spec = withoutMissingParts(specRef.current);
    const name = specRef.current.windows[0]?.panes[0]?.title?.replace(/\.[^.]+$/, "") ?? "code";
    try {
      const { blob } = await renderImage(spec, format, scale, metadata);
      download(blob, `${name}.${format}`);
    } catch {
      flash("Could not export the image");
    }
  };

  // Without windows, copies the full image
  const copyImage = async (windowIndexes?: Array<number>) => {
    const spec = withoutMissingParts(specRef.current);
    const scene = sceneRef.current?.scene;
    const source = windowIndexes && scene ? windowsOnly(spec, scene, windowIndexes) : spec;
    // Safari needs the clipboard item to start in the click handler, so the blob is a promise
    const blob = renderImage(source, "png", scale, metadata).then((result) => result.blob);
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      const count = windowIndexes?.length ?? 0;
      flash(
        count === 0 ? "Image copied" : count === 1 ? "Window copied" : `${count} windows copied`,
      );
    } catch {
      flash("Could not copy the image");
    }
  };

  const changeExport = (change: Partial<typeof exportChoice>) => {
    const next = { ...exportChoice, ...change };
    setExportChoice(next);
    writeExportChoice(next);
  };

  const runExport = (action: ExportAction) => {
    changeExport({ action });
    void (action === "copy" ? copyImage() : exportImage(action));
  };

  const copyLink = async () => {
    const base = `${window.location.origin}${window.location.pathname}`;
    try {
      await navigator.clipboard.writeText(
        await createLink(withoutMissingParts(specRef.current), base),
      );
      flash("Link copied");
    } catch {
      flash("Could not copy the link");
    }
  };

  if (!spec) return <div className="loading">Loading…</div>;

  // A selection of a removed window or popover ends
  const selection =
    selected && selected.windows.every((index) => index < spec.windows.length)
      ? selected
      : undefined;
  const selectedIndex = selection?.windows.length === 1 ? selection.windows[0] : undefined;
  const selectedWindow = selectedIndex === undefined ? undefined : spec.windows[selectedIndex];
  const selectedPane = selection?.popover && selectedWindow?.panes[selection.popover.pane];
  const selectedPopover =
    selection?.popover && selectedPane?.annotations?.[selection.popover.annotation];

  return (
    <div className="app">
      <aside className="sidebar">
        <header className="sidebar-header">
          {json ? (
            <button
              type="button"
              className="tool"
              aria-label="Back to the editor"
              title="Back to the editor"
              onClick={() => setJson(false)}
            >
              <BackIcon />
            </button>
          ) : null}
          <h1>{json ? "JSON" : "tin.so"}</h1>
          {!json && (
            <button
              type="button"
              className="tool"
              aria-label="Show the spec as JSON"
              title="JSON"
              onClick={() => setJson(true)}
            >
              <FormatIcon />
            </button>
          )}
        </header>
        {json ? (
          <JsonEditor spec={spec} onChange={update} />
        ) : (
          <>
            <Settings spec={spec} scene={rendered?.scene} onChange={update} />
            {selectedIndex !== undefined &&
              selection?.popover &&
              selectedPane &&
              selectedPopover && (
                <PopoverEditor
                  annotation={selectedPopover}
                  pane={selectedPane}
                  onChange={(annotation) => {
                    const { popover } = selection;
                    const window = selectedIndex;
                    if (!popover) return;
                    update((current) =>
                      updatePane(current, window, popover.pane, (pane) => ({
                        ...pane,
                        annotations: (pane.annotations ?? []).flatMap((old, i) =>
                          i !== popover.annotation ? [old] : annotation ? [annotation] : [],
                        ),
                      })),
                    );
                    if (!annotation) setSelected({ windows: [window] });
                  }}
                />
              )}
            <WindowList
              windows={spec.windows}
              selected={selection?.windows ?? []}
              open={selection?.added ? undefined : selectedIndex}
              onSelect={(windows, added) =>
                setSelected(windows.length > 0 ? { windows, ...(added && { added }) } : undefined)
              }
              onHover={setHovered}
              onAdd={() => {
                update((current) => ({
                  ...current,
                  windows: [...current.windows, { panes: [{ title: "untitled.ts", code: "" }] }],
                }));
                setSelected({ windows: [spec.windows.length] });
              }}
            >
              {selectedIndex !== undefined && !selection?.added && selectedWindow && (
                <WindowEditor
                  key={selectedIndex}
                  window={selectedWindow}
                  onChange={(window) =>
                    update((current) => updateWindow(current, selectedIndex, () => window))
                  }
                />
              )}
            </WindowList>
            <p className="sidebar-hint">
              Type in the image. Select code for colors and styles. Right-click code for highlights
              and popovers.
            </p>
          </>
        )}
      </aside>
      <main className="stage">
        <div className="toolbar">
          {status && <span className="status">{status}</span>}
          <a className="toolbar-link" href="/privacy">
            Privacy
          </a>
          <a
            className="tool bordered"
            href="https://x.com/zirkelc"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="@zirkelc on X"
            title="@zirkelc on X"
          >
            <XIcon />
          </a>
          <a
            className="tool bordered"
            href={import.meta.env.VITE_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Source code on GitHub"
            title="Source code on GitHub"
          >
            <GitHubIcon />
          </a>
          <Dropdown label="Shortcuts" className="tool bordered" trigger={<QuestionIcon />}>
            {() => (
              <dl className="shortcuts">
                {SHORTCUTS.map(([keys, action]) => (
                  <div key={keys}>
                    <dt>{keys}</dt>
                    <dd>{action}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Dropdown>
          <button type="button" className="secondary" onClick={() => void copyLink()}>
            <LinkIcon />
            Copy link
          </button>
          <div className="split-button">
            <button type="button" onClick={() => runExport(lastAction)}>
              {EXPORT_ACTIONS.find(({ action }) => action === lastAction)?.label}
            </button>
            <Dropdown label="More export options" trigger={<ChevronIcon />}>
              {(close) => (
                <div className="export-menu">
                  {EXPORT_ACTIONS.map(({ action, label }) => (
                    <button
                      key={action}
                      type="button"
                      role="menuitemradio"
                      aria-checked={action === lastAction}
                      className="menu-item"
                      onClick={() => {
                        close();
                        runExport(action);
                      }}
                    >
                      <span className="menu-check">{action === lastAction ? "✓" : ""}</span>
                      {label}
                    </button>
                  ))}
                  <div className="menu-separator" role="separator" />
                  <div className="export-scale">
                    <span>Scale</span>
                    <div className="segmented" role="radiogroup" aria-label="Scale">
                      {SCALES.map((value) => (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={value === scale}
                          onClick={() => changeExport({ scale: value })}
                        >
                          {value}x
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={metadata}
                    className="menu-item"
                    title="Writes the code and the settings into the image file. Drop the file here to edit it again."
                    onClick={() => changeExport({ metadata: !metadata })}
                  >
                    <span className="menu-check">{metadata ? "✓" : ""}</span>
                    Embed the spec
                  </button>
                </div>
              )}
            </Dropdown>
          </div>
        </div>
        {issues.length > 0 && (
          <ul className="issues">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        )}
        <Preview
          rendered={rendered}
          spec={spec}
          stale={issues.length > 0}
          selected={selection}
          onSelect={setSelected}
          onChange={update}
          onCopyImage={(windowIndexes) => void copyImage(windowIndexes)}
          hovered={hovered}
        />
      </main>
    </div>
  );
}
