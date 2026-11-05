import { addDays } from "./dates";
import type { Data } from "./store";
import { daysBetween } from "./weight";

/**
 * Maintenance calories from your own data, no formulas about age or height.
 *
 * Over the last four weeks: average what you ate on the days you logged, and
 * fit a straight line through your weigh-ins to get how fast your weight is
 * changing. A kilogram of body weight is roughly 7,700 kcal, so
 *
 *   maintenance = average eaten − (kg per day × 7,700)
 *
 * e.g. eating 2,300 a day while losing 0.3 kg a week → 2,300 + 330 = 2,630.
 */

export const KCAL_PER_KG = 7700;
export const WINDOW_DAYS = 28;
export const NEED_DAYS = 10;
export const NEED_WEIGH_INS = 4;
export const NEED_SPAN = 10;
/** Days with less than this logged are probably incomplete and are left out. */
export const MIN_DAY_KCAL = 800;

export type Maintenance = {
  ready: boolean;
  /** Estimated calories burned per day (only meaningful when ready). */
  kcal: number;
  /** Average eaten on counted days. */
  intake: number;
  /** Weight change, kg per week (negative = losing). */
  kgPerWeek: number;
  days: number;
  weighIns: number;
  /** Days between the first and last weigh-in used. */
  span: number;
  confidence: "rough" | "good";
};

/** Least-squares slope of y over x. */
function slope(points: { x: number; y: number }[]): number {
  const n = points.length;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  return den ? num / den : 0;
}

export function estimateMaintenance(d: Data, todayKey: string): Maintenance {
  // Today is still in progress, so food counts up to yesterday. A weigh-in this
  // morning still reflects yesterday's eating, so weights count up to today.
  const end = addDays(todayKey, -1);
  const start = addDays(todayKey, -WINDOW_DAYS);

  const perDay = new Map<string, number>();
  for (const e of d.entries) {
    if (e.date < start || e.date > end) continue;
    perDay.set(e.date, (perDay.get(e.date) ?? 0) + e.kcal * e.servings);
  }
  const counted = [...perDay.values()].filter((k) => k >= MIN_DAY_KCAL);
  const days = counted.length;
  const intake = days ? counted.reduce((s, k) => s + k, 0) / days : 0;

  const weights = d.weights
    .filter((w) => w.date >= start && w.date <= todayKey)
    .sort((a, b) => a.date.localeCompare(b.date));
  const weighIns = weights.length;
  const span = weighIns >= 2 ? daysBetween(weights[0].date, weights[weighIns - 1].date) : 0;

  const ready = days >= NEED_DAYS && weighIns >= NEED_WEIGH_INS && span >= NEED_SPAN;
  const kgPerDay = weighIns >= 2 ? slope(weights.map((w) => ({ x: daysBetween(start, w.date), y: w.kg }))) : 0;
  const kcal = Math.round((intake - kgPerDay * KCAL_PER_KG) / 10) * 10;

  return {
    ready,
    kcal,
    intake,
    kgPerWeek: kgPerDay * 7,
    days,
    weighIns,
    span,
    confidence: days >= 20 && weighIns >= 8 && span >= 20 ? "good" : "rough",
  };
}

export const RATES = [
  { label: "Lose 0.5", kgPerWeek: -0.5 },
  { label: "Lose 0.25", kgPerWeek: -0.25 },
  { label: "Maintain", kgPerWeek: 0 },
  { label: "Gain 0.25", kgPerWeek: 0.25 },
] as const;

/** The lowest calorie goal this will suggest. */
export const FLOOR_KCAL = 1200;

/** Daily calories for a target rate of change, rounded to 50. */
export function goalFor(maintenance: number, kgPerWeek: number): { kcal: number; floored: boolean } {
  const raw = Math.round((maintenance + (kgPerWeek * KCAL_PER_KG) / 7) / 50) * 50;
  return raw < FLOOR_KCAL ? { kcal: FLOOR_KCAL, floored: true } : { kcal: raw, floored: false };
}
