import type { Icon } from "@tin.so/core";
import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

export type SelectOption<VALUE extends string> = {
  value: VALUE;
  label: string;
  icon?: ReactNode;
  /** Options with the same group follow each other below a group heading */
  group?: string;
  /** A shorter text for the closed select, when the label is long */
  shortLabel?: string;
};

const POPOVER_MIN_WIDTH = 220;
const POPOVER_MAX_HEIGHT = 320;
const MARGIN = 8;

/** An icon of the image renderer, as an inline SVG */
export function IconSvg(props: { icon: Icon | undefined }) {
  const { icon } = props;
  if (!icon) return <span className="select-icon" />;
  const paint =
    icon.style === "fill"
      ? { fill: "currentColor" }
      : {
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 2,
          strokeLinecap: "round" as const,
          strokeLinejoin: "round" as const,
        };
  return (
    <svg
      className="select-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      {...paint}
      // The icon bodies are static SVG from the icon set
      dangerouslySetInnerHTML={{ __html: icon.body }}
    />
  );
}

/** Puts the popover below the trigger, or above it when there is more space there */
function popoverPosition(trigger: HTMLElement): CSSProperties {
  const rect = trigger.getBoundingClientRect();
  const width = Math.max(rect.width, POPOVER_MIN_WIDTH);
  const left = Math.max(MARGIN, Math.min(rect.left, window.innerWidth - width - MARGIN));
  const below = window.innerHeight - rect.bottom - MARGIN;
  const above = rect.top - MARGIN;
  if (below >= Math.min(POPOVER_MAX_HEIGHT, 200) || below >= above) {
    return { left, width, top: rect.bottom + 4, maxHeight: Math.min(POPOVER_MAX_HEIGHT, below) };
  }
  return {
    left,
    width,
    bottom: window.innerHeight - rect.top + 4,
    maxHeight: Math.min(POPOVER_MAX_HEIGHT, above),
  };
}

/** A dropdown with icons, groups and an optional search field */
export function Select<VALUE extends string>(props: {
  label: string;
  /** Hides the label above the trigger. The label stays for screen readers. */
  hideLabel?: boolean;
  /** Replaces the content of the trigger, for a trigger that looks like a part of the image */
  trigger?: ReactNode;
  className?: string;
  style?: CSSProperties;
  value: VALUE;
  options: Array<SelectOption<VALUE>>;
  searchable?: boolean;
  /** The arrow keys apply the option at once, and Escape restores the value from before */
  preview?: boolean;
  disabled?: boolean;
  onChange: (value: VALUE) => void;
}) {
  const { options, value } = props;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  // The value when the popover opened, which Escape restores after a preview
  const initialRef = useRef(value);
  const selected = options.find((option) => option.value === value);

  const filtered = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return options;
    return options.filter((option) => {
      const text = `${option.label} ${option.value} ${option.group ?? ""}`.toLowerCase();
      return words.every((word) => text.includes(word));
    });
  }, [options, query]);

  const show = () => {
    if (props.disabled || !triggerRef.current) return;
    setPosition(popoverPosition(triggerRef.current));
    setQuery("");
    setActive(Math.max(0, options.indexOf(selected!)));
    initialRef.current = value;
    setOpen(true);
  };

  const close = (focusTrigger: boolean) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  };

  const choose = (option: SelectOption<VALUE> | undefined) => {
    if (!option) return;
    props.onChange(option.value);
    close(true);
  };

  // Closes when the user clicks outside, scrolls the page or resizes the window
  useEffect(() => {
    if (!open) return;
    const inside = (target: EventTarget | null) =>
      target instanceof Node &&
      (popoverRef.current?.contains(target) || triggerRef.current?.contains(target));
    const onPointerDown = (event: PointerEvent) => !inside(event.target) && close(false);
    const onScroll = (event: Event) => !inside(event.target) && close(false);
    const onResize = () => close(false);
    // The capture phase, because a drag in the image stops the pointerdown before it reaches the page
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  // Without a search field, the popover takes the focus, so that the arrow keys work
  useEffect(() => {
    if (open && !props.searchable) popoverRef.current?.focus();
  }, [open, props.searchable]);

  // Keeps the active option visible while the user moves with the arrow keys
  useLayoutEffect(() => {
    if (!open) return;
    const item = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    item?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      const next = Math.min(filtered.length - 1, Math.max(0, active + step));
      setActive(next);
      const option = filtered[next];
      if (props.preview && option && option.value !== value) props.onChange(option.value);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(filtered[active]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      if (props.preview && value !== initialRef.current) props.onChange(initialRef.current);
      close(true);
    } else if (event.key === "Tab") {
      close(false);
    }
  };

  const optionId = (index: number) => `${listId}-${index}`;

  return (
    <div className={props.className ?? "field select"} style={props.style}>
      {!props.hideLabel && <span className="field-label">{props.label}</span>}
      <button
        ref={triggerRef}
        type="button"
        className={props.trigger ? "select-trigger-custom" : "select-trigger"}
        aria-label={props.hideLabel ? props.label : undefined}
        title={props.trigger ? props.label : undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={props.disabled}
        onClick={() => (open ? close(false) : show())}
        onKeyDown={(event) => {
          if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            event.preventDefault();
            show();
          }
        }}
      >
        {props.trigger ?? (
          <>
            {selected?.icon}
            <span className="select-value">{selected?.shortLabel ?? selected?.label ?? value}</span>
            <svg className="select-chevron" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </>
        )}
      </button>
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className="select-popover"
            style={position}
            onKeyDown={onKeyDown}
            // Without a search field, the list takes the keys
            tabIndex={-1}
          >
            {props.searchable && (
              <input
                className="select-search"
                // oxlint-disable-next-line jsx-a11y/no-autofocus -- the search field opens on purpose
                autoFocus
                placeholder="Search…"
                aria-label={`Search ${props.label}`}
                aria-controls={listId}
                aria-activedescendant={filtered[active] ? optionId(active) : undefined}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(0);
                }}
              />
            )}
            <ul ref={listRef} id={listId} role="listbox" aria-label={props.label}>
              {filtered.map((option, index) => (
                <li key={option.value} role="presentation">
                  {option.group && option.group !== filtered[index - 1]?.group && (
                    <div className="select-group">{option.group}</div>
                  )}
                  <div
                    id={optionId(index)}
                    data-index={index}
                    role="option"
                    aria-selected={option.value === value}
                    className={index === active ? "select-option active" : "select-option"}
                    onPointerMove={() => setActive(index)}
                    onClick={() => choose(option)}
                  >
                    {option.icon}
                    <span className="select-value">{option.label}</span>
                    {option.value === value && <span className="select-check">✓</span>}
                  </div>
                </li>
              ))}
              {filtered.length === 0 && <li className="select-empty">No results</li>}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
}
