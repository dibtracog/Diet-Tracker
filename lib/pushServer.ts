/**
 * Server-only helpers for sending push notifications. Never import this from
 * a screen: it reads secrets that must stay on the server.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { sendNotification, setVapidDetails } from "web-push";
import type { PushMessage } from "./remind";

export type PushSub = { endpoint: string; keys: { p256dh: string; auth: string }; tz?: string };

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

/** Names of the settings that are still missing, for a helpful error. */
export function missingConfig(): string[] {
  return [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !secretKey && "SUPABASE_SECRET_KEY",
    !vapidPublic && "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
    !vapidPrivate && "VAPID_PRIVATE_KEY",
  ].filter((x): x is string => !!x);
}

/** Database access that skips the per-user rules; only for use on the server. */
export function adminClient(): SupabaseClient {
  return createClient(url!, secretKey!, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function isPushSub(v: unknown): v is PushSub {
  const s = v as PushSub | null;
  return (
    !!s &&
    typeof s === "object" &&
    typeof s.endpoint === "string" &&
    /^https:\/\//.test(s.endpoint) &&
    !!s.keys &&
    typeof s.keys.p256dh === "string" &&
    typeof s.keys.auth === "string"
  );
}

let vapidSet = false;

/** Sends one notification. "gone" means the phone no longer accepts it and the subscription should be deleted. */
export async function sendPush(sub: PushSub, message: PushMessage): Promise<"sent" | "gone" | "failed"> {
  if (!vapidSet) {
    setVapidDetails("mailto:reminders@diet-tracker.invalid", vapidPublic!, vapidPrivate!);
    vapidSet = true;
  }
  try {
    await sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify(message), {
      TTL: 60 * 60, // not worth delivering more than an hour late
      urgency: "normal",
    });
    return "sent";
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return "gone";
    console.warn("Push failed", status, (err as Error).message);
    return "failed";
  }
}
