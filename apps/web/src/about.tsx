import { useEffect, useRef } from "react";
import { CloseIcon, GitHubIcon, XIcon } from "./icons.tsx";

const X_URL = "https://x.com/zirkelc";
const EMAIL = "info@tin.so";

/** The shortcuts of the editor: what a shortcut does, and its keys or mouse action */
export const SHORTCUTS: Array<{ action: string; keys: Array<string> }> = [
  { action: "Highlight, popovers, clear styles", keys: ["Right-click"] },
  { action: "Highlight a line", keys: ["⌥", "click"] },
  { action: "Colors and styles", keys: ["Select code"] },
  { action: "Bold", keys: ["⌘", "B"] },
  { action: "Italic", keys: ["⌘", "I"] },
  { action: "Underline", keys: ["⌘", "U"] },
  { action: "Strikethrough", keys: ["⌘", "⇧", "X"] },
  { action: "Format the code", keys: ["⌥", "⇧", "F"] },
  { action: "Move a window", keys: ["Drag"] },
  { action: "Resize, double-click to fit", keys: ["Drag an edge"] },
  { action: "Select windows", keys: ["Drag the background"] },
  { action: "Add to the selection", keys: ["⇧", "click"] },
  { action: "Select all", keys: ["⌘", "A"] },
  { action: "Select none", keys: ["Esc"] },
  { action: "Duplicate the window", keys: ["⌘", "D"] },
  { action: "Copy and paste windows", keys: ["⌘", "C", "⌘", "V"] },
  { action: "Bring forward, send backward", keys: ["⌘", "]", "⌘", "["] },
  { action: "Bring to front, send to back", keys: ["⌘", "⇧", "]", "⌘", "⇧", "["] },
  { action: "Remove the selection", keys: ["⌫"] },
  { action: "Edit an exported image", keys: ["Drop the file"] },
  { action: "Open this dialog", keys: ["?"] },
];

/** True when a key press goes to a field, so that a typed character is not a shortcut */
export function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

/** The about dialog with the shortcuts, opened from the toolbar or with the ? key */
export function AboutDialog(props: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (props.open && !dialog.open) {
      dialog.showModal();
      // The first focus goes to the close button, not to the first link of the text
      closeRef.current?.focus();
    }
    if (!props.open && dialog.open) dialog.close();
  }, [props.open]);

  return (
    <dialog
      ref={ref}
      className="about"
      aria-labelledby="about-title"
      onClose={props.onClose}
      // A click on the backdrop is a click on the dialog element itself
      onClick={(event) => event.target === event.currentTarget && props.onClose()}
    >
      <div className="about-body">
        <section className="about-text">
          <h2 id="about-title">About</h2>
          <p>
            tin.so makes images of code for posts, docs and slides. One image can show several
            files: windows side by side, panes in a window, and popovers that point to a word.
          </p>
          <p>
            Type or paste your code into the image. Pick a theme and a layout in the sidebar, and
            right-click code to add highlights and popovers.
          </p>
          <p>
            Save a PNG or an SVG, copy the image, or copy a link. An exported image keeps its code,
            so you can drop it into the editor and edit it again.
          </p>
          <h2>For agents</h2>
          <p>
            The <code>tin</code> CLI makes the same images on your machine, with no browser:
          </p>
          <pre>npx tin.so main.ts</pre>
          <p>
            The <code>tin</code> skill shows coding agents such as Claude Code, Codex and Cursor how
            to use it:
          </p>
          <pre>npx skills add zirkelc/tin.so</pre>
          <h2>Contribute</h2>
          <p>
            The project is open source and{" "}
            <a href={import.meta.env.VITE_GITHUB_URL} target="_blank" rel="noopener noreferrer">
              available on GitHub
            </a>
            .
          </p>
          <p>
            For questions or feedback, write to{" "}
            <a href={X_URL} target="_blank" rel="noopener noreferrer">
              @zirkelc on X
            </a>{" "}
            or send an email to <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
          </p>
          <footer className="about-footer">
            <span className="about-legal">
              <span>
                Made by{" "}
                <a href={X_URL} target="_blank" rel="noopener noreferrer">
                  @zirkelc
                </a>
              </span>
              <a href="/privacy">Privacy</a>
              <a href="/legal">Legal</a>
            </span>
            <span className="about-links">
              <a
                href={import.meta.env.VITE_GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
              >
                <GitHubIcon />
              </a>
              <a href={X_URL} target="_blank" rel="noopener noreferrer" aria-label="X">
                <XIcon />
              </a>
            </span>
          </footer>
        </section>
        <section className="about-shortcuts">
          <h2>Shortcuts</h2>
          <dl>
            {SHORTCUTS.map(({ action, keys }) => (
              <div key={action}>
                <dt>{action}</dt>
                <dd>
                  {keys.map((key, index) => (
                    <kbd key={index}>{key}</kbd>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
      <button
        ref={closeRef}
        type="button"
        className="about-close"
        aria-label="Close"
        onClick={props.onClose}
      >
        <CloseIcon />
      </button>
    </dialog>
  );
}
