"use client";

import { Icon } from "@/components/Icons";
import type { Habit } from "@/lib/store";

/** Today's checklist of supplements and habits. */
export default function HabitsCard({
  habits,
  done,
  streaks,
  onToggle,
  onManage,
}: {
  habits: Habit[];
  /** Habit ids ticked on the day being viewed. */
  done: Set<string>;
  streaks: Map<string, number>;
  onToggle: (habit: Habit) => void;
  onManage: () => void;
}) {
  const count = habits.filter((h) => done.has(h.id)).length;
  return (
    <section className="card card-pad" aria-label="Habits and supplements">
      <div className="card-head" style={{ marginBottom: habits.length ? 4 : 8 }}>
        <div className="card-title">Habits</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {habits.length ? (
            <span className={`badge ${count === habits.length ? "badge-good" : ""}`}>
              {count} of {habits.length}
            </span>
          ) : null}
          <button type="button" className="btn btn-ghost btn-sm" onClick={onManage}>
            {habits.length ? "Edit" : "Set up"}
          </button>
        </div>
      </div>
      {habits.length ? (
        habits.map((h) => {
          const on = done.has(h.id);
          const streak = streaks.get(h.id) ?? 0;
          return (
            <button
              key={h.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              className="goal-line habit-line"
              onClick={() => onToggle(h)}
            >
              <span className={`goal-mark ${on ? "ok" : ""}`}>
                {on ? <Icon name="check" size={14} strokeWidth={2.6} /> : null}
              </span>
              <span className="row-main goal-label">{h.name}</span>
              {streak >= 2 ? (
                <span className="habit-streak num" title={`${streak} days in a row`}>
                  <Icon name="flame" size={12} strokeWidth={2.2} />
                  {streak}
                </span>
              ) : null}
            </button>
          );
        })
      ) : (
        <p className="quick-empty" style={{ marginTop: 0 }}>
          Tick off supplements and daily habits, like creatine, a multivitamin or the gym, and keep a streak for each.
        </p>
      )}
    </section>
  );
}
