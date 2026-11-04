/** Dates are stored as local "YYYY-MM-DD" keys so a day always means the phone's own day. */

const pad = (n: number) => String(n).padStart(2, "0");

export function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isValidKey(key: string | null | undefined): key is string {
  return !!key && /^\d{4}-\d{2}-\d{2}$/.test(key) && !Number.isNaN(fromKey(key).getTime());
}

export function addDays(key: string, n: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function nowTime(): string {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "Today", "Yesterday", or the weekday name. */
export function dayLabel(key: string, todayKey: string): string {
  if (key === todayKey) return "Today";
  if (key === addDays(todayKey, -1)) return "Yesterday";
  return fromKey(key).toLocaleDateString("en-IN", { weekday: "long" });
}

/** "Wednesday, 4 November" */
export function longDate(key: string): string {
  return fromKey(key).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
}

/** "Wed, 4 Nov" */
export function shortDate(key: string): string {
  return fromKey(key).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

/** Resolves a ?date= value: valid past/today keys pass through, anything else means today. */
export function resolveDate(param: string | null, todayKey: string): string {
  return isValidKey(param) && param <= todayKey ? param : todayKey;
}
