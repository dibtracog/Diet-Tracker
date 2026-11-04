import type { InputHTMLAttributes } from "react";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; suffix?: string };

export default function Field({ label, suffix, className, ...input }: FieldProps) {
  return (
    <label className={`field ${className ?? ""}`}>
      <span className="field-label">{label}</span>
      <span className={`input-wrap ${suffix ? "has-suffix" : ""}`}>
        <input className="input" {...input} />
        {suffix ? <span className="input-suffix">{suffix}</span> : null}
      </span>
    </label>
  );
}

/** Parses a number field. Empty counts as `empty`; returns NaN when invalid. */
export function parseNum(value: string, empty = 0): number {
  const v = value.trim().replace(",", ".");
  if (v === "") return empty;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}
