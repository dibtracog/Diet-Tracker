"use client";

import { useEffect, useRef, useState } from "react";
import { addDays, fromKey } from "@/lib/dates";
import { daysBetween, type WeightPoint } from "@/lib/weight";

const H = 190;
const PAD = { top: 14, right: 10, bottom: 26, left: 40 };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const label = (key: string) => {
  const d = fromKey(key);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

function niceStep(range: number) {
  if (range <= 2.5) return 0.5;
  if (range <= 6) return 1;
  if (range <= 14) return 2;
  return 5;
}

const TREND = "#7ee2ae";

export default function WeightChart({
  points,
  start,
  end,
  goal,
}: {
  points: WeightPoint[];
  /** First day shown */
  start: string;
  /** Last day shown (today) */
  end: string;
  goal?: number;
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

  const values = points.flatMap((p) => [p.kg, p.trend]);
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  // Show the goal line only when it's close enough not to squash the data.
  const showGoal = goal !== undefined && goal > 0 && goal >= lo - 4 && goal <= hi + 4;
  if (showGoal) {
    lo = Math.min(lo, goal!);
    hi = Math.max(hi, goal!);
  }
  const step = niceStep(hi - lo + 1);
  const yMin = Math.floor((lo - 0.3) / step) * step;
  const yMax = Math.ceil((hi + 0.3) / step) * step;
  const ticks: number[] = [];
  for (let t = yMin; t <= yMax + 1e-9; t += step) ticks.push(Math.round(t * 10) / 10);
  // Keep at most ~5 gridlines.
  const every = Math.ceil(ticks.length / 5);
  const span = Math.max(1, daysBetween(start, end));
  const plotW = width - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (date: string) => PAD.left + (daysBetween(start, date) / span) * plotW;
  const y = (kg: number) => PAD.top + plotH - ((kg - yMin) / (yMax - yMin)) * plotH;
  // The goal gets its own label in the axis gutter; drop gridline labels that would collide.
  const shownTicks = ticks.filter((t, i) => i % every === 0 && (!showGoal || Math.abs(y(t) - y(goal!)) > 13));

  const trendPath = points.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.trend).toFixed(1)}`).join("");
  const xLabels = [start, addDays(start, Math.round(span / 2)), end];

  const pick = (clientX: number) => {
    const rect = wrap.current?.getBoundingClientRect();
    if (!rect || !points.length) return;
    const px = clientX - rect.left;
    let best = 0;
    let bestD = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(x(p.date) - px);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setActive(best);
  };

  const a = active !== null ? points[active] : null;
  const ax = a ? x(a.date) : 0;

  return (
    <div
      className="chart-wrap"
      ref={wrap}
      onPointerMove={(e) => pick(e.clientX)}
      onPointerDown={(e) => pick(e.clientX)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
      style={{ touchAction: "pan-y" }}
    >
      <svg width={width} height={H} role="img" aria-label="Weight trend chart">
        {shownTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} className="chart-grid" />
            <text x={PAD.left - 8} y={y(t)} className="chart-axis" textAnchor="end" dominantBaseline="middle">
              {Number.isInteger(t) ? t : t.toFixed(1)}
            </text>
          </g>
        ))}
        {xLabels.map((d, i) => (
          <text
            key={d + i}
            x={x(d)}
            y={H - 8}
            className="chart-axis"
            textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"}
          >
            {i === 2 ? "Today" : label(d)}
          </text>
        ))}

        {showGoal ? (
          <g pointerEvents="none">
            <line x1={PAD.left} x2={width - PAD.right} y1={y(goal!)} y2={y(goal!)} className="chart-goal" />
            <text x={PAD.left - 8} y={y(goal!)} className="chart-goal-label" textAnchor="end" dominantBaseline="middle">
              {goal}
            </text>
          </g>
        ) : null}

        {/* Weigh-ins: recessive dots, each with a 2px surface ring. */}
        {points.map((p) => (
          <circle key={p.date} cx={x(p.date)} cy={y(p.kg)} r={3.5} className="weight-dot" />
        ))}
        {/* Trend: the line that matters. */}
        <path d={trendPath} fill="none" stroke={TREND} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {a ? (
          <g pointerEvents="none">
            <line x1={ax} x2={ax} y1={PAD.top} y2={PAD.top + plotH} className="chart-crosshair" />
            <circle cx={ax} cy={y(a.trend)} r={5} fill={TREND} stroke="var(--surface)" strokeWidth={2} />
          </g>
        ) : null}
      </svg>

      {a ? (
        <div className="chart-tip" style={{ left: Math.min(Math.max(ax, 84), width - 84) }} role="status">
          <div className="chart-tip-title">{label(a.date)}</div>
          <div className="chart-tip-value num">
            <i className="dot" style={{ background: TREND }} />
            Trend {a.trend.toFixed(1)} kg
          </div>
          <div className="chart-tip-sub num">Scale {a.kg.toFixed(1)} kg</div>
        </div>
      ) : null}
    </div>
  );
}
