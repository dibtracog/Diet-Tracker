"use client";

import { useState } from "react";
import Field, { parseNum } from "@/components/Field";
import { shortDate } from "@/lib/dates";
import { round1 } from "@/lib/format";
import type { WeightLog } from "@/lib/store";

export default function WeightForm({
  todayKey,
  weights,
  lastKg,
  onSave,
}: {
  todayKey: string;
  weights: WeightLog[];
  lastKg?: number;
  onSave: (date: string, kg: number) => void;
}) {
  const [kg, setKg] = useState(lastKg ? String(lastKg) : "");
  const [date, setDate] = useState(todayKey);
  const [error, setError] = useState("");
  const existing = weights.find((w) => w.date === date);

  return (
    <form
      className="form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const v = parseNum(kg, NaN);
        if (!(v >= 20 && v <= 400)) return setError("Enter your weight in kg, e.g. 72.4");
        if (!date || date > todayKey) return setError("Pick today or a past day.");
        onSave(date, round1(v));
      }}
    >
      <Field
        label="Weight"
        value={kg}
        onChange={(e) => setKg(e.target.value)}
        inputMode="decimal"
        suffix="kg"
        placeholder="e.g. 72.4"
        autoFocus
      />
      <Field label="Day" type="date" value={date} max={todayKey} onChange={(e) => setDate(e.target.value)} />
      {existing ? (
        <p className="helper" style={{ marginTop: -4 }}>
          Replaces the {existing.kg.toFixed(1)} kg logged on {date === todayKey ? "today" : shortDate(date)}.
        </p>
      ) : null}
      <p className="helper" style={{ marginTop: -4 }}>
        Tip: weigh yourself at the same time each day, e.g. in the morning before eating.
      </p>
      {error ? <div className="form-error" role="alert">{error}</div> : null}
      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          Save weight
        </button>
      </div>
    </form>
  );
}
