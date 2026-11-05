"use client";

import { useEffect, useRef, useState } from "react";
import { fromKey } from "@/lib/dates";
import { fmt } from "@/lib/format";
import type { WeekStat } from "@/lib/trends";

const H = 176;
const PAD = { top: 18, right: 6, bottom: 26, left: 40 };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const short = (key: string) => {
  const d = fromKey(key);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

/** Rounds the axis top up to a tidy number (e.g. 2,500 kcal, 150 g). */
function niceMax(v: number, step: number) {
  return Math.max(step, Math.ceil(v / step) * step);
}

/** Bar path with 4px rounded top corners and a flat base on the baseline. */
function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

export default function WeeklyChart({
  title,
  weeks,
  pick,
  goal,
  unit,
  step,
  color,
}: {
  title: string;
  weeks: WeekStat[];
  pick: (w: WeekStat) => number | null;
  goal: number;
  unit: string;
  step: number;
  color: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(340);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const values = weeks.map(pick);
  // Top is a multiple of 2 steps so the middle gridline is a round number too.
  const top = niceMax(Math.max(goal * 1.1, ...values.map((v) => v ?? 0)), step * 2);
  const plotW = width - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const band = plotW / weeks.length;
  const barW = Math.min(34, band * 0.62);
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH;
  // The goal gets its own label in the axis gutter; drop gridline labels that would collide with it.
  const ticks = [0, top / 2, top].filter((t) => goal <= 0 || Math.abs(y(t) - y(goal)) > 13);
  // On narrow screens label every other week, counting back from this week.
  const labelEvery = band < 50 ? 2 : 1;

  // Direct-label only the most recent week that has data.
  const lastIdx = values.reduce<number>((acc, v, i) => (v !== null ? i : acc), -1);
  const shown = active ?? null;
  const tip = shown !== null ? weeks[shown] : null;
  const tipX = shown !== null ? PAD.left + band * shown + band / 2 : 0;

  return (
    <section className="card card-pad chart-card" aria-label={title}>
      <div className="card-head" style={{ marginBottom: 6 }}>
        <div>
          <div className="card-title">{title}</div>
          <div className="card-sub">Daily average per week · dashed line is your goal</div>
        </div>
      </div>

      <div className="chart-wrap" ref={wrap} onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}>
        <svg width={width} height={H} role="img" aria-label={`${title}, last ${weeks.length} weeks`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} className="chart-grid" />
              <text x={PAD.left - 8} y={y(t)} className="chart-axis" textAnchor="end" dominantBaseline="middle">
                {fmt(t)}
              </text>
            </g>
          ))}

          {weeks.map((w, i) => {
            const v = values[i];
            const x = PAD.left + band * i + (band - barW) / 2;
            const dim = shown !== null && shown !== i;
            return (
              <g key={w.start}>
                {v !== null && v > 0 ? (
                  <path
                    d={barPath(x, y(v), barW, Math.max(1, PAD.top + plotH - y(v)))}
                    fill={color}
                    opacity={dim ? 0.4 : w.isCurrent ? 0.75 : 1}
                    style={{ transition: "opacity .15s" }}
                  />
                ) : (
                  <line x1={x} x2={x + barW} y1={PAD.top + plotH} y2={PAD.top + plotH} className="chart-empty" />
                )}
                {i === lastIdx && shown === null && v !== null ? (
                  <text x={x + barW / 2} y={y(v) - 6} className="chart-value" textAnchor="middle">
                    {fmt(v)}
                  </text>
                ) : null}
                {(weeks.length - 1 - i) % labelEvery === 0 ? (
                  <text x={PAD.left + band * i + band / 2} y={H - 8} className="chart-axis" textAnchor="middle">
                    {w.isCurrent ? "This wk" : short(w.start)}
                  </text>
                ) : null}
                {/* Hit target: the whole column, much bigger than the bar. */}
                <rect
                  x={PAD.left + band * i}
                  y={PAD.top}
                  width={band}
                  height={plotH + PAD.bottom}
                  fill="transparent"
                  onPointerEnter={(e) => e.pointerType === "mouse" && setActive(i)}
                  onClick={() => setActive((a) => (a === i ? null : i))}
                  style={{ cursor: "pointer" }}
                />
              </g>
            );
          })}

          {goal > 0 ? (
            <g pointerEvents="none">
              <line x1={PAD.left} x2={width - PAD.right} y1={y(goal)} y2={y(goal)} className="chart-goal" />
              <text x={PAD.left - 8} y={y(goal)} className="chart-goal-label" textAnchor="end" dominantBaseline="middle">
                {fmt(goal)}
              </text>
            </g>
          ) : null}
        </svg>

        {tip ? (
          <div
            className="chart-tip"
            style={{ left: Math.min(Math.max(tipX, 84), width - 84) }}
            role="status"
          >
            <div className="chart-tip-title">
              {tip.isCurrent ? "This week" : `Week of ${short(tip.start)}`}
            </div>
            {values[shown!] !== null ? (
              <>
                <div className="chart-tip-value num">
                  <i className="dot" style={{ background: color }} />
                  {fmt(values[shown!]!)} {unit} / day
                </div>
                <div className="chart-tip-sub num">
                  {tip.days} day{tip.days === 1 ? "" : "s"} logged
                  {tip.isCurrent ? " · today not counted yet" : ""}
                </div>
              </>
            ) : (
              <div className="chart-tip-sub">{tip.isCurrent ? "Nothing logged before today" : "Nothing logged"}</div>
            )}
          </div>
        ) : null}
      </div>

      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th>Week starting</th>
            <th>Average {unit} per day</th>
            <th>Days logged</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((w, i) => (
            <tr key={w.start}>
              <td>{w.start}</td>
              <td>{values[i] === null ? "–" : fmt(values[i]!)}</td>
              <td>{w.days}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
