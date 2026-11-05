import { addDays } from "./dates";
import { daysBetween } from "./weight";
import type { Combo, Data, Food } from "./store";

/**
 * Quick add ranking: what you usually have around this time of day.
 *
 * Every entry from the last 60 days votes for its food (or combo). A vote counts
 * more the closer its time is to now (a bell curve about 75 minutes wide) and
 * the more recent it is (halving every 3 weeks). Favourites and combos get a
 * standing bonus so they stay on the list, and anything already logged on the
 * day being viewed sinks down.
 */

export type QuickItem =
  | { kind: "food"; id: string; food: Food; usual?: string }
  | { kind: "combo"; id: string; combo: Combo; usual?: string };

const LOOKBACK_DAYS = 60;
const WIDTH_MIN = 75;
const HALF_LIFE_DAYS = 21;
const PINNED_BONUS = 0.6;
/** Score from votes needed to call something "usual" at this time (about two recent, close-in-time logs). */
const USUAL_SCORE = 1.2;
/** A food you haven't starred needs at least this much to appear. */
const MIN_UNPINNED = 0.5;

export const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Signed difference a − b on a 24h clock, in (−720, 720]. */
const clockDiff = (a: number, b: number) => {
  let d = (a - b) % 1440;
  if (d > 720) d -= 1440;
  if (d <= -720) d += 1440;
  return d;
};

const hhmm = (min: number) => {
  const m = ((Math.round(min / 15) * 15) % 1440 + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

type Tally = { score: number; shift: number };

export function quickItems(d: Data, date: string, todayKey: string, nowMin: number, limit = 6): QuickItem[] {
  const since = addDays(todayKey, -LOOKBACK_DAYS);
  const tallies = new Map<string, Tally>();
  const seenCombo = new Set<string>();
  const loggedOnDay = new Set<string>();

  for (const e of d.entries) {
    const key = e.comboId ? `c:${e.comboId}` : e.foodId ? `f:${e.foodId}` : null;
    if (!key) continue;
    if (e.date === date) loggedOnDay.add(key);
    if (e.date < since || e.date > todayKey) continue;
    if (e.comboId) {
      // A combo logs several entries at once; count it once.
      const once = `${e.comboId}|${e.date}|${e.time}`;
      if (seenCombo.has(once)) continue;
      seenCombo.add(once);
    }
    const delta = clockDiff(minutesOf(e.time), nowMin);
    const w = Math.exp(-((delta / WIDTH_MIN) ** 2)) * Math.pow(0.5, daysBetween(e.date, todayKey) / HALF_LIFE_DAYS);
    const t = tallies.get(key) ?? { score: 0, shift: 0 };
    t.score += w;
    t.shift += w * delta;
    tallies.set(key, t);
  }

  const hasPinned = d.foods.some((f) => f.favourite) || d.combos.length > 0;
  type Ranked = QuickItem & { rank: number; uses: number };
  const ranked: Ranked[] = [];

  const consider = (key: string, pinned: boolean, uses: number, make: (usual?: string) => QuickItem) => {
    const t = tallies.get(key);
    const timeScore = t?.score ?? 0;
    const already = loggedOnDay.has(key);
    if (!pinned && hasPinned && timeScore < MIN_UNPINNED) return;
    if (!pinned && !hasPinned && uses === 0) return;
    const usual = t && !already && timeScore >= USUAL_SCORE ? hhmm(nowMin + t.shift / t.score) : undefined;
    const rank = (timeScore + (pinned ? PINNED_BONUS : 0) + Math.min(uses, 50) * 0.004) * (already ? 0.25 : 1);
    ranked.push({ ...make(usual), rank, uses });
  };

  for (const f of d.foods) {
    consider(`f:${f.id}`, f.favourite, f.uses, (usual) => ({ kind: "food", id: f.id, food: f, usual }));
  }
  for (const c of d.combos) {
    consider(`c:${c.id}`, true, c.uses, (usual) => ({ kind: "combo", id: c.id, combo: c, usual }));
  }

  return ranked
    .sort((a, b) => b.rank - a.rank || b.uses - a.uses)
    .slice(0, limit)
    .map(({ rank: _rank, uses: _uses, ...item }) => item as QuickItem);
}
