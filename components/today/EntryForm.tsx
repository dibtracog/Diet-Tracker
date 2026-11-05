"use client";

import { useState } from "react";
import Field, { parseNum } from "@/components/Field";
import { Icon } from "@/components/Icons";
import { Photo } from "@/components/Thumb";
import { fmt, round1 } from "@/lib/format";
import { updateEntry, type Entry, type EntryPatch } from "@/lib/store";

const STEP = 0.5;

type Details = Record<"name" | "serving" | "kcal" | "protein" | "carbs" | "fat", string>;

export default function EntryForm({
  entry,
  onDone,
  onRemove,
  onLogAgain,
}: {
  entry: Entry;
  onDone: () => void;
  onRemove: (e: Entry) => void;
  onLogAgain: (e: Entry) => void;
}) {
  const [servings, setServings] = useState(entry.servings);
  const [time, setTime] = useState(entry.time);
  const [d, setD] = useState<Details>({
    name: entry.name,
    serving: entry.serving,
    kcal: String(entry.kcal),
    protein: String(entry.protein),
    carbs: String(entry.carbs),
    fat: String(entry.fat),
  });
  const [error, setError] = useState("");

  const set = (k: keyof Details) => (e: React.ChangeEvent<HTMLInputElement>) => setD((p) => ({ ...p, [k]: e.target.value }));

  // Live preview uses whatever is typed, falling back to the saved numbers.
  const per = (k: "kcal" | "protein" | "carbs" | "fat") => {
    const n = parseNum(d[k], NaN);
    return n >= 0 ? n : entry[k];
  };

  const save = (ev: React.FormEvent) => {
    ev.preventDefault();
    const name = d.name.trim();
    if (!name) return setError("Give the entry a name.");
    const nums = (["kcal", "protein", "carbs", "fat"] as const).map((k) => parseNum(d[k], NaN));
    if (!nums.every((n) => n >= 0)) return setError("Calories, protein, carbs and fat must be numbers, 0 or more.");
    const [kcal, protein, carbs, fat] = nums.map(round1);
    const patch: EntryPatch = {
      servings,
      time: /^\d{2}:\d{2}$/.test(time) ? time : entry.time,
      name,
      serving: d.serving.trim() || entry.serving,
      kcal,
      protein,
      carbs,
      fat,
    };
    updateEntry(entry.id, patch);
    onDone();
  };

  return (
    <form className="form" onSubmit={save} noValidate>
      <Photo photoId={entry.photoId} />

      <div className="entry-head">
        <div className="t">{d.name || entry.name}</div>
        <div className="s">1 serving = {d.serving || entry.serving}</div>
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
          <button type="button" className="icon-btn" onClick={() => setServings((s) => round1(s + STEP))} aria-label="More servings">
            <Icon name="plus" size={20} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      <div className="preview-macros num">
        <div className="pm">
          <b>{fmt(per("kcal") * servings)}</b>
          <span>kcal</span>
        </div>
        <div className="pm">
          <b>{fmt(per("protein") * servings)}g</b>
          <span>protein</span>
        </div>
        <div className="pm">
          <b>{fmt(per("carbs") * servings)}g</b>
          <span>carbs</span>
        </div>
        <div className="pm">
          <b>{fmt(per("fat") * servings)}g</b>
          <span>fat</span>
        </div>
      </div>

      <Field label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />

      <details className="disclosure" style={{ marginTop: 0 }}>
        <summary>
          <Icon name="chevronRight" size={16} />
          Edit name and nutrition
        </summary>
        <div className="form" style={{ marginTop: 12 }}>
          <Field label="Name" value={d.name} onChange={set("name")} autoComplete="off" />
          <Field label="One serving is" value={d.serving} onChange={set("serving")} autoComplete="off" />
          <div className="grid-2">
            <Field label="Calories / serving" value={d.kcal} onChange={set("kcal")} inputMode="decimal" suffix="kcal" />
            <Field label="Protein / serving" value={d.protein} onChange={set("protein")} inputMode="decimal" suffix="g" />
            <Field label="Carbs / serving" value={d.carbs} onChange={set("carbs")} inputMode="decimal" suffix="g" />
            <Field label="Fat / serving" value={d.fat} onChange={set("fat")} inputMode="decimal" suffix="g" />
          </div>
        </div>
      </details>

      {entry.notes ? <p className="ai-note">{entry.notes}</p> : null}
      {error ? <div className="form-error" role="alert">{error}</div> : null}

      <button type="button" className="btn btn-ghost btn-block" onClick={() => onLogAgain(entry)}>
        <Icon name="copy" size={16} />
        Log this again today
      </button>

      <div className="form-actions" style={{ marginTop: 0 }}>
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
