import { addDays } from "./dates";
import { minutesOf } from "./quick";
import { entriesFor, type Data, type Entry } from "./store";

/** First to last meal of a day. Minutes is 0 with a single meal. */
export type EatingWindow = { first: string; last: string; minutes: number; meals: number };

export function eatingWindow(entries: Entry[]): EatingWindow | null {
  if (!entries.length) return null;
  const times = entries.map((e) => e.time).sort();
  const first = times[0];
  const last = times[times.length - 1];
  return { first, last, minutes: minutesOf(last) - minutesOf(first), meals: entries.length };
}

/** Average window over the last `days` days before today that had at least two entries. */
export function averageWindow(d: Data, todayKey: string, days = 7): number | null {
  const mins: number[] = [];
  for (let i = 1; i <= days; i++) {
    const w = eatingWindow(entriesFor(d, addDays(todayKey, -i)));
    if (w && w.meals >= 2) mins.push(w.minutes);
  }
  return mins.length ? mins.reduce((s, m) => s + m, 0) / mins.length : null;
}

/** "HH:MM" a number of minutes after another "HH:MM" (wrapping past midnight). */
export function addMinutes(hhmm: string, min: number): string {
  const t = (((minutesOf(hhmm) + Math.round(min)) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}
