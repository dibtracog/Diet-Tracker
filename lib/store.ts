"use client";

/**
 * Data store.
 *
 * Two modes:
 *  - LOCAL (no Supabase keys set): everything lives in this browser's localStorage.
 *  - CLOUD (Supabase keys set): you sign in, and data is kept in your Supabase
 *    database so phone and laptop share it. A copy is cached on the device so the
 *    app opens instantly, and changes made offline wait in an "outbox" and are
 *    sent when the connection returns.
 *
 * Screens only use the hooks and actions exported here, so they don't care which
 * mode is active. Actions change state immediately (no waiting on the network).
 */

import { useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";
import { nowTime } from "./dates";
import { cloudEnabled, getSupabase } from "./supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Macros = { kcal: number; protein: number; carbs: number; fat: number };

/** Optional extra nutrients (grams, sodium in mg), mostly filled in by AI paste entries. */
export type Extras = { fiber?: number; sugar?: number; sodium?: number };

export type Food = Macros &
  Extras & {
    id: string;
    name: string;
    /** What one serving is, e.g. "1 bowl". Macros are per serving. */
    serving: string;
    favourite: boolean;
    uses: number;
    lastUsedAt?: number;
    createdAt: number;
  };

export type Entry = Macros &
  Extras & {
    id: string;
    /** Local day, "YYYY-MM-DD". */
    date: string;
    /** "HH:MM", 24h. The day's log is ordered by this. */
    time: string;
    name: string;
    serving: string;
    /** Multiplier on the per-serving macros above. */
    servings: number;
    /** Library food this came from, if any. */
    foodId?: string;
    /** Free-text note, e.g. the AI's assumptions. */
    notes?: string;
    /** Meal photo kept on the device that took it (see lib/photos.ts). */
    photoId?: string;
    createdAt: number;
  };

/** A meal photographed now, with nutrition to be filled in later. */
export type PendingMeal = {
  id: string;
  date: string;
  time: string;
  photoId?: string;
  note?: string;
  createdAt: number;
};

export type WaterLog = { id: string; date: string; ml: number; createdAt: number };

/** One weigh-in per day; logging again for the same day replaces it. */
export type WeightLog = { id: string; date: string; kg: number; createdAt: number };

export type Goals = Macros & { waterMl: number; /** Optional target body weight. */ weightKg?: number };

export type Data = {
  version: 1;
  foods: Food[];
  entries: Entry[];
  pendingMeals: PendingMeal[];
  water: WaterLog[];
  weights: WeightLog[];
  goals: Goals;
  /** The user's own notes appended to the AI prompt (usual portions, cuisine...). */
  promptNotes: string;
};

export type AuthStatus = "local" | "loading" | "signedOut" | "signedIn";
export type SyncStatus = "idle" | "syncing" | "synced" | "offline" | "error";

export type State = Data & {
  /** False until saved data has been loaded. */
  ready: boolean;
  auth: AuthStatus;
  email?: string;
  sync: SyncStatus;
  /** Changes made on this device that haven't reached the cloud yet. */
  pending: number;
};

export type FoodInput = Pick<Food, "name" | "serving" | "kcal" | "protein" | "carbs" | "fat" | "favourite"> & Extras;

export type EntryInput = Omit<Entry, "id" | "createdAt">;

type Kind = "food" | "entry" | "pending" | "water" | "weight" | "profile";
type Op = { type: "upsert"; id: string; kind: Kind; data: unknown } | { type: "delete"; id: string };

// ---------------------------------------------------------------------------
// Basics
// ---------------------------------------------------------------------------

const LOCAL_KEY = "diet-tracker:v1";
const PROFILE_ID = "profile";
const TABLE = "records";

export const DEFAULT_GOALS: Goals = { kcal: 2200, protein: 140, carbs: 250, fat: 70, waterMl: 3000 };

const emptyData = (): Data => ({
  version: 1,
  foods: [],
  entries: [],
  pendingMeals: [],
  water: [],
  weights: [],
  goals: { ...DEFAULT_GOALS },
  promptNotes: "",
});

const SERVER_STATE: State = {
  ...emptyData(),
  ready: false,
  auth: cloudEnabled ? "loading" : "local",
  sync: "idle",
  pending: 0,
};

let state: State = SERVER_STATE;
let loaded = false;
let userId: string | null = null;
let outbox: Op[] = [];
const listeners = new Set<() => void>();

/** IDs that work everywhere (crypto.randomUUID needs https, which the phone dev URL isn't). */
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9);

