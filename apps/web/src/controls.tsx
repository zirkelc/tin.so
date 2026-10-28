import type { ReactNode } from "react";

export function Switch(props: {
  label: string;
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
        aria-label={props.label}
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
  value: VALUE;
  options: Array<{ value: VALUE; label: ReactNode }>;
  disabled?: boolean;
  onChange: (value: VALUE) => void;
}) {
  return (
    <div className="field">
      <span className="field-label">{props.label}</span>
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
