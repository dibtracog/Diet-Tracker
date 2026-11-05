"use client";

import { useState } from "react";
import { parseNum } from "@/components/Field";
import { Icon } from "@/components/Icons";
import { fmt } from "@/lib/format";
import type { WaterLog } from "@/lib/store";

const timeOf = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const PRESETS = [150, 330, 750];
const MAX_ML = 5000;

/** Reads a millilitre amount; null if it isn't a sensible one. */
function readMl(value: string): number | null {
  const n = Math.round(parseNum(value, NaN));
  return n > 0 && n <= MAX_ML ? n : null;
}

/** The water sheet: add any amount, and edit or remove the day's entries. */
export default function WaterLogList({
  logs,
  onAdd,
  onUpdate,
  onRemove,
}: {
  logs: WaterLog[];
  onAdd: (ml: number) => void;
  onUpdate: (log: WaterLog, ml: number) => void;
  onRemove: (log: WaterLog) => void;
}) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const sorted = [...logs].sort((a, b) => a.createdAt - b.createdAt);
  const total = logs.reduce((s, w) => s + w.ml, 0);

  const add = (ml: number | null) => {
    if (ml === null) return setError(`Enter an amount between 1 and ${fmt(MAX_ML)} ml.`);
    setError("");
    setAmount("");
    onAdd(ml);
  };

  const saveEdit = (w: WaterLog) => {
    const ml = readMl(editValue);
    if (ml === null) return setError(`Enter an amount between 1 and ${fmt(MAX_ML)} ml.`);
    setError("");
    setEditing(null);
    if (ml !== w.ml) onUpdate(w, ml);
  };

  return (
    <div className="form">
      <form
        className="water-custom"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          add(readMl(amount));
        }}
      >
        <span className="field-label">Add an amount</span>
        <div className="water-custom-row">
          <span className="input-wrap has-suffix">
            <input
              className="input"
              inputMode="numeric"
              placeholder="e.g. 400"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-label="Water amount in ml"
            />
            <span className="input-suffix">ml</span>
          </span>
          <button type="submit" className="btn btn-primary">
            Add
          </button>
        </div>
        <div className="water-presets">
          {PRESETS.map((ml) => (
            <button key={ml} type="button" className="chip" onClick={() => add(ml)}>
              +{ml} ml
            </button>
          ))}
        </div>
      </form>

      {error ? <div className="form-error" role="alert">{error}</div> : null}

      <div>
        <div className="field-label" style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Entries</span>
          <span className="num">{fmt(total)} ml</span>
        </div>
        {sorted.length ? (
          sorted.map((w) =>
            editing === w.id ? (
              <form
                key={w.id}
                className="row"
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  saveEdit(w);
                }}
              >
                <span className="row-time num">{timeOf(w.createdAt)}</span>
                <span className="input-wrap has-suffix" style={{ flex: 1 }}>
                  <input
                    className="input"
                    inputMode="numeric"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    aria-label="New amount in ml"
                    autoFocus
                  />
                  <span className="input-suffix">ml</span>
                </span>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save
                </button>
              </form>
            ) : (
              <div key={w.id} className="row">
                <button
                  type="button"
                  className="row-hit"
                  onClick={() => {
                    setEditing(w.id);
                    setEditValue(String(w.ml));
                    setError("");
                  }}
                  aria-label={`Edit ${w.ml} ml`}
                >
                  <span className="row-time num">{timeOf(w.createdAt)}</span>
                  <span className="row-main">
                    <span className="row-title num">{fmt(w.ml)} ml</span>
                  </span>
                  <span className="row-edit">Edit</span>
                </button>
                <button
                  type="button"
                  className="icon-btn del"
                  style={{ opacity: 1 }}
                  onClick={() => onRemove(w)}
                  aria-label={`Remove ${w.ml} ml`}
                >
                  <Icon name="trash" size={18} />
                </button>
              </div>
            ),
          )
        ) : (
          <p className="quick-empty">No water logged for this day yet.</p>
        )}
      </div>
    </div>
  );
}
