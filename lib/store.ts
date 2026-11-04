"use client";

/**
 * Local data store.
 *
 * Everything is saved in this browser's localStorage on the current device.
 * All reads and writes go through this file, so moving to a cloud database
 * later only means changing this module.
 */

import { useSyncExternalStore } from "react";
import { nowTime } from "./dates";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Macros = { kcal: number; protein: number; carbs: number; fat: number };

/** Optional extra nutrients (grams, sodium in mg), mostly filled in by AI paste entries. */
export type Extras = { fiber?: number; sugar?: number; sodium?: number };

export type Food = Macros & Extras & {
  id: string;
  name: string;
  /** What one serving is, e.g. "1 bowl". Macros are per serving. */
  serving: string;
  favourite: boolean;
  uses: number;
  lastUsedAt?: number;
  createdAt: number;
};

export type Entry = Macros & Extras & {
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
  createdAt: number;
};

export type WaterLog = { id: string; date: string; ml: number; createdAt: number };

export type Goals = Macros & { waterMl: number };

export type Data = {
  version: 1;
  foods: Food[];
  entries: Entry[];
  water: WaterLog[];
  goals: Goals;
  /** The user's own notes appended to the AI prompt (usual portions, cuisine...). */
  promptNotes: string;
};

export type State = Data & { ready: boolean };

export type FoodInput = Pick<Food, "name" | "serving" | "kcal" | "protein" | "carbs" | "fat" | "favourite"> & Extras;

export type EntryInput = Omit<Entry, "id" | "createdAt">;

// ---------------------------------------------------------------------------
// Store plumbing
// ---------------------------------------------------------------------------

const KEY = "diet-tracker:v1";

export const DEFAULT_GOALS: Goals = { kcal: 2200, protein: 140, carbs: 250, fat: 70, waterMl: 3000 };

const emptyData = (): Data => ({
  version: 1,
  foods: [],
  entries: [],
  water: [],
  goals: { ...DEFAULT_GOALS },
  promptNotes: "",
});

/** What the server (and the first browser render) sees: empty and not ready. */
const SERVER_STATE: State = { ...emptyData(), ready: false };

let state: State = SERVER_STATE;
let loaded = false;
const listeners = new Set<() => void>();

/** IDs that work everywhere (crypto.randomUUID needs https, which the phone dev URL isn't). */
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9);

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
    water: list<WaterLog>(r.water),
    goals: { ...DEFAULT_GOALS, ...(typeof r.goals === "object" && r.goals ? (r.goals as Partial<Goals>) : {}) },
    promptNotes: typeof r.promptNotes === "string" ? r.promptNotes : "",
  };
}

function readStorage(): State {
  try {
    const raw = window.localStorage.getItem(KEY);
    const data = raw ? normalize(JSON.parse(raw)) : null;
    return { ...(data ?? emptyData()), ready: true };
  } catch {
    return { ...emptyData(), ready: true };
  }
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  state = readStorage();
  // Keep two open tabs in step with each other.
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      state = readStorage();
      emit();
    }
  });
}

function emit() {
  listeners.forEach((l) => l());
}

function update(fn: (d: Data) => Data) {
  ensureLoaded();
  const { ready: _ready, ...current } = state;
  const next = fn(current);
  state = { ...next, ready: true };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch (err) {
    console.error("Could not save data", err);
  }
  emit();
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

/** Read the whole store. `ready` is false until the browser has loaded saved data. */
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

export function updateEntry(id: string, patch: Partial<Pick<Entry, "servings" | "time">>) {
  update((d) => ({ ...d, entries: d.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
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
// Goals
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
  const { ready: _ready, ...data } = getSnapshot();
  return JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2);
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