const dataOf = (s: State): Data => ({
  version: 1,
  foods: s.foods,
  entries: s.entries,
  pendingMeals: s.pendingMeals,
  water: s.water,
  weights: s.weights,
  goals: s.goals,
  promptNotes: s.promptNotes,
});

function normalize(raw: unknown): Data | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const list = <T>(v: unknown): T[] =>
    Array.isArray(v)
      ? (v.filter((x) => x && typeof x === "object" && typeof (x as { id?: unknown }).id === "string") as T[])
      : [];
  return {
    version: 1,
    foods: list<Food>(r.foods).map((f) => ({ ...f, favourite: !!f.favourite, uses: Number(f.uses) || 0 })),
    entries: list<Entry>(r.entries).map((e) => ({ ...e, servings: Number(e.servings) || 1 })),
    pendingMeals: list<PendingMeal>(r.pendingMeals),
    water: list<WaterLog>(r.water),
    weights: list<WeightLog>(r.weights).filter((w) => Number(w.kg) > 0),
    goals: { ...DEFAULT_GOALS, ...(typeof r.goals === "object" && r.goals ? (r.goals as Partial<Goals>) : {}) },
    promptNotes: typeof r.promptNotes === "string" ? r.promptNotes : "",
  };
}

const cacheKey = () => (userId ? `diet-tracker:cloud:${userId}` : LOCAL_KEY);
const outboxKey = () => `diet-tracker:outbox:${userId}`;

function readJSON(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error("Could not save to this device", err);
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function setState(patch: Partial<State>) {
  state = { ...state, ...patch, pending: outbox.length };
  emit();
}

// ---------------------------------------------------------------------------
// Loading & auth
// ---------------------------------------------------------------------------

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;

  // Keep two open tabs in step with each other.
  window.addEventListener("storage", (e) => {
    if (e.key && e.key === cacheKey()) {
      const data = normalize(readJSON(e.key));
      if (data) setState({ ...data });
    }
  });

  if (!cloudEnabled) {
    state = { ...SERVER_STATE, ...(normalize(readJSON(LOCAL_KEY)) ?? emptyData()), ready: true, auth: "local" };
    return;
  }

  const sb = getSupabase()!;
  sb.auth.getSession().then(({ data }) => handleSession(data.session));
  // Supabase advises not to await its own calls inside this callback, hence the timeout.
  sb.auth.onAuthStateChange((_event, session) => window.setTimeout(() => handleSession(session), 0));

  window.addEventListener("online", () => void syncNow());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void syncNow();
  });
}

function handleSession(session: Session | null) {
  const id = session?.user.id ?? null;
  const email = session?.user.email ?? undefined;
  if (id === userId) {
    if (id && email !== state.email) setState({ email });
    return;
  }
  if (!id) {
    userId = null;
    outbox = [];
    setState({ ...emptyData(), ready: false, auth: "signedOut", email: undefined, sync: "idle" });
    return;
  }
  userId = id;
  const savedOutbox = readJSON(outboxKey());
  outbox = Array.isArray(savedOutbox) ? (savedOutbox as Op[]) : [];
  const cached = normalize(readJSON(cacheKey()));
  setState({ ...(cached ?? emptyData()), ready: !!cached, auth: "signedIn", email, sync: "idle" });
  void syncNow();
}

export async function signIn(email: string, password: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return "Cloud sync isn't set up.";
  const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
  if (!error) return null;
  if (/invalid login credentials/i.test(error.message)) return "Wrong email or password.";
  if (/email not confirmed/i.test(error.message)) return "This email hasn't been confirmed yet. Check Supabase → Authentication → Users.";
  if (/fetch|network/i.test(error.message)) return "Can't reach the server. Check your internet connection.";
  return error.message;
}

