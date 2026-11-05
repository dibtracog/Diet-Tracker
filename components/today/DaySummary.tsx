import { Icon } from "@/components/Icons";
import { duration, fmt, round1 } from "@/lib/format";
import type { DayGoals, GoalCheck } from "@/lib/streaks";
import { addMinutes, type EatingWindow } from "@/lib/window";
import { minutesOf } from "@/lib/quick";

function Line({
  label,
  check,
  sub,
  status,
}: {
  label: string;
  /** Null for an info line with no goal (no tick mark). */
  check: GoalCheck | null;
  sub: string;
  status: string;
}) {
  const ok = !!check?.ok;
  return (
    <div className="goal-line">
      {check ? (
        <span className={`goal-mark ${ok ? "ok" : ""}`} aria-label={ok ? "Met" : "Not met"}>
          {ok ? <Icon name="check" size={14} strokeWidth={2.6} /> : null}
        </span>
      ) : (
        <span className="goal-mark is-info" aria-hidden="true">
          <Icon name="sun" size={13} strokeWidth={2} />
        </span>
      )}
      <div className="row-main">
        <div className="goal-label">{label}</div>
        <div className="row-sub num">{sub}</div>
      </div>
      <span className={`goal-status ${ok ? "ok" : ""}`}>{status}</span>
    </div>
  );
}

/** Goal checklist for a day: calories, protein, water, plus the eating window. */
export default function DaySummary({
  goals,
  title,
  isToday,
  window,
  avgWindow,
  now,
}: {
  goals: DayGoals;
  title: string;
  isToday: boolean;
  window: EatingWindow | null;
  /** Average eating window over the past week, in minutes. */
  avgWindow: number | null;
  /** Current time "HH:MM" (for today's window). */
  now: string;
}) {
  const { kcal, protein, water } = goals;

  const kcalStatus = kcal.ok
    ? "On target"
    : kcal.value > kcal.goal
      ? `${fmt(kcal.value - kcal.goal)} over`
      : isToday
        ? `${fmt(kcal.goal - kcal.value)} to go`
        : `${fmt(kcal.goal - kcal.value)} under`;
  const proteinStatus = protein.ok ? "Goal hit" : `${fmt(protein.goal - protein.value)} g ${isToday ? "to go" : "short"}`;
  const waterStatus = water.ok ? "Goal hit" : `${round1((water.goal - water.value) / 1000)} L ${isToday ? "to go" : "short"}`;

  // Eating window: first to last meal; today, measured up to now while it's open.
  let windowLine: { sub: string; status: string } | null = null;
  if (window) {
    const span = window.meals > 1 ? `${window.first}–${window.last}` : `First meal ${window.first}`;
    const avg = avgWindow !== null ? ` · avg ${duration(avgWindow)}` : "";
    const target = goals.window;
    let status = duration(window.minutes);
    if (target) {
      const closes = addMinutes(window.first, target.goal);
      const elapsed = isToday ? Math.max(window.minutes, minutesOf(now) - minutesOf(window.first)) : window.minutes;
      if (window.minutes > target.goal) status = `${duration(window.minutes - target.goal)} over`;
      else if (isToday) status = elapsed < target.goal ? `Closes ${closes}` : `Closed ${closes}`;
      else status = "On target";
    }
    windowLine = { sub: `${span}${target ? ` · ${duration(target.goal)} max` : ""}${avg}`, status };
  }

  return (
    <section className="card card-pad" aria-label={title}>
      <div className="card-head" style={{ marginBottom: 6 }}>
        <div className="card-title">{title}</div>
        <span className={`badge ${goals.met === goals.total ? "badge-good" : ""}`}>
          {goals.met} of {goals.total} goals
        </span>
      </div>
      <Line label="Calories" check={kcal} sub={`${fmt(kcal.value)} of ${fmt(kcal.goal)} kcal`} status={kcalStatus} />
      <Line label="Protein" check={protein} sub={`${fmt(protein.value)} of ${fmt(protein.goal)} g`} status={proteinStatus} />
      <Line
        label="Water"
        check={water}
        sub={`${round1(water.value / 1000)} of ${round1(water.goal / 1000)} L`}
        status={waterStatus}
      />
      {windowLine ? <Line label="Eating window" check={goals.window} sub={windowLine.sub} status={windowLine.status} /> : null}
    </section>
  );
}
