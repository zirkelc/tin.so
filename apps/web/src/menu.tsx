import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type MenuItem =
  | {
      label: string;
      shortcut?: string;
      checked?: boolean;
      disabled?: boolean;
      onSelect: () => void;
      /**
       * Shows the change of the item while the pointer is on it (true), and takes it back when
       * the pointer leaves or the menu closes without a choice (false)
       */
      onPreview?: (active: boolean) => void;
    }
  | { label: string; disabled?: boolean; items: Array<MenuItem> }
  | "separator";

const MARGIN = 8;

/** A context menu at a point of the page, which closes on a click outside, Escape and scroll */
export function ContextMenu(props: {
  x: number;
  y: number;
  items: Array<MenuItem>;
  onClose: () => void;
  /**
   * false keeps the focus where it is, so that a code field keeps its selection visible while the
   * menu is open
   */
  focus?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: props.x, top: props.y });
  const { onClose, focus = true } = props;

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
    if (focus) ref.current?.focus();
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
  }, [onClose, focus]);

  return createPortal(
    <div
      ref={ref}
      className="menu"
      role="menu"
      tabIndex={-1}
      style={position}
      onContextMenu={(event) => event.preventDefault()}
      onMouseDown={(event) => !focus && event.preventDefault()}
    >
      <MenuItems items={props.items} onClose={onClose} />
    </div>,
    document.body,
  );
}

function MenuItems(props: { items: Array<MenuItem>; onClose: () => void }) {
  const [open, setOpen] = useState<number>();
  // The item that shows a preview, by its index, which ends when the menu closes. The items are
  // new on each render, so the index finds the item and not its function.
  const previewing = useRef<{ index: number; end: () => void }>(undefined);
  useEffect(() => () => previewing.current?.end(), []);
  return props.items.map((item, index) => {
    if (item === "separator")
      return <div key={index} className="menu-separator" role="separator" />;
    if ("items" in item)
      return (
        <Submenu
          key={index}
          item={item}
          open={open === index}
          onOpen={(next) => setOpen(next ? index : undefined)}
          onClose={props.onClose}
        />
      );
    return (
      <button
        key={index}
        type="button"
        role={item.checked === undefined ? "menuitem" : "menuitemcheckbox"}
        aria-checked={item.checked}
        className="menu-item"
        disabled={item.disabled}
        onPointerEnter={() => {
          setOpen(undefined);
          if (!item.onPreview || item.disabled) return;
          const { onPreview } = item;
          previewing.current = { index, end: () => onPreview(false) };
          onPreview(true);
        }}
        onPointerLeave={() => {
          if (previewing.current?.index !== index) return;
          previewing.current = undefined;
          item.onPreview?.(false);
        }}
        onClick={() => {
          item.onSelect();
          props.onClose();
        }}
      >
        <span className="menu-check">{item.checked ? "✓" : ""}</span>
        <span className="menu-label">{item.label}</span>
        {item.shortcut && <span className="menu-shortcut">{item.shortcut}</span>}
      </button>
    );
  });
}

/**
 * An item that opens its own menu at its side: on hover, a click or the right arrow key. The menu
 * opens at the left when the window has no room at the right.
 */
function Submenu(props: {
  item: Extract<MenuItem, { items: Array<MenuItem> }>;
  open: boolean;
  onOpen: (open: boolean) => void;
  onClose: () => void;
}) {
  const { item, open, onOpen } = props;
  const ref = useRef<HTMLDivElement>(null);
  const [left, setLeft] = useState(false);

  useLayoutEffect(() => {
    const rect = ref.current?.getBoundingClientRect();
    if (open && rect) setLeft(rect.right > window.innerWidth - MARGIN);
  }, [open]);

  return (
    <div className="menu-sub" onPointerEnter={() => !item.disabled && onOpen(true)}>
      <button
        type="button"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={open}
        className="menu-item"
        disabled={item.disabled}
        onClick={() => onOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") onOpen(true);
          if (event.key === "ArrowLeft") onOpen(false);
        }}
      >
        <span className="menu-check" />
        <span className="menu-label">{item.label}</span>
        <span className="menu-arrow" aria-hidden="true">
          ›
        </span>
      </button>
      {open && (
        <div
          ref={ref}
          className={left ? "menu menu-submenu left" : "menu menu-submenu"}
          role="menu"
          aria-label={item.label}
        >
          <MenuItems items={item.items} onClose={props.onClose} />
        </div>
      )}
    </div>
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
