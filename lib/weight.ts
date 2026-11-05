import { addDays, fromKey } from "./dates";
import type { WeightLog } from "./store";

export type WeightPoint = { date: string; kg: number; trend: number };

export const daysBetween = (a: string, b: string) => Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86_400_000);

/**
 * Smoothed weight trend: an exponentially weighted average where each day moves
 * the trend 20% of the way towards the scale reading. Day-to-day swings from
 * water, salt and food in the stomach mostly cancel out, leaving the real
 * direction. Gaps between weigh-ins are handled by compounding per day.
 */
export function trendSeries(weights: WeightLog[]): WeightPoint[] {
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const out: WeightPoint[] = [];
  let trend = 0;
  let prev: string | null = null;
  for (const w of sorted) {
    if (prev === null) trend = w.kg;
    else trend += (1 - Math.pow(0.8, Math.max(1, daysBetween(prev, w.date)))) * (w.kg - trend);
    out.push({ date: w.date, kg: w.kg, trend });
    prev = w.date;
  }
  return out;
}

/** Trend value as of a day (from the last weigh-in on or before it). */
export function trendOn(points: WeightPoint[], date: string): number | null {
  let found: number | null = null;
  for (const p of points) {
    if (p.date > date) break;
    found = p.trend;
  }
  return found;
}

/** Change in trend over the last `days` days, or null if there isn't enough history. */
export function trendChange(points: WeightPoint[], days: number): number | null {
  if (points.length < 2) return null;
  const last = points[points.length - 1];
  const before = trendOn(points, addDays(last.date, -days));
  return before === null ? null : last.trend - before;
}

/** "+0.4 kg" / "−1.2 kg" (with a real minus sign). */
export function signedKg(n: number): string {
  const v = Math.round(n * 10) / 10;
  if (v === 0) return "0.0 kg";
  return `${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(1)} kg`;
}
