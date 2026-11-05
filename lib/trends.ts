import { addDays, fromKey } from "./dates";
import { entriesFor, entryTotals, waterFor, type Data } from "./store";

export type WeekStat = {
  /** Monday, "YYYY-MM-DD" */
  start: string;
  /** Sunday */
  end: string;
  isCurrent: boolean;
  /** Days in the week (before today) that have food logged. */
  days: number;
  /** Averages over those logged days; null when nothing was logged. */
  kcal: number | null;
  protein: number | null;
  water: number | null;
  /** Logged days within ±10% of the calorie goal. */
  onTarget: number;
};

export const mondayOf = (key: string) => addDays(key, -((fromKey(key).getDay() + 6) % 7));

/**
 * Weekly averages for the last `weeks` weeks (Monday–Sunday), oldest first.
 * Today is left out because it's usually only partly logged and would drag
 * the current week's average down.
 */
export function weeklyStats(d: Data, todayKey: string, weeks = 8): WeekStat[] {
  const thisMonday = mondayOf(todayKey);
  return Array.from({ length: weeks }, (_, i) => {
    const start = addDays(thisMonday, -7 * (weeks - 1 - i));
    let days = 0;
    let kcal = 0;
    let protein = 0;
    let water = 0;
    let onTarget = 0;
    for (let k = 0; k < 7; k++) {
      const key = addDays(start, k);
      if (key >= todayKey) break;
      const entries = entriesFor(d, key);
      if (!entries.length) continue;
      const t = entryTotals(entries);
      days++;
      kcal += t.kcal;
      protein += t.protein;
      water += waterFor(d, key).total;
      if (d.goals.kcal > 0 && Math.abs(t.kcal - d.goals.kcal) <= d.goals.kcal * 0.1) onTarget++;
    }
    return {
      start,
      end: addDays(start, 6),
      isCurrent: start === thisMonday,
      days,
      kcal: days ? kcal / days : null,
      protein: days ? protein / days : null,
      water: days ? water / days : null,
      onTarget,
    };
  });
}
