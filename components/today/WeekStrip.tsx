"use client";

import { Icon } from "@/components/Icons";
import { addDays, fromKey } from "@/lib/dates";

export default function WeekStrip({
  selected,
  todayKey,
  onSelect,
  logged,
}: {
  selected: string;
  todayKey: string;
  onSelect: (key: string) => void;
  /** Days with food logged get a small dot. */
  logged: Set<string>;
}) {
  // Week of the selected day, starting Monday.
  const start = addDays(selected, -((fromKey(selected).getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const canNext = addDays(start, 7) <= todayKey;

  return (
    <div className="week-wrap">
      <button type="button" className="week-arrow" onClick={() => onSelect(addDays(selected, -7))} aria-label="Previous week">
        <Icon name="chevronLeft" size={18} />
      </button>
      <div className="week" role="group" aria-label="Choose a day">
        {days.map((k) => {
          const d = fromKey(k);
          const isToday = k === todayKey;
          const isSel = k === selected;
          return (
            <button
              key={k}
              type="button"
              disabled={k > todayKey}
              onClick={() => onSelect(k)}
              className={`day-pill ${isToday ? "is-today" : ""} ${isSel ? "is-selected" : ""} ${logged.has(k) ? "has-log" : ""}`}
              aria-pressed={isSel}
              aria-label={`${d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}${logged.has(k) ? ", logged" : ""}`}
            >
              <span className="dow">{d.toLocaleDateString("en-IN", { weekday: "short" })}</span>
              <span className="dnum num">{d.getDate()}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="week-arrow"
        disabled={!canNext}
        onClick={() => {
          const next = addDays(selected, 7);
          onSelect(next > todayKey ? todayKey : next);
        }}
        aria-label="Next week"
      >
        <Icon name="chevronRight" size={18} />
      </button>
    </div>
  );
}
