"use client";

import { useState } from "react";
import Field, { parseNum } from "@/components/Field";
import { round1 } from "@/lib/format";
import { updateGoals, type Goals } from "@/lib/store";

type Key = keyof Goals;

export default function GoalsForm({ goals, onSaved }: { goals: Goals; onSaved: () => void }) {
  const [v, setV] = useState<Record<Key, string>>({
    kcal: String(goals.kcal),
    protein: String(goals.protein),
    carbs: String(goals.carbs),
    fat: String(goals.fat),
    waterMl: String(goals.waterMl),
    weightKg: goals.weightKg ? String(goals.weightKg) : "",
    windowHours: goals.windowHours ? String(goals.windowHours) : "",
  });
  const [error, setError] = useState("");
  const set = (k: Key) => (e: React.ChangeEvent<HTMLInputElement>) => setV((p) => ({ ...p, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Object.fromEntries((Object.keys(v) as Key[]).map((k) => [k, parseNum(v[k], NaN)])) as Goals;
    if (!(n.kcal > 0)) return setError("Daily calories must be more than 0.");
    if (![n.protein, n.carbs, n.fat].every((x) => x >= 0)) return setError("Macro targets must be numbers, 0 or more.");
    if (!(n.waterMl > 0)) return setError("Water goal must be more than 0.");
    const weight = v.weightKg.trim() ? parseNum(v.weightKg, NaN) : undefined;
    if (weight !== undefined && !(weight >= 20 && weight <= 400)) return setError("Goal weight should be in kg, e.g. 70.");
    const windowHours = v.windowHours.trim() ? parseNum(v.windowHours, NaN) : undefined;
    if (windowHours !== undefined && !(windowHours >= 1 && windowHours <= 23))
      return setError("Eating window should be in hours, e.g. 8 for 16:8.");
    updateGoals({
      kcal: Math.round(n.kcal),
      protein: round1(n.protein),
      carbs: round1(n.carbs),
      fat: round1(n.fat),
      waterMl: Math.round(n.waterMl),
      ...(weight !== undefined ? { weightKg: round1(weight) } : {}),
      ...(windowHours !== undefined ? { windowHours: round1(windowHours) } : {}),
    });
    onSaved();
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      <Field label="Daily calories" value={v.kcal} onChange={set("kcal")} inputMode="numeric" suffix="kcal" />
      <div className="grid-2">
        <Field label="Protein" value={v.protein} onChange={set("protein")} inputMode="decimal" suffix="g" />
        <Field label="Carbs" value={v.carbs} onChange={set("carbs")} inputMode="decimal" suffix="g" />
        <Field label="Fat" value={v.fat} onChange={set("fat")} inputMode="decimal" suffix="g" />
        <Field label="Water" value={v.waterMl} onChange={set("waterMl")} inputMode="numeric" suffix="ml" />
      </div>
      <Field
        label="Goal weight (optional)"
        value={v.weightKg}
        onChange={set("weightKg")}
        inputMode="decimal"
        suffix="kg"
        placeholder="Leave empty for none"
      />
      <Field
        label="Eating window (optional)"
        value={v.windowHours}
        onChange={set("windowHours")}
        inputMode="decimal"
        suffix="h"
        placeholder="e.g. 8 for 16:8"
      />
      {error ? <div className="form-error" role="alert">{error}</div> : null}
      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          Save goals
        </button>
      </div>
    </form>
  );
}
