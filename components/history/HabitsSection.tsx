import Link from "next/link";
import { Icon } from "@/components/Icons";
import { addDays, shortDate } from "@/lib/dates";
import { habitDays, habitStats, sortedHabits } from "@/lib/habits";
import type { Data } from "@/lib/store";

const SPAN = 30;

/** Per-habit streaks and a 30-day strip. */
export default function HabitsSection({ data, todayKey }: { data: Data; todayKey: string }) {
  const habits = sortedHabits(data);
  const byHabit = habitDays(data);

  if (!habits.length) {
    return (
      <section className="card card-pad chart-card">
        <p className="quick-empty" style={{ margin: 0 }}>
          No habits yet. Add supplements or daily habits from the Habits card on{" "}
          <Link href="/" className="link">
            Today
          </Link>
          .
        </p>
      </section>
    );
  }

  return (
    <section className="card card-pad chart-card" aria-label="Habits">
      <div className="card-head" style={{ marginBottom: 6 }}>
        <div>
          <div className="card-title">Habits</div>
          <div className="card-sub">Last {SPAN} days, oldest on the left</div>
        </div>
      </div>
      {habits.map((h) => {
        const st = habitStats(byHabit.get(h.id), todayKey, SPAN);
        return (
          <div key={h.id} className="habit-stat">
            <div className="habit-stat-top">
              <span className="row-title">{h.name}</span>
              <span className="habit-stat-nums num">
                {st.streak >= 1 ? (
                  <span className="habit-streak">
                    <Icon name="flame" size={12} strokeWidth={2.2} />
                    {st.streak}
                  </span>
                ) : null}
                <span>
                  {st.last30} / {SPAN}
                </span>
              </span>
            </div>
            <div className="habit-strip" role="img" aria-label={`${h.name}: done ${st.last30} of the last ${SPAN} days, best streak ${st.best}`}>
              {st.days.map((on, i) => {
                const key = addDays(todayKey, i - SPAN + 1);
                return (
                  <i
                    key={key}
                    className={`${on ? "on" : ""} ${key === todayKey ? "is-today" : ""}`}
                    title={`${shortDate(key)}${on ? ": done" : ""}`}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
