import { addDays } from "./dates";
import { currentStreak, bestStreak } from "./streaks";
import type { Data, Habit } from "./store";

export const sortedHabits = (d: Data): Habit[] => [...d.habits].sort((a, b) => a.order - b.order);

/** Days each habit was done, by habit id. */
export function habitDays(d: Data): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const l of d.habitLogs) {
    let set = map.get(l.habitId);
    if (!set) map.set(l.habitId, (set = new Set()));
    set.add(l.date);
  }
  return map;
}

export type HabitStats = { streak: number; best: number; last30: number; days: boolean[] };

/** Streaks, last-30-day count and a day-by-day strip (oldest first, ending today). */
export function habitStats(days: Set<string> | undefined, todayKey: string, span = 30): HabitStats {
  const set = days ?? new Set<string>();
  const strip = Array.from({ length: span }, (_, i) => set.has(addDays(todayKey, i - span + 1)));
  return {
    streak: currentStreak(set, todayKey),
    best: bestStreak(set),
    last30: strip.filter(Boolean).length,
    days: strip,
  };
}

export const HABIT_IDEAS = ["Creatine", "Multivitamin", "Vitamin D", "Omega-3", "Gym", "10k steps", "Stretch", "No sugar"];
