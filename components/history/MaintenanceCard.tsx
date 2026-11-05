"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import { estimateMaintenance, goalFor, NEED_DAYS, NEED_SPAN, NEED_WEIGH_INS, RATES, MIN_DAY_KCAL, FLOOR_KCAL, WINDOW_DAYS } from "@/lib/energy";
import { fmt } from "@/lib/format";
import { updateGoals, type Data, type Goals } from "@/lib/store";
import { trendSeries } from "@/lib/weight";

function defaultRate(goals: Goals, trend: number | undefined): number {
  if (!goals.weightKg || trend === undefined) return 0;
  if (trend > goals.weightKg + 0.5) return -0.5;
  if (trend < goals.weightKg - 0.5) return 0.25;
  return 0;
}

const perWeek = (kg: number) => {
  const v = Math.round(kg * 100) / 100;
  if (v === 0) return "0.00";
  return `${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(2)}`;
};

export default function MaintenanceCard({ data, todayKey }: { data: Data; todayKey: string }) {
  const toast = useToast();
  const m = estimateMaintenance(data, todayKey);
  const series = trendSeries(data.weights);
  const trend = series.length ? series[series.length - 1].trend : undefined;
  const [rate, setRate] = useState<number>(() => defaultRate(data.goals, trend));
  const goal = goalFor(m.kcal, rate);
  const current = data.goals.kcal;
  const diff = goal.kcal - current;

  const apply = () => {
    const before = data.goals;
    updateGoals({ ...before, kcal: goal.kcal });
    toast.show(`Calorie goal set to ${fmt(goal.kcal)}`, {
      action: { label: "Undo", onClick: () => updateGoals(before) },
    });
  };

  return (
    <section className="card card-pad chart-card" aria-label="Maintenance calories">
      <div className="card-head" style={{ marginBottom: 12 }}>
        <div>
          <div className="card-title">Maintenance calories</div>
          <div className="card-sub">What you burn, from what you eat and how your weight moves</div>
        </div>
        {m.ready ? (
          <span className={`badge ${m.confidence === "good" ? "badge-good" : ""}`}>
            {m.confidence === "good" ? "Good estimate" : "Rough estimate"}
          </span>
        ) : null}
      </div>

      {!m.ready ? (
        <>
          <p className="quick-empty" style={{ marginTop: 0 }}>
            Log food and weigh in for a couple of weeks and this works out how many calories you actually burn a day.
          </p>
          <div className="need-list">
            <Need label="Days with food logged" have={m.days} need={NEED_DAYS} />
            <Need label="Weigh-ins" have={m.weighIns} need={NEED_WEIGH_INS} />
            <Need label="Days between first and last weigh-in" have={m.span} need={NEED_SPAN} />
          </div>
          <p className="fineprint">Counts the last 4 weeks.</p>
        </>
      ) : (
        <>
          <div className="maint-hero num">
            {fmt(m.kcal)}
            <small>kcal a day</small>
          </div>
          <div className="weight-stats">
            <div className="weight-stat">
              <div className="l">Avg eaten</div>
              <div className="v num">
                {fmt(m.intake)}
                <small>kcal</small>
              </div>
            </div>
            <div className="weight-stat">
              <div className="l">Weight change</div>
              <div className="v num">
                {perWeek(m.kgPerWeek)}
                <small>kg/wk</small>
              </div>
            </div>
            <div className="weight-stat">
              <div className="l">Days logged</div>
              <div className="v num">
                {m.days}
                <small>/ {WINDOW_DAYS}</small>
              </div>
            </div>
          </div>

          <div className="maint-goal">
            <div className="field-label" style={{ marginBottom: 6 }}>
              Suggested goal (kg per week)
            </div>
            <div className="seg is-4" role="radiogroup" aria-label="Target rate">
              {RATES.map((r) => (
                <button
                  key={r.label}
                  type="button"
                  role="radio"
                  aria-checked={rate === r.kgPerWeek}
                  className={rate === r.kgPerWeek ? "is-active" : ""}
                  onClick={() => setRate(r.kgPerWeek)}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <div className="maint-suggest">
              <div>
                <div className="maint-suggest-value num">
                  {fmt(goal.kcal)} <small>kcal a day</small>
                </div>
                <div className="row-sub num">
                  {diff === 0
                    ? "Same as your goal now"
                    : `Your goal now is ${fmt(current)} (${diff > 0 ? "+" : "−"}${fmt(Math.abs(diff))})`}
                </div>
              </div>
              <button type="button" className="btn btn-primary btn-sm" onClick={apply} disabled={diff === 0}>
                Use this
              </button>
            </div>
            {goal.floored ? (
              <p className="fineprint">Kept at {fmt(FLOOR_KCAL)} kcal. Going lower isn&apos;t a good idea without a doctor.</p>
            ) : null}
          </div>
          <p className="fineprint">
            From the last 4 weeks: {m.days} logged days and {m.weighIns} weigh-ins. Assumes the days you logged are
            complete; days under {fmt(MIN_DAY_KCAL)} kcal are left out. It sharpens as you log more.
          </p>
        </>
      )}
      {toast.node}
    </section>
  );
}

function Need({ label, have, need }: { label: string; have: number; need: number }) {
  const done = have >= need;
  return (
    <div className="need-row">
      <div className="need-top">
        <span>{label}</span>
        <span className={`num ${done ? "need-done" : ""}`}>
          {Math.min(have, need)} / {need}
        </span>
      </div>
      <div className="bar">
        <i style={{ width: `${Math.min(100, (have / need) * 100)}%`, background: "var(--accent)" }} />
      </div>
    </div>
  );
}