export async function signOut() {
  const sb = getSupabase();
  if (!sb) return;
  const id = userId;
  await sb.auth.signOut();
  if (id) {
    // Clear this device's copy; the data stays safe in the cloud.
    window.localStorage.removeItem(`diet-tracker:cloud:${id}`);
    window.localStorage.removeItem(`diet-tracker:outbox:${id}`);
  }
}

// ---------------------------------------------------------------------------
// Cloud sync
// ---------------------------------------------------------------------------

/** Works out which records changed between two versions of the data. */
function diff(prev: Data, next: Data): Op[] {
  const ops: Op[] = [];
  const collections: [Kind, "foods" | "entries" | "pendingMeals" | "water" | "weights"][] = [
    ["food", "foods"],
    ["entry", "entries"],
    ["pending", "pendingMeals"],
    ["water", "water"],
    ["weight", "weights"],
  ];
  for (const [kind, key] of collections) {
    const before = new Map<string, unknown>(prev[key].map((r) => [r.id, r]));
    const after = new Map<string, unknown>(next[key].map((r) => [r.id, r]));
    for (const [id, rec] of after) if (before.get(id) !== rec) ops.push({ type: "upsert", id, kind, data: rec });
    for (const id of before.keys()) if (!after.has(id)) ops.push({ type: "delete", id });
  }
  if (prev.goals !== next.goals || prev.promptNotes !== next.promptNotes) {
    ops.push({ type: "upsert", id: PROFILE_ID, kind: "profile", data: { goals: next.goals, promptNotes: next.promptNotes } });
  }
  return ops;
}

function enqueue(ops: Op[]) {
  if (!ops.length || !userId) return;
  outbox = [...outbox, ...ops];
  writeJSON(outboxKey(), outbox);
}

const chunks = <T>(arr: T[], size: number) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

/** Sends queued changes. Throws if the network or database refuses. */
async function flush() {
  const sb = getSupabase();
  if (!sb || !userId || !outbox.length) return;
  const count = outbox.length;
  // Only the latest change per record matters.
  const latest = new Map<string, Op>();
  for (const op of outbox.slice(0, count)) latest.set(op.id, op);
  const ops = [...latest.values()];
  const now = new Date().toISOString();

  const upserts = ops.flatMap((o) =>
    o.type === "upsert" ? [{ user_id: userId, id: o.id, kind: o.kind, data: o.data, updated_at: now }] : [],
  );
  const deletes = ops.flatMap((o) => (o.type === "delete" ? [o.id] : []));

  for (const part of chunks(upserts, 500)) {
    const { error } = await sb.from(TABLE).upsert(part, { onConflict: "user_id,id" });
    if (error) throw error;
  }
  for (const part of chunks(deletes, 200)) {
    const { error } = await sb.from(TABLE).delete().eq("user_id", userId).in("id", part);
    if (error) throw error;
  }
  outbox = outbox.slice(count);
  writeJSON(outboxKey(), outbox);
}

async function fetchAll(): Promise<{ data: Data; hasProfile: boolean }> {
  const sb = getSupabase()!;
  const rows: { id: string; kind: Kind; data: unknown }[] = [];
  const PAGE = 1000; // Supabase returns at most 1000 rows per request
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from(TABLE)
      .select("id, kind, data")
      .eq("user_id", userId!)
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data as typeof rows));
    if (data.length < PAGE) break;
  }
  const profile = rows.find((r) => r.kind === "profile")?.data as Partial<Data> | undefined;
  const data = normalize({
    foods: rows.filter((r) => r.kind === "food").map((r) => r.data),
    entries: rows.filter((r) => r.kind === "entry").map((r) => r.data),
    pendingMeals: rows.filter((r) => r.kind === "pending").map((r) => r.data),
    water: rows.filter((r) => r.kind === "water").map((r) => r.data),
    weights: rows.filter((r) => r.kind === "weight").map((r) => r.data),
    goals: profile?.goals,
    promptNotes: profile?.promptNotes,
  })!;
  return { data, hasProfile: !!profile };
}

