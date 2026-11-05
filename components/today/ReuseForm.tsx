"use client";

import { useState } from "react";
import Field from "@/components/Field";
import { Icon } from "@/components/Icons";
import { amountLabel, fmt } from "@/lib/format";
import { addCombo, comboItemFrom, copyEntries, entryTotals, type Entry } from "@/lib/store";

/**
 * Pick foods from a day's log, then copy them to today or save them as a combo.
 * `copyTo` is the day to copy into; leave it out when the source day is that day.
 */
export default function ReuseForm({
  entries,
  copyTo,
  copyLabel,
  onCopied,
  onSaved,
}: {
  entries: Entry[];
  copyTo?: string;
  copyLabel?: string;
  onCopied: (copies: Entry[]) => void;
  onSaved: (name: string) => void;
}) {
  const [picked, setPicked] = useState<Set<string>>(() => new Set(entries.map((e) => e.id)));
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const chosen = entries.filter((e) => picked.has(e.id));
  const t = entryTotals(chosen);
  const toggle = (id: string) =>
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (naming) {
    return (
      <form
        className="form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return setError("Give the combo a name.");
          addCombo(name.trim(), chosen.map(comboItemFrom));
          onSaved(name.trim());
        }}
      >
        <p className="sheet-text" style={{ marginBottom: 0 }}>
          {chosen.length} food{chosen.length === 1 ? "" : "s"} · {fmt(t.kcal)} kcal. Log them all in one tap from Quick
          add or your library.
        </p>
        <Field
          label="Combo name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Usual breakfast"
          autoComplete="off"
          autoFocus
        />
        {error ? <div className="form-error" role="alert">{error}</div> : null}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setNaming(false)}>
            Back
          </button>
          <button type="submit" className="btn btn-primary">
            Save combo
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="form">
      <div className="pick-list">
        {entries.map((e) => {
          const on = picked.has(e.id);
          return (
            <button
              key={e.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              className="row pick-row"
              onClick={() => toggle(e.id)}
            >
              <span className={`goal-mark ${on ? "ok" : ""}`}>
                {on ? <Icon name="check" size={14} strokeWidth={2.6} /> : null}
              </span>
              <span className="row-main">
                <span className="row-title" style={{ display: "block" }}>
                  {e.name}
                </span>
                <span className="row-sub num" style={{ display: "block" }}>
                  {e.time} · {amountLabel(e, e.servings)}
                </span>
              </span>
              <span className="row-kcal num">
                {fmt(e.kcal * e.servings)}
                <small>kcal</small>
              </span>
            </button>
          );
        })}
      </div>
      <div className="reuse-total num">
        <span>
          {chosen.length} of {entries.length} selected
        </span>
        <b>{fmt(t.kcal)} kcal</b>
      </div>
      <div className="form-actions">
        <button
          type="button"
          className={`btn ${copyTo ? "btn-secondary" : "btn-primary"}`}
          disabled={!chosen.length}
          onClick={() => {
            setError("");
            setNaming(true);
          }}
        >
          <Icon name="layers" size={16} />
          Save as combo
        </button>
        {copyTo ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={!chosen.length}
            onClick={() => onCopied(copyEntries(chosen, copyTo))}
          >
            <Icon name="copy" size={16} />
            {copyLabel ?? "Copy"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
