"use client";

import Link from "next/link";
import { Suspense } from "react";
import PageHeader from "@/components/PageHeader";
import WeeklyChart from "@/components/history/WeeklyChart";
import WeightSection from "@/components/history/WeightSection";
import { weeklyStats } from "@/lib/trends";
import { addDays, dayLabel, shortDate, toKey } from "@/lib/dates";
import { fmt, round1 } from "@/lib/format";
import { entriesFor, entryTotals, useStore, waterFor } from "@/lib/store";
import { useToday } from "@/lib/useToday";

const DAYS = 14;

export default function HistoryPage() {
  const s = useStore();
  const today = useToday();

  if (!s.ready || !today) {
    return (
      <div className="narrow">
        <PageHeader eyebrow={" "} title="History" />
        <div className="skeleton" style={{ height: 420 }} />
      </div>
    );
  }

  const todayKey = toKey(today);
  const rows = Array.from({ length: DAYS }, (_, i) => {
    const key = addDays(todayKey, -(i + 1));
    const entries = entriesFor(s, key);
    return { key, count: entries.length, t: entryTotals(entries), water: waterFor(s, key).total };
  });

  // Averages use only days in the last week that have something logged.
  const week = rows.slice(0, 7).filter((r) => r.count > 0);
  const avg = (pick: (r: (typeof rows)[number]) => number) =>
    week.length ? week.reduce((sum, r) => sum + pick(r), 0) / week.length : null;
  const avgKcal = avg((r) => r.t.kcal);
  const avgProtein = avg((r) => r.t.protein);
  const onTarget = week.filter((r) => Math.abs(r.t.kcal - s.goals.kcal) <= s.goals.kcal * 0.1).length;
  const weeks = weeklyStats(s, todayKey, 8);

  return (
    <div className="narrow">
      <PageHeader eyebrow="Your progress" title="History" />

      <div className="tiles">
        <div className="card tile">
          <div className="tile-label">7-day avg kcal</div>
          <div className="tile-value num">{avgKcal === null ? "–" : fmt(avgKcal)}</div>
        </div>
        <div className="card tile">
          <div className="tile-label">7-day avg protein</div>
          <div className="tile-value num">
            {avgProtein === null ? "–" : fmt(avgProtein)}
            {avgProtein === null ? null : <small>g</small>}
          </div>
        </div>
        <div className="card tile">
          <div className="tile-label">On target</div>
          <div className="tile-value num">
            {week.length ? onTarget : "–"}
            {week.length ? <small>/ {week.length}</small> : null}
          </div>
        </div>
      </div>

      <h2 className="section-title">Body</h2>
      <Suspense>
        <WeightSection weights={s.weights} goals={s.goals} todayKey={todayKey} />
      </Suspense>

      <h2 className="section-title">Weekly trends</h2>
      <WeeklyChart
        title="Calories"
        weeks={weeks}
        pick={(w) => w.kcal}
        goal={s.goals.kcal}
        unit="kcal"
        step={500}
        color="#7ee2ae"
      />
      <WeeklyChart
        title="Protein"
        weeks={weeks}
        pick={(w) => w.protein}
        goal={s.goals.protein}
        unit="g"
        step={25}
        color="#7fd8ae"
      />

      <h2 className="section-title">Day by day</h2>
      <section className="card">
        {rows.map(({ key, count, t, water }) => {
          const over = t.kcal > s.goals.kcal;
          return (
            <Link key={key} href={`/?date=${key}`} className="history-row">
              <div className="history-date">
                <div className="d1">{dayLabel(key, todayKey)}</div>
                <div className="d2">{shortDate(key).replace(/^\w+, /, "")}</div>
              </div>
              <div className="history-bar">
                <div className="history-meta num">
                  {count ? (
                    <span>
                      <b>{fmt(t.kcal)}</b> kcal · {fmt(t.protein)}g P
                    </span>
                  ) : (
                    <span>Nothing logged</span>
                  )}
                  <span style={{ whiteSpace: "nowrap" }}>{water ? `${round1(water / 1000)} L` : ""}</span>
                </div>
                <div className="bar">
                  <i
                    style={{
                      width: `${s.goals.kcal > 0 ? Math.min(100, (t.kcal / s.goals.kcal) * 100) : 0}%`,
                      background: over ? "var(--fat)" : "var(--accent)",
                    }}
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
