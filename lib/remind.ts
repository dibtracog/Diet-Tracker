/**
 * Working out which reminders are due. Plain functions with no browser or
 * server dependencies, used by the reminder sender (app/api/remind).
 *
 * The database calls the sender every 5 minutes. Time is cut into 5-minute
 * slots, and a reminder set for HH:MM goes out in the slot that contains it,
 * so each one is sent exactly once a day.
 */

export const SLOT_MINUTES = 5;

/** "HH:MM" -> minutes since midnight, or NaN. */
export function toMinutes(time: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!m) return NaN;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h < 24 && min < 60 ? h * 60 + min : NaN;
}

/** The date ("YYYY-MM-DD") and minutes since midnight right now in a time zone. */
export function localNow(timeZone: string, now = new Date()): { date: string; minutes: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
  } catch {
    // Unknown time zone name: fall back to UTC rather than sending nothing.
    return localNow("UTC", now);
  }
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: (Number(get("hour")) % 24) * 60 + Number(get("minute")),
  };
}

/** True if any of the times falls in the 5-minute slot that `minutes` is in. */
export function isDue(times: string[], minutes: number): boolean {
  const slot = Math.floor(minutes / SLOT_MINUTES) * SLOT_MINUTES;
  return times.some((t) => {
    const m = toMinutes(t);
    return m >= slot && m < slot + SLOT_MINUTES;
  });
}

export type PushMessage = { title: string; body: string; url: string; tag: string };

export function mealMessage(pendingMeals: number): PushMessage {
  return {
    title: "Time to log your meal",
    body:
      pendingMeals > 0
        ? `${pendingMeals} photo meal${pendingMeals === 1 ? "" : "s"} still need${pendingMeals === 1 ? "s" : ""} details. Tap to fill ${pendingMeals === 1 ? "it" : "them"} in.`
        : "Tap to add what you ate.",
    url: "/",
    tag: "meal",
  };
}

export function waterMessage(totalMl: number, goalMl: number): PushMessage {
  const n = (ml: number) => Math.round(ml).toLocaleString("en-IN");
  return {
    title: "Time for some water",
    body: totalMl > 0 ? `${n(totalMl)} of ${n(goalMl)} ml so far today.` : `Nothing logged yet today. Goal: ${n(goalMl)} ml.`,
    url: "/",
    tag: "water",
  };
}
