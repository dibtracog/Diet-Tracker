"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/Icons";
import Sheet from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import { addDays, dayLabel, shortDate } from "@/lib/dates";
import { logWeight, removeWeight, restoreWeight, type Goals, type WeightLog } from "@/lib/store";
import { signedKg, trendChange, trendSeries } from "@/lib/weight";
import WeightChart from "./WeightChart";
import WeightForm from "./WeightForm";

const RANGES = [
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "All", days: 0 },
] as const;

export default function WeightSection({
  weights,
  goals,
  todayKey,
}: {
  weights: WeightLog[];
  goals: Goals;
  todayKey: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [range, setRange] = useState<number>(30);
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const close = useCallback(() => setOpen(false), []);

  const openForm = useCallback(() => {
    setFormKey((k) => k + 1);
    setOpen(true);
  }, []);

  // The Add menu's "Log weight" links here with ?log=weight (also works when already on this page).
  const params = useSearchParams();
  const wantsLog = params.get("log") === "weight";
  useEffect(() => {
    if (!wantsLog) return;
    openForm();
    router.replace("/history", { scroll: false });
  }, [wantsLog, openForm, router]);

  const points = trendSeries(weights);
  const last = points[points.length - 1];
  const change7 = trendChange(points, 7);
  const toGoal = last && goals.weightKg ? last.trend - goals.weightKg : null;

  const start =
    range === 0 ? (points[0]?.date ?? addDays(todayKey, -30)) : addDays(todayKey, -(range - 1));
  const visible = points.filter((p) => p.date >= start);
  const recent = [...weights].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  const save = (date: string, kg: number) => {
    close();
    const { added, replaced } = logWeight(date, kg);
    toast.show(`${kg.toFixed(1)} kg saved`, {
      action: { label: "Undo", onClick: () => (replaced ? restoreWeight(replaced) : removeWeight(added.id)) },
    });
  };

  const drop = (w: WeightLog) => {
    removeWeight(w.id);
    toast.show(`${w.kg.toFixed(1)} kg removed`, { icon: "trash", action: { label: "Undo", onClick: () => restoreWeight(w) } });
  };

  return (
    <section className="card card-pad chart-card" aria-label="Weight" id="weight">
      <div className="card-head" style={{ marginBottom: 8 }}>
        <div>
          <div className="card-title">Weight</div>
          <div className="card-sub">Smoothed trend from your weigh-ins</div>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={openForm}>
          <Icon name="plus" size={16} strokeWidth={2.2} />
          Log weight
        </button>
      </div>

      {!last ? (
        <p className="quick-empty">
          Log your weight a few times a week. The trend line smooths out daily ups and downs from water and food, so
          you can see where you&apos;re really heading.
        </p>
      ) : (
        <>
          <div className="weight-stats">
            <div className="weight-stat">
              <div className="l">Trend</div>
              <div className="v num">
                {last.trend.toFixed(1)}
                <small>kg</small>
              </div>
            </div>
            <div className="weight-stat">
              <div className="l">Last 7 days</div>
              <div className="v num">{change7 === null ? "–" : signedKg(change7).replace(" kg", "")}
                {change7 === null ? null : <small>kg</small>}
              </div>
            </div>
            <div className="weight-stat">
              <div className="l">{goals.weightKg ? "To goal" : "Last weigh-in"}</div>
              <div className="v num">
                {goals.weightKg && toGoal !== null
                  ? Math.abs(toGoal) < 0.05
                    ? "Reached"
                    : Math.abs(toGoal).toFixed(1)
                  : last.kg.toFixed(1)}
                {goals.weightKg && toGoal !== null && Math.abs(toGoal) < 0.05 ? null : <small>kg</small>}
              </div>
            </div>
          </div>

          {points.length >= 2 ? (
            <>
              <div className="chips is-inline" role="tablist" aria-label="Time range">
                {RANGES.map((r) => (
                  <button
                    key={r.label}
                    role="tab"
                    aria-selected={range === r.days}
                    className={`chip ${range === r.days ? "is-active" : ""}`}
                    onClick={() => setRange(r.days)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <div className="chart-legend" style={{ marginBottom: 4 }}>
                <span>
                  <i className="legend-line" /> Trend
                </span>
                <span>
                  <i className="legend-dot" /> Weigh-ins
                </span>
                {goals.weightKg ? <span>- - Goal</span> : null}
              </div>
              {visible.length ? (
                <WeightChart points={visible} start={start} end={todayKey} goal={goals.weightKg} />
              ) : (
                <p className="quick-empty">No weigh-ins in this period.</p>
              )}
            </>
          ) : (
            <p className="quick-empty">Log one more weigh-in to see your trend line.</p>
          )}

          <div style={{ marginTop: 10 }}>
            {recent.map((w) => (
              <div key={w.id} className="row">
                <div className="row-main">
                  <div className="row-title">{w.kg.toFixed(1)} kg</div>
                  <div className="row-sub">
                    {["Today", "Yesterday"].includes(dayLabel(w.date, todayKey)) ? dayLabel(w.date, todayKey) : shortDate(w.date)}
                  </div>
                </div>
                <button type="button" className="icon-btn del" onClick={() => drop(w)} aria-label={`Remove ${w.kg} kg`}>
                  <Icon name="trash" size={18} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <Sheet open={open} onClose={close} title="Log weight">
        <WeightForm key={formKey} todayKey={todayKey} weights={weights} lastKg={last?.kg} onSave={save} />
      </Sheet>
      {toast.node}
    </section>
  );
}
