"use client";

/**
 * Push notifications on this device.
 *
 * Reminder times live in the synced settings (lib/store.ts). Each device that
 * wants notifications registers a "push subscription", saved to your account
 * so the reminder sender (app/api/remind) knows where to deliver.
 */

import { currentUserId } from "./store";
import { cloudEnabled, getSupabase } from "./supabase";

// Next.js only inlines NEXT_PUBLIC_* values when they're read directly like this.
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export type PushState =
  /** Reminders need cloud sync and the push keys (SETUP.md, step 5). */
  | "unconfigured"
  /** This browser can't do push, or the app isn't on https / installed properly. */
  | "unsupported"
  /** Notifications were blocked for this site in the browser's settings. */
  | "blocked"
  | "off"
  | "on";

const supported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** Resolves to the service worker registration, or null if there is none after a short wait. */
async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!supported()) return null;
  const existing = await navigator.serviceWorker.getRegistration();
  if (!existing) return null;
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 4000)),
  ]);
}

export async function pushState(): Promise<PushState> {
  if (!cloudEnabled || !VAPID_PUBLIC_KEY) return "unconfigured";
  if (!supported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  try {
    const reg = await registration();
    if (!reg) return "unsupported";
    const sub = await reg.pushManager.getSubscription();
    return sub && Notification.permission === "granted" ? "on" : "off";
  } catch {
    return "unsupported";
  }
}

/** Short, stable id for a subscription, so saving it twice updates the same record. */
function recordId(endpoint: string): string {
  let a = 5381;
  let b = 52711;
  for (let i = 0; i < endpoint.length; i++) {
    const c = endpoint.charCodeAt(i);
    a = (a * 33) ^ c;
    b = (b * 33) ^ c;
  }
  return `push_${(a >>> 0).toString(36)}${(b >>> 0).toString(36)}`;
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

const timeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

async function saveSubscription(sub: PushSubscription): Promise<string | null> {
  const sb = getSupabase();
  const userId = currentUserId();
  if (!sb || !userId) return "Sign in first.";
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return "This browser gave an incomplete subscription.";
  const { error } = await sb.from("records").upsert(
    {
      user_id: userId,
      id: recordId(json.endpoint),
      kind: "push",
      data: { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth }, tz: timeZone(), savedAt: Date.now() },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,id" },
  );
  if (!error) return null;
  if (/records_kind_check|check constraint/i.test(error.message)) {
    return "The database needs updating: run supabase/schema.sql again in Supabase, then retry.";
  }
  if (/fetch|network/i.test(error.message)) return "Can't reach the server. Check your internet connection.";
  return error.message;
}

/** Asks for permission and registers this device. Returns an error message, or null when it worked. */
export async function enablePush(): Promise<string | null> {
  if (!cloudEnabled || !VAPID_PUBLIC_KEY) return "Reminders aren't set up yet. See SETUP.md, step 5.";
  if (!supported()) return "This browser doesn't support notifications.";
  const reg = await registration();
  if (!reg) return "Notifications need the installed app, opened from its https address.";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return permission === "denied"
      ? "Notifications are blocked. Allow them for this site in your browser's settings."
      : "Notifications weren't allowed.";
  }
  try {
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) });
    }
    const error = await saveSubscription(sub);
    if (error) return error;
    return null;
  } catch (err) {
    console.warn("Push subscribe failed", err);
    return "Couldn't turn notifications on. Check your connection and try again.";
  }
}

/** Stops notifications on this device only. */
export async function disablePush(): Promise<void> {
  const reg = await registration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  const sb = getSupabase();
  const userId = currentUserId();
  const id = recordId(sub.endpoint);
  await sub.unsubscribe().catch(() => false);
  if (sb && userId) await sb.from("records").delete().eq("user_id", userId).eq("id", id);
}

/**
 * Run when the app opens: re-saves this device's subscription so the time zone
 * stays right (e.g. after travelling) and a subscription the browser renewed
 * isn't lost.
 */
export async function refreshPush(): Promise<void> {
  try {
    if ((await pushState()) !== "on" || !navigator.onLine) return;
    const reg = await registration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) await saveSubscription(sub);
  } catch {
    // not important
  }
}

/** Sends a real notification through the server, to check the whole chain. */
export async function sendTestPush(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return "Reminders need cloud sync.";
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return "Sign in first.";
  try {
    const res = await fetch("/api/push-test", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) return null;
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    return body?.error ?? "The test couldn't be sent.";
  } catch {
    return "Can't reach the server. Check your internet connection.";
  }
}
