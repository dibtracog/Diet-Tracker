"use client";

import { useState } from "react";
import { useToday } from "@/lib/useToday";

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export default function WeekStrip() {
  const today = useToday();
  const [selected, setSelected] = useState<Date | null>(null);

  if (!today) {
    return (
      <div className="week" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="day-pill is-skeleton" />
        ))}
      </div>
    );
  }

  // Week starts on Monday.
  const start = new Date(today);
  start.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const current = selected ?? today;

  return (
    <div className="week" role="group" aria-label="Choose a day">
      {days.map((d) => {
        const isToday = sameDay(d, today);
        const isSel = sameDay(d, current);
        const future = d > today && !isToday;
        return (
          <button
            key={d.toISOString()}
            type="button"
            disabled={future}
            onClick={() => setSelected(d)}
            className={`day-pill ${isToday ? "is-today" : ""} ${isSel ? "is-selected" : ""}`}
            aria-pressed={isSel}
          >
            <span className="dow">{d.toLocaleDateString("en-IN", { weekday: "short" })}</span>
            <span className="dnum num">{d.getDate()}</span>
          </button>
        );
      })}
    </div>
  );
}
