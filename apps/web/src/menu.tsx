import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type MenuItem =
  | {
      label: string;
      shortcut?: string;
      checked?: boolean;
      disabled?: boolean;
      onSelect: () => void;
    }
  | "separator";

const MARGIN = 8;

/** A context menu at a point of the page, which closes on a click outside, Escape and scroll */
export function ContextMenu(props: {
  x: number;
  y: number;
  items: Array<MenuItem>;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: props.x, top: props.y });
  const { onClose } = props;

  // Keeps the menu in the window
  useLayoutEffect(() => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({
      left: Math.max(MARGIN, Math.min(props.x, window.innerWidth - rect.width - MARGIN)),
      top: Math.max(MARGIN, Math.min(props.y, window.innerHeight - rect.height - MARGIN)),
    });
  }, [props.x, props.y]);

  useEffect(() => {
    ref.current?.focus();
    const outside = (event: Event) =>
      !(event.target instanceof Node && ref.current?.contains(event.target)) && onClose();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    // The capture phase, because a drag in the image stops the pointerdown before it reaches the page
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("scroll", outside, true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("blur", onClose);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("scroll", outside, true);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", onClose);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      className="menu"
      role="menu"
      tabIndex={-1}
      style={position}
      onContextMenu={(event) => event.preventDefault()}
    >
      {props.items.map((item, index) =>
        item === "separator" ? (
          <div key={index} className="menu-separator" role="separator" />
        ) : (
          <button
            key={index}
            type="button"
            role={item.checked === undefined ? "menuitem" : "menuitemcheckbox"}
            aria-checked={item.checked}
            className="menu-item"
            disabled={item.disabled}
            onClick={() => {
              item.onSelect();
              onClose();
            }}
          >
            <span className="menu-check">{item.checked ? "✓" : ""}</span>
            <span className="menu-label">{item.label}</span>
            {item.shortcut && <span className="menu-shortcut">{item.shortcut}</span>}
          </button>
        ),
      )}
    </div>,
    document.body,
  );
}

/** A button that opens a panel below it. The panel closes on a click outside and on Escape. */
export function Dropdown(props: {
  label: string;
  trigger: ReactNode;
  className?: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (event: Event) =>
      !(event.target instanceof Node && ref.current?.contains(event.target)) && setOpen(false);
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    // The capture phase, because a drag in the image stops the pointerdown before it reaches the page
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="dropdown">
      <button
        type="button"
        className={props.className}
        aria-label={props.label}
        aria-expanded={open}
        title={props.label}
        onClick={() => setOpen(!open)}
      >
        {props.trigger}
      </button>
      {open && <div className="dropdown-panel">{props.children(() => setOpen(false))}</div>}
    </div>
  );
}
