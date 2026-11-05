import { Icon } from "@/components/Icons";
import { fmt, round1 } from "@/lib/format";
import type { DayGoals, GoalCheck } from "@/lib/streaks";

function Line({
  label,
  check,
  unit,
  status,
}: {
  label: string;
  check: GoalCheck;
  unit: string;
  status: string;
}) {
  return (
    <div className="goal-line">
      <span className={`goal-mark ${check.ok ? "ok" : ""}`} aria-label={check.ok ? "Met" : "Not met"}>
        {check.ok ? <Icon name="check" size={14} strokeWidth={2.6} /> : null}
      </span>
      <div className="row-main">
        <div className="goal-label">{label}</div>
        <div className="row-sub num">
          {unit === "L" ? `${round1(check.value / 1000)} of ${round1(check.goal / 1000)} L` : `${fmt(check.value)} of ${fmt(check.goal)} ${unit}`}
        </div>
      </div>
      <span className={`goal-status ${check.ok ? "ok" : ""}`}>{status}</span>
    </div>
  );
}

/** Goal checklist for a day: calories, protein, water. */
export default function DaySummary({ goals, title, isToday }: { goals: DayGoals; title: string; isToday: boolean }) {
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

  return (
    <section className="card card-pad" aria-label={title}>
      <div className="card-head" style={{ marginBottom: 6 }}>
        <div className="card-title">{title}</div>
        <span className={`badge ${goals.met === 3 ? "badge-good" : ""}`}>
          {goals.met} of 3 goals
        </span>
      </div>
      <Line label="Calories" check={kcal} unit="kcal" status={kcalStatus} />
      <Line label="Protein" check={protein} unit="g" status={proteinStatus} />
      <Line label="Water" check={water} unit="L" status={waterStatus} />
    </section>
  );
}