/** First sign-in on a device that was used in local-only mode: upload that data. */
function mergeLocalData(server: Data, hasProfile: boolean): Data {
  const local = normalize(readJSON(LOCAL_KEY));
  if (!local) return server;
  const addMissing = <T extends { id: string }>(theirs: T[], mine: T[]) => {
    const ids = new Set(theirs.map((r) => r.id));
    return [...theirs, ...mine.filter((r) => !ids.has(r.id))];
  };
  const merged: Data = {
    ...server,
    foods: addMissing(server.foods, local.foods),
    entries: addMissing(server.entries, local.entries),
    pendingMeals: addMissing(server.pendingMeals, local.pendingMeals),
    water: addMissing(server.water, local.water),
    weights: addMissing(server.weights, local.weights),
    ...(hasProfile ? {} : { goals: local.goals, promptNotes: local.promptNotes }),
  };
  // Keep a copy of the old local data, just in case.
  window.localStorage.setItem(`${LOCAL_KEY}:uploaded`, window.localStorage.getItem(LOCAL_KEY) ?? "");
  window.localStorage.removeItem(LOCAL_KEY);
  return merged;
}

let syncing: Promise<void> | null = null;
let resyncWanted = false;

/** Sends pending changes, then reloads everything from the cloud. */
export function syncNow(): Promise<void> {
  if (!userId) return Promise.resolve();
  if (syncing) {
    resyncWanted = true;
    return syncing;
  }
  syncing = (async () => {
    const forUser = userId;
    setState({ sync: "syncing" });
    try {
      await flush();
      const { data: server, hasProfile } = await fetchAll();
      if (forUser !== userId) return;
      if (outbox.length) {
        // New edits arrived while loading; they win. Try again shortly.
        resyncWanted = true;
        return;
      }
      const merged = mergeLocalData(server, hasProfile);
      enqueue(diff(server, merged));
      await flush();
      writeJSON(cacheKey(), merged);
      setState({ ...merged, ready: true, sync: "synced" });
    } catch (err) {
      console.warn("Sync failed", err);
      // Still let the app be used offline with whatever is on this device.
      setState({ ready: true, sync: navigator.onLine ? "error" : "offline" });
      scheduleRetry();
    }
  })().finally(() => {
    syncing = null;
    if (resyncWanted) {
      resyncWanted = false;
      window.setTimeout(() => void syncNow(), 500);
    }
  });
  return syncing;
}

let flushTimer: number | undefined;
let retryTimer: number | undefined;

function scheduleRetry() {
  window.clearTimeout(retryTimer);
  retryTimer = window.setTimeout(() => void syncNow(), 20_000);
}

/** After an edit: send it shortly (edits made in quick succession go together). */
function scheduleFlush() {
  window.clearTimeout(flushTimer);
  flushTimer = window.setTimeout(async () => {
    if (!userId || !outbox.length || syncing) return;
    setState({ sync: "syncing" });
    try {
      await flush();
      setState({ sync: outbox.length ? "syncing" : "synced" });
      if (outbox.length) scheduleFlush();
    } catch (err) {
      console.warn("Saving to the cloud failed", err);
      setState({ sync: navigator.onLine ? "error" : "offline" });
      scheduleRetry();
    }
  }, 350);
}

// ---------------------------------------------------------------------------
// The update pipeline every action goes through
// ---------------------------------------------------------------------------

function update(fn: (d: Data) => Data) {
  ensureLoaded();
  if (state.auth === "signedOut" || state.auth === "loading") return;
  const prev = dataOf(state);
  const next = fn(prev);
  if (userId) enqueue(diff(prev, next));
  writeJSON(cacheKey(), next);
  setState({ ...next, ready: true });
  if (userId) scheduleFlush();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): State {
  ensureLoaded();
  return state;
}

const getServerSnapshot = () => SERVER_STATE;

