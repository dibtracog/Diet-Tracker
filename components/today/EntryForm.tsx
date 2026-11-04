"use client";

import { useState } from "react";
import Field from "@/components/Field";
import { Icon } from "@/components/Icons";
import { fmt, round1 } from "@/lib/format";
import { updateEntry, type Entry } from "@/lib/store";

const STEP = 0.5;

export default function EntryForm({
  entry,
  onDone,
  onRemove,
}: {
  entry: Entry;
  onDone: () => void;
  onRemove: (e: Entry) => void;
}) {
  const [servings, setServings] = useState(entry.servings);
  const [time, setTime] = useState(entry.time);

  const save = (ev: React.FormEvent) => {
    ev.preventDefault();
    updateEntry(entry.id, { servings, time: /^\d{2}:\d{2}$/.test(time) ? time : entry.time });
    onDone();
  };

  return (
    <form className="form" onSubmit={save}>
      <div className="entry-head">
        <div className="t">{entry.name}</div>
        <div className="s">1 serving = {entry.serving}</div>
      </div>

      <div className="field">
        <span className="field-label">Servings</span>
        <div className="stepper">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setServings((s) => Math.max(STEP, round1(s - STEP)))}
            disabled={servings <= STEP}
            aria-label="Fewer servings"
          >
            <Icon name="minus" size={20} strokeWidth={2.2} />
          </button>
          <span className="stepper-val num">{round1(servings)}</span>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setServings((s) => round1(s + STEP))}
            aria-label="More servings"
          >
            <Icon name="plus" size={20} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      <div className="preview-macros num">
        <div className="pm">
          <b>{fmt(entry.kcal * servings)}</b>
          <span>kcal</span>
        </div>
        <div className="pm">
          <b>{fmt(entry.protein * servings)}g</b>
          <span>protein</span>
        </div>
        <div className="pm">
          <b>{fmt(entry.carbs * servings)}g</b>
          <span>carbs</span>
        </div>
        <div className="pm">
          <b>{fmt(entry.fat * servings)}g</b>
          <span>fat</span>
        </div>
      </div>

      <Field label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />

      <div className="form-actions">
        <button type="button" className="btn btn-danger" onClick={() => onRemove(entry)}>
          <Icon name="trash" size={16} />
          Delete
        </button>
        <button type="submit" className="btn btn-primary">
          Save
        </button>
      </div>
    </form>
  );
}
