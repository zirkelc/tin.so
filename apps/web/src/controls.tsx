import { type ReactNode, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function Switch(props: {
  label: string;
  /** A name for screen readers when the visible label is not unique on the page */
  ariaLabel?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="switch-field">
      <span>{props.label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={props.checked}
        aria-label={props.ariaLabel ?? props.label}
        disabled={props.disabled}
        className="switch"
        onClick={() => props.onChange(!props.checked)}
      >
        <span className="switch-thumb" />
      </button>
    </label>
  );
}

export function Segmented<VALUE extends string | number>(props: {
  label: string;
  /** An explanation of the setting, which shows when the pointer is on the label */
  help?: string;
  value: VALUE;
  options: Array<{ value: VALUE; label: ReactNode }>;
  disabled?: boolean;
  onChange: (value: VALUE) => void;
}) {
  return (
    <div className="field">
      <span className="field-label">
        {props.help ? <HelpTerm help={props.help}>{props.label}</HelpTerm> : props.label}
      </span>
      <div className="segmented" role="radiogroup" aria-label={props.label}>
        {props.options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={option.value === props.value}
            disabled={props.disabled}
            onClick={() => props.onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Field(props: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{props.label}</span>
      {props.children}
    </label>
  );
}

// Space between a help tip and the edge of the window, in px
const HELP_MARGIN = 8;

/**
 * A term with a dotted underline. Its explanation shows below it when the pointer is on it or when
 * it has the keyboard focus, and screen readers read it as the description of the term. The
 * explanation is in the document body, so that a side panel that scrolls does not cut it off.
 */
export function HelpTerm(props: { help: string; children: ReactNode }) {
  const id = useId();
  const termRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<{ left: number; top: number }>();

  // The tip starts below the term and moves left as far as it needs to stay in the window
  useLayoutEffect(() => {
    if (!open || !termRef.current || !tipRef.current) return;
    const term = termRef.current.getBoundingClientRect();
    const tip = tipRef.current.getBoundingClientRect();
    setPlace({
      left: Math.max(HELP_MARGIN, Math.min(term.left, window.innerWidth - HELP_MARGIN - tip.width)),
      top: term.bottom + 6,
    });
  }, [open]);

  const show = () => setOpen(true);
  const hide = () => {
    setOpen(false);
    setPlace(undefined);
  };
  return (
    <>
      <span
        ref={termRef}
        className="help-term"
        tabIndex={0}
        aria-describedby={id}
        onPointerEnter={show}
        onPointerLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {props.children}
      </span>
      {createPortal(
        <span
          ref={tipRef}
          role="tooltip"
          id={id}
          className="help-tip"
          data-open={open || undefined}
          style={place ?? { left: 0, top: 0, visibility: "hidden" }}
        >
          {props.help}
        </span>,
        document.body,
      )}
    </>
  );
}