/** Read the whole store. `ready` is false until saved data has been loaded. */
export function useStore(): State {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ---------------------------------------------------------------------------
// Foods (library)
// ---------------------------------------------------------------------------

export function addFood(input: FoodInput): Food {
  const food: Food = { ...input, id: uid(), uses: 0, createdAt: Date.now() };
  update((d) => ({ ...d, foods: [...d.foods, food] }));
  return food;
}

export function updateFood(id: string, patch: Partial<FoodInput>) {
  update((d) => ({ ...d, foods: d.foods.map((f) => (f.id === id ? { ...f, ...patch } : f)) }));
}

/** Logged entries keep their own copy of the numbers, so past days are unaffected. */
export function deleteFood(id: string) {
  update((d) => ({ ...d, foods: d.foods.filter((f) => f.id !== id) }));
}

export function restoreFood(food: Food) {
  update((d) => (d.foods.some((f) => f.id === food.id) ? d : { ...d, foods: [...d.foods, food] }));
}

export function toggleFavourite(id: string) {
  update((d) => ({ ...d, foods: d.foods.map((f) => (f.id === id ? { ...f, favourite: !f.favourite } : f)) }));
}

// ---------------------------------------------------------------------------
// Entries (food log)
// ---------------------------------------------------------------------------

export function logFood(food: Food, date: string, servings = 1): Entry {
  const entry: Entry = {
    id: uid(),
    date,
    time: nowTime(),
    name: food.name,
    serving: food.serving,
    servings,
    kcal: food.kcal,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    fiber: food.fiber,
    sugar: food.sugar,
    sodium: food.sodium,
    foodId: food.id,
    createdAt: Date.now(),
  };
  update((d) => ({
    ...d,
    entries: [...d.entries, entry],
    foods: d.foods.map((f) => (f.id === food.id ? { ...f, uses: f.uses + 1, lastUsedAt: Date.now() } : f)),
  }));
  return entry;
}

/** Adds an entry that didn't come from the library, e.g. a pasted AI entry. */
export function addEntry(input: EntryInput): Entry {
  const entry: Entry = { ...input, id: uid(), createdAt: Date.now() };
  update((d) => ({ ...d, entries: [...d.entries, entry] }));
  return entry;
}

export type EntryPatch = Partial<
  Pick<Entry, "servings" | "time" | "date" | "name" | "serving" | "kcal" | "protein" | "carbs" | "fat">
>;

export function updateEntry(id: string, patch: EntryPatch) {
  update((d) => ({ ...d, entries: d.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
}

/** Logs a copy of an entry again (e.g. the same meal today). */
export function duplicateEntry(entry: Entry, date: string): Entry {
  const copy: Entry = { ...entry, id: uid(), date, time: nowTime(), createdAt: Date.now() };
  update((d) => ({ ...d, entries: [...d.entries, copy] }));
  return copy;
}

// ---------------------------------------------------------------------------
// Photo meals waiting for details
// ---------------------------------------------------------------------------

export function addPendingMeal(input: { date: string; photoId?: string; note?: string }): PendingMeal {
  const meal: PendingMeal = { ...input, id: uid(), time: nowTime(), createdAt: Date.now() };
  update((d) => ({ ...d, pendingMeals: [...d.pendingMeals, meal] }));
  return meal;
}

export function removePendingMeal(id: string) {
  update((d) => ({ ...d, pendingMeals: d.pendingMeals.filter((m) => m.id !== id) }));
}

export function restorePendingMeal(meal: PendingMeal) {
  update((d) => (d.pendingMeals.some((m) => m.id === meal.id) ? d : { ...d, pendingMeals: [...d.pendingMeals, meal] }));
}

/** Turns a photo meal into a real log entry (keeping its photo) in one step. */
export function resolvePendingMeal(id: string, input: EntryInput): Entry {
  const meal = state.pendingMeals.find((m) => m.id === id);
  const entry: Entry = { ...input, photoId: input.photoId ?? meal?.photoId, id: uid(), createdAt: Date.now() };
  update((d) => ({
    ...d,
    entries: [...d.entries, entry],
    pendingMeals: d.pendingMeals.filter((m) => m.id !== id),
  }));
  return entry;
}

export function removeEntry(id: string) {
  update((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) }));
}

export function restoreEntry(entry: Entry) {
  update((d) => (d.entries.some((e) => e.id === entry.id) ? d : { ...d, entries: [...d.entries, entry] }));
}

// ---------------------------------------------------------------------------
// Water
// ---------------------------------------------------------------------------

export function addWater(date: string, ml: number) {
  update((d) => ({ ...d, water: [...d.water, { id: uid(), date, ml, createdAt: Date.now() }] }));
}

export function removeWater(id: string) {
  update((d) => ({ ...d, water: d.water.filter((w) => w.id !== id) }));
}

export function restoreWater(log: WaterLog) {
  update((d) => (d.water.some((w) => w.id === log.id) ? d : { ...d, water: [...d.water, log] }));
}

/** Removes the most recent water entry for that day. */
export function undoWater(date: string) {
  update((d) => {
    const forDay = d.water.filter((w) => w.date === date);
    if (!forDay.length) return d;
    const last = forDay.reduce((a, b) => (b.createdAt >= a.createdAt ? b : a));
    return { ...d, water: d.water.filter((w) => w.id !== last.id) };
  });
}

// ---------------------------------------------------------------------------
// Weight
// ---------------------------------------------------------------------------

/** Logs a weigh-in. Replaces any weigh-in already logged for that day. */
export function logWeight(date: string, kg: number): { added: WeightLog; replaced?: WeightLog } {
  const replaced = state.weights.find((w) => w.date === date);
  const added: WeightLog = { id: uid(), date, kg, createdAt: Date.now() };
  update((d) => ({ ...d, weights: [...d.weights.filter((w) => w.date !== date), added] }));
  return { added, replaced };
}

export function removeWeight(id: string) {
  update((d) => ({ ...d, weights: d.weights.filter((w) => w.id !== id) }));
}

/** Undo helper: puts a weigh-in back (and drops whatever replaced it that day). */
export function restoreWeight(log: WeightLog) {
  update((d) => ({ ...d, weights: [...d.weights.filter((w) => w.date !== log.date), log] }));
}

// ---------------------------------------------------------------------------
// Goals & prompt notes
// ---------------------------------------------------------------------------

export function updateGoals(goals: Goals) {
  update((d) => ({ ...d, goals }));
}

export function setPromptNotes(promptNotes: string) {
  update((d) => ({ ...d, promptNotes }));
}

// ---------------------------------------------------------------------------
// Backup
// ---------------------------------------------------------------------------

export function exportJSON(): string {
  return JSON.stringify({ ...dataOf(getSnapshot()), exportedAt: new Date().toISOString() }, null, 2);
}

export function parseBackup(text: string): { ok: true; data: Data } | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }
  const r = raw as Record<string, unknown> | null;
  if (!r || typeof r !== "object" || (!Array.isArray(r.foods) && !Array.isArray(r.entries))) {
    return { ok: false, error: "That file doesn't look like a Diet Tracker backup." };
  }
  const data = normalize(raw);
  return data ? { ok: true, data } : { ok: false, error: "That file couldn't be read." };
}

