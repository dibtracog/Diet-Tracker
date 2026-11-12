/**
 * Reminder sender. The database calls this every 5 minutes (see
 * supabase/reminders.sql); it sends any meal or water reminders that are due.
 * Rule-based only: fixed times chosen in Settings, no AI.
 */

import { timingSafeEqual } from "node:crypto";
import { isDue, localNow, mealMessage, waterMessage, type PushMessage } from "@/lib/remind";
import { adminClient, isPushSub, missingConfig, sendPush, type PushSub } from "@/lib/pushServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = { user_id: string; id: string; kind: string; data: unknown };
type Part = { on?: boolean; times?: unknown };
type Profile = { goals?: { waterMl?: number }; reminders?: { meals?: Part; water?: Part } };

const times = (p: Part | undefined): string[] =>
  p?.on && Array.isArray(p.times) ? p.times.filter((t): t is string => typeof t === "string") : [];

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const wanted = Buffer.from(`Bearer ${secret}`);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

async function run(req: Request): Promise<Response> {
  if (!process.env.CRON_SECRET) return Response.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  if (!authorized(req)) return Response.json({ error: "Not allowed" }, { status: 401 });
  const missing = missingConfig();
  if (missing.length) return Response.json({ error: `Missing settings: ${missing.join(", ")}` }, { status: 503 });

  const db = adminClient();
  const { data, error } = await db.from("records").select("user_id, id, kind, data").in("kind", ["push", "profile"]);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const rows = (data ?? []) as Row[];

  const profiles = new Map<string, Profile>();
  for (const r of rows) if (r.kind === "profile") profiles.set(r.user_id, (r.data ?? {}) as Profile);

  // What a user's day looks like, looked up once per user and date.
  const dayCache = new Map<string, Promise<{ pending: number; waterMl: number }>>();
  const dayFor = (userId: string, date: string) => {
    const key = `${userId}|${date}`;
    let p = dayCache.get(key);
    if (!p) {
      p = (async () => {
        const [pending, water] = await Promise.all([
          db.from("records").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("kind", "pending"),
          db.from("records").select("data").eq("user_id", userId).eq("kind", "water").eq("data->>date", date),
        ]);
        const waterMl = ((water.data ?? []) as { data: { ml?: number } }[]).reduce((s, w) => s + (Number(w.data?.ml) || 0), 0);
        return { pending: pending.count ?? 0, waterMl };
      })();
      dayCache.set(key, p);
    }
    return p;
  };

  const now = new Date();
  let sent = 0;
  let failed = 0;
  const gone: Row[] = [];

  await Promise.all(
    rows
      .filter((r) => r.kind === "push" && isPushSub(r.data))
      .map(async (r) => {
        const sub = r.data as PushSub;
        const profile = profiles.get(r.user_id);
        if (!profile?.reminders) return;
        const local = localNow(sub.tz || "UTC", now);
        const mealDue = isDue(times(profile.reminders.meals), local.minutes);
        const waterDue = isDue(times(profile.reminders.water), local.minutes);
        if (!mealDue && !waterDue) return;

        const day = await dayFor(r.user_id, local.date);
        const goal = Number(profile.goals?.waterMl) || 0;
        const messages: PushMessage[] = [];
        if (mealDue) messages.push(mealMessage(day.pending));
        // No nagging once the day's water goal is reached.
        if (waterDue && !(goal > 0 && day.waterMl >= goal)) messages.push(waterMessage(day.waterMl, goal || 3000));

        for (const m of messages) {
          const result = await sendPush(sub, m);
          if (result === "sent") sent++;
          else if (result === "failed") failed++;
          else {
            gone.push(r);
            break;
          }
        }
      }),
  );

  // Phones that uninstalled the app or turned notifications off.
  for (const r of gone) await db.from("records").delete().eq("user_id", r.user_id).eq("id", r.id);

  return Response.json({ ok: true, sent, failed, removed: gone.length });
}

export const POST = run;
export const GET = run;
