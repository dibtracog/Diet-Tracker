"use client";

import { useState } from "react";
import { Icon } from "@/components/Icons";
import { HABIT_IDEAS } from "@/lib/habits";
import { addHabit, moveHabit, renameHabit, type Habit } from "@/lib/store";

const MAX_LEN = 40;

/** Add, rename, reorder and remove habits. */
export default function HabitsForm({ habits, onDelete }: { habits: Habit[]; onDelete: (habit: Habit) => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const taken = (n: string, except?: string) =>
    habits.some((h) => h.id !== except && h.name.trim().toLowerCase() === n.trim().toLowerCase());

  const add = (raw: string) => {
    const n = raw.trim().slice(0, MAX_LEN);
    if (!n) return setError("Type a name, e.g. Creatine.");
    if (taken(n)) return setError(`You already have “${n}”.`);
    setError("");
    setName("");
    addHabit(n);
  };

  const saveRename = (h: Habit) => {
    const n = editValue.trim().slice(0, MAX_LEN);
    if (!n) return setError("A habit needs a name.");
    if (taken(n, h.id)) return setError(`You already have “${n}”.`);
    setError("");
    setEditing(null);
    if (n !== h.name) renameHabit(h.id, n);
  };

  const ideas = HABIT_IDEAS.filter((i) => !taken(i));

  return (
    <div className="form">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          add(name);
        }}
      >
        <span className="field-label">New habit or supplement</span>
        <div className="water-custom-row">
          <span className="input-wrap">
            <input
              className="input"
              value={name}
              maxLength={MAX_LEN}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Creatine"
              aria-label="New habit name"
              enterKeyHint="done"
            />
          </span>
          <button type="submit" className="btn btn-primary">
            Add
          </button>
        </div>
        {ideas.length ? (
          <div className="water-presets">
            {ideas.slice(0, 6).map((i) => (
              <button key={i} type="button" className="chip" onClick={() => add(i)}>
                + {i}
              </button>
            ))}
          </div>
        ) : null}
      </form>

      {error ? <div className="form-error" role="alert">{error}</div> : null}

      {habits.length ? (
        <div className="ing-list">
          {habits.map((h, i) =>
            editing === h.id ? (
              <form
                key={h.id}
                className="row ing-row"
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  saveRename(h);
                }}
              >
                <span className="input-wrap" style={{ flex: 1 }}>
                  <input
                    className="input"
                    value={editValue}
                    maxLength={MAX_LEN}
                    onChange={(e) => setEditValue(e.target.value)}
                    aria-label={`Rename ${h.name}`}
                    autoFocus
                  />
                </span>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save
                </button>
              </form>
            ) : (
              <div key={h.id} className="row ing-row">
                <button
                  type="button"
                  className="row-main habit-name"
                  onClick={() => {
                    setEditing(h.id);
                    setEditValue(h.name);
                    setError("");
                  }}
                  aria-label={`Rename ${h.name}`}
                >
                  <span className="row-title">{h.name}</span>
                </button>
                <div className="mini-stepper">
                  <button type="button" onClick={() => moveHabit(h.id, -1)} disabled={i === 0} aria-label={`Move ${h.name} up`}>
                    <Icon name="chevronLeft" size={16} strokeWidth={2.2} style={{ transform: "rotate(90deg)" }} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveHabit(h.id, 1)}
                    disabled={i === habits.length - 1}
                    aria-label={`Move ${h.name} down`}
                  >
                    <Icon name="chevronRight" size={16} strokeWidth={2.2} style={{ transform: "rotate(90deg)" }} />
                  </button>
                </div>
                <button
                  type="button"
                  className="icon-btn del"
                  style={{ opacity: 1 }}
                  onClick={() => onDelete(h)}
                  aria-label={`Delete ${h.name}`}
                >
                  <Icon name="trash" size={18} />
                </button>
              </div>
            ),
          )}
        </div>
      ) : null}
      {habits.length ? <p className="fineprint" style={{ marginTop: 0 }}>Tap a name to rename it.</p> : null}
    </div>
  );
}