/** Replaces everything (on this device and, when signed in, in the cloud) with the backup. */
export function replaceData(data: Data) {
  update(() => data);
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export function entriesFor(d: Data, date: string): Entry[] {
  return d.entries
    .filter((e) => e.date === date)
    .sort((a, b) => a.time.localeCompare(b.time) || a.createdAt - b.createdAt);
}

export function entryTotals(entries: Entry[]): Macros {
  return entries.reduce(
    (t, e) => ({
      kcal: t.kcal + e.kcal * e.servings,
      protein: t.protein + e.protein * e.servings,
      carbs: t.carbs + e.carbs * e.servings,
      fat: t.fat + e.fat * e.servings,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function waterFor(d: Data, date: string): { total: number; count: number } {
  const logs = d.water.filter((w) => w.date === date);
  return { total: logs.reduce((s, w) => s + w.ml, 0), count: logs.length };
}

/** Favourites first (most used first); falls back to the most-used foods. */
export function quickFoods(foods: Food[], limit = 6): Food[] {
  const byUse = (a: Food, b: Food) => b.uses - a.uses || (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0);
  const favs = foods.filter((f) => f.favourite).sort(byUse);
  if (favs.length) return favs.slice(0, limit);
  return foods
    .filter((f) => f.uses > 0)
    .sort(byUse)
    .slice(0, limit);
}
