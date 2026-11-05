"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icons";
import { fromKey, toKey } from "@/lib/dates";
import { fmt } from "@/lib/format";
import type { Data } from "@/lib/store";
import { haptic, slideIn, useSwipe } from "@/lib/useSwipe";

type Status = "on" | "over" | "under" | "none";

const STATUS_LABEL: Record<Status, string> = {
  on: "On target",
  over: "Over",
  under: "Under",
  none: "Nothing logged",
};

const DOW = ["M", "T", "W", "T", "F", "S", "S"];

/** First day of the month containing `key`, as "YYYY-MM-01". */
const monthOf = (key: string) => `${key.slice(0, 7)}-01`;
const shiftMonth = (start: string, by: number) => {
  const d = fromKey(start);
  return toKey(new Date(d.getFullYear(), d.getMonth() + by, 1));
};

/**
 * A month at a glance: each day coloured by calories against the goal (within
 * ±10% is on target), with marks for weigh-ins and days every habit was done.
 */
export default function MonthCalendar({ data, todayKey }: { data: Data; todayKey: string }) {
  const [month, setMonth] = useState(() => monthOf(todayKey));
  const gridRef = useRef<HTMLDivElement>(null);
  const thisMonth = monthOf(todayKey);

  const { kcal, weighed, habitsDone } = useMemo(() => {
    const kcal = new Map<string, number>();
    for (const e of data.entries) kcal.set(e.date, (kcal.get(e.date) ?? 0) + e.kcal * e.servings);
    const weighed = new Set(data.weights.map((w) => w.date));
    const perDay = new Map<string, number>();
    const ids = new Set(data.habits.map((h) => h.id));
    for (const l of data.habitLogs) if (ids.has(l.habitId)) perDay.set(l.date, (perDay.get(l.date) ?? 0) + 1);
    const habitsDone = new Set([...perDay].filter(([, n]) => ids.size > 0 && n >= ids.size).map(([d]) => d));
    return { kcal, weighed, habitsDone };
  }, [data.entries, data.weights, data.habits, data.habitLogs]);

  const goal = data.goals.kcal;
  const statusOf = (key: string): Status => {
    const k = kcal.get(key);
    if (k === undefined) return "none";
    if (goal > 0 && Math.abs(k - goal) <= goal * 0.1) return "on";
    return k > goal ? "over" : "under";
  };

  const first = fromKey(month);
  const daysIn = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const days = Array.from({ length: daysIn }, (_, i) => toKey(new Date(first.getFullYear(), first.getMonth(), i + 1)));
  const past = days.filter((k) => k <= todayKey);
  const logged = past.filter((k) => kcal.has(k)).length;
  const onTarget = past.filter((k) => statusOf(k) === "on").length;
  const title = first.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const go = (by: number) => {
    const next = shiftMonth(month, by);
    if (next > thisMonth) return;
    setMonth(next);
    requestAnimationFrame(() => slideIn(gridRef.current, by > 0 ? "right" : "left"));
  };

  useSwipe(gridRef, (dir) => {
    if (dir === "left" && month >= thisMonth) return;
    haptic();
    go(dir === "left" ? 1 : -1);
  });

  return (
    <section className="card card-pad chart-card" aria-label="Month calendar">
      <div className="card-head" style={{ marginBottom: 10 }}>
        <div>
          <div className="card-title">{title}</div>
          <div className="card-sub num">
            {logged} day{logged === 1 ? "" : "s"} logged · {onTarget} on target
          </div>
        </div>
        <div className="cal-nav">
          <button type="button" className="icon-btn" onClick={() => go(-1)} aria-label="Previous month">
            <Icon name="chevronLeft" size={18} />
          </button>
          <button type="button" className="icon-btn" onClick={() => go(1)} disabled={month >= thisMonth} aria-label="Next month">
            <Icon name="chevronRight" size={18} />
          </button>
        </div>
      </div>

      <div ref={gridRef}>
        <div className="cal-grid cal-dow" aria-hidden="true">
          {DOW.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="cal-grid">
          {Array.from({ length: lead }, (_, i) => (
            <span key={`b${i}`} />
          ))}
          {days.map((k) => {
            const future = k > todayKey;
            const st = statusOf(k);
            const marks = (
              <span className="cal-marks">
                {weighed.has(k) ? <i className="m-weight" /> : null}
                {habitsDone.has(k) ? <i className="m-habit" /> : null}
              </span>
            );
            const label = `${fromKey(k).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}: ${STATUS_LABEL[st]}${
              kcal.has(k) ? `, ${fmt(kcal.get(k)!)} kcal` : ""
            }${weighed.has(k) ? ", weighed in" : ""}${habitsDone.has(k) ? ", all habits done" : ""}`;
            const cls = `cal-day is-${st} ${k === todayKey ? "is-today" : ""}`;
            return future ? (
              <span key={k} className={`${cls} is-future`} aria-hidden="true">
                <span className="cal-num num">{Number(k.slice(8))}</span>
              </span>
            ) : (
              <Link key={k} href={k === todayKey ? "/" : `/?date=${k}`} className={cls} aria-label={label} title={label}>
                <span className="cal-num num">{Number(k.slice(8))}</span>
                {marks}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="cal-legend">
        <span>
          <i className="sw is-on" /> On target
        </span>
        <span>
          <i className="sw is-under" /> Under
        </span>
        <span>
          <i className="sw is-over" /> Over
        </span>
        <span>
          <i className="m-weight" /> Weighed
        </span>
        {data.habits.length ? (
          <span>
            <i className="m-habit" /> All habits
          </span>
        ) : null}
      </div>
    </section>
  );
}
