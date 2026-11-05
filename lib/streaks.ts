import { addDays } from "./dates";
import { entriesFor, entryTotals, waterFor, type Data } from "./store";

/** Days that have at least one food entry. */
export function loggedDays(d: Data): Set<string> {
  return new Set(d.entries.map((e) => e.date));
}

/**
 * Consecutive logged days ending today, or ending yesterday if today has
 * nothing yet (so the streak doesn't look broken first thing in the morning).
 */
export function currentStreak(days: Set<string>, todayKey: string): number {
  let day = days.has(todayKey) ? todayKey : addDays(todayKey, -1);
  let n = 0;
  while (days.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

export function bestStreak(days: Set<string>): number {
  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of sorted) {
    run = prev !== null && addDays(prev, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return best;
}

/** How many of the last `n` days (not counting today) have something logged. */
export function loggedInLast(days: Set<string>, todayKey: string, n: number): number {
  let count = 0;
  for (let i = 1; i <= n; i++) if (days.has(addDays(todayKey, -i))) count++;
  return count;
}

export type GoalCheck = { value: number; goal: number; ok: boolean };

export type DayGoals = {
  items: number;
  kcal: GoalCheck;
  protein: GoalCheck;
  water: GoalCheck;
  met: number;
};

/**
 * Calories count as on target within ±10% of the goal; protein from 95% of the
 * goal (so 139 of 140 g isn't a "miss"); water once the goal is reached.
 */
export function dayGoals(d: Data, date: string): DayGoals {
  const entries = entriesFor(d, date);
  const t = entryTotals(entries);
  const water = waterFor(d, date).total;
  const g = d.goals;
  const kcal = { value: t.kcal, goal: g.kcal, ok: g.kcal > 0 && entries.length > 0 && Math.abs(t.kcal - g.kcal) <= g.kcal * 0.1 };
  const protein = { value: t.protein, goal: g.protein, ok: g.protein > 0 && t.protein >= g.protein * 0.95 };
  const waterCheck = { value: water, goal: g.waterMl, ok: g.waterMl > 0 && water >= g.waterMl };
  return {
    items: entries.length,
    kcal,
    protein,
    water: waterCheck,
    met: [kcal, protein, waterCheck].filter((c) => c.ok).length,
  };
}
