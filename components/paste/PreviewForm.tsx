"use client";

import { useState } from "react";
import Field, { parseNum } from "@/components/Field";
import { Icon } from "@/components/Icons";
import { nowTime } from "@/lib/dates";
import { round1 } from "@/lib/format";
import type { ParsedDish } from "@/lib/importCode";
import { addEntry, addFood, resolvePendingMeal, type Food } from "@/lib/store";

type Vals = Record<"name" | "serving" | "kcal" | "protein" | "carbs" | "fat" | "fiber" | "sugar" | "sodium", string>;

const str = (n: number | undefined) => (n === undefined ? "" : String(n));

export default function PreviewForm({
  dish,
  date: initialDate,
  todayKey,
  foods,
  pendingId,
  initialTime,
  onSaved,
  onCancel,
}: {
  dish: ParsedDish;
  date: string;
  todayKey: string;
  foods: Food[];
  /** When filling in a photo meal, saving turns it into this entry. */
  pendingId?: string;
  initialTime?: string;
  onSaved: (info: { date: string; name: string; savedToLibrary: boolean }) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState<Vals>({
    name: dish.name,
    serving: dish.serving,
    kcal: str(dish.kcal),
    protein: str(dish.protein),
    carbs: str(dish.carbs),
    fat: str(dish.fat),
    fiber: str(dish.fiber),
    sugar: str(dish.sugar),
    sodium: str(dish.sodium),
  });
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(() => initialTime ?? nowTime());
  const [saveToLibrary, setSaveToLibrary] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof Vals) => (e: React.ChangeEvent<HTMLInputElement>) => setV((p) => ({ ...p, [k]: e.target.value }));
  const existing = foods.find((f) => f.name.trim().toLowerCase() === v.name.trim().toLowerCase());

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = v.name.trim();
    if (!name) return setError("Give the dish a name.");
    const kcal = parseNum(v.kcal, NaN);
    const protein = parseNum(v.protein, NaN);
    const carbs = parseNum(v.carbs, NaN);
    const fat = parseNum(v.fat, NaN);
    if (![kcal, protein, carbs, fat].every((n) => n >= 0)) {
      return setError("Calories, protein, carbs and fat must all be numbers, 0 or more.");
    }
    const opt = (s: string) => {
      const n = parseNum(s, NaN);
      return Number.isNaN(n) ? undefined : round1(n);
    };
    const extras = { fiber: opt(v.fiber), sugar: opt(v.sugar), sodium: opt(v.sodium) };
    if (Object.values(extras).some((n) => n !== undefined && n < 0)) return setError("Fiber, sugar and sodium can't be negative.");
    if (!date || date > todayKey) return setError("Pick today or a past day.");

    const base = {
      name,
      serving: v.serving.trim() || "1 serving",
      kcal: round1(kcal),
      protein: round1(protein),
      carbs: round1(carbs),
      fat: round1(fat),
      ...extras,
    };
    const entry = { ...base, date, time: /^\d{2}:\d{2}$/.test(time) ? time : nowTime(), servings: 1, notes: dish.notes };
    if (pendingId) resolvePendingMeal(pendingId, entry);
    else addEntry(entry);
    if (saveToLibrary) addFood({ ...base, favourite: false });
    onSaved({ date, name, savedToLibrary: saveToLibrary });
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      <Field label="Dish" value={v.name} onChange={set("name")} autoComplete="off" />
      <Field label="Portion" value={v.serving} onChange={set("serving")} autoComplete="off" />
      <div className="grid-2">
        <Field label="Calories" value={v.kcal} onChange={set("kcal")} inputMode="decimal" suffix="kcal" />
        <Field label="Protein" value={v.protein} onChange={set("protein")} inputMode="decimal" suffix="g" />
        <Field label="Carbs" value={v.carbs} onChange={set("carbs")} inputMode="decimal" suffix="g" />
        <Field label="Fat" value={v.fat} onChange={set("fat")} inputMode="decimal" suffix="g" />
      </div>
      <div className="grid-3">
        <Field label="Fiber" value={v.fiber} onChange={set("fiber")} inputMode="decimal" placeholder="–" suffix="g" />
        <Field label="Sugar" value={v.sugar} onChange={set("sugar")} inputMode="decimal" placeholder="–" suffix="g" />
        <Field label="Sodium" value={v.sodium} onChange={set("sodium")} inputMode="decimal" placeholder="–" suffix="mg" />
      </div>
      <div className="grid-2">
        <Field label="Day" type="date" value={date} max={todayKey} onChange={(e) => setDate(e.target.value)} />
        <Field label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>

      <div className="toggle-row" onClick={() => setSaveToLibrary((s) => !s)}>
        <span>
          Also save to my library
          {existing ? (
            <span className="toggle-sub">You already have a food called “{existing.name}”</span>
          ) : (
            <span className="toggle-sub">So you can log it again in one tap</span>
          )}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={saveToLibrary}
          aria-label="Also save to my library"
          className="switch"
          onClick={(e) => {
            e.stopPropagation();
            setSaveToLibrary((s) => !s);
          }}
        />
      </div>

      {error ? <div className="form-error" role="alert">{error}</div> : null}

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Start over
        </button>
        <button type="submit" className="btn btn-primary">
          <Icon name="check" size={18} strokeWidth={2.2} />
          Add to log
        </button>
      </div>
    </form>
  );
}
