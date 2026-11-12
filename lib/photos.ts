"use client";

/**
 * Meal photos.
 *
 * Photos are compressed, then kept on this device in IndexedDB (localStorage is
 * far too small). With cloud sync on, the compressed copy is also uploaded to
 * your private Supabase Storage bucket, so every device you sign in on can show
 * it. The full-quality original stays in the phone's own gallery.
 *
 * Kept separate from the main store on purpose, so the later phone-to-laptop
 * sync of originals can be added here on its own.
 */

import { useEffect, useState } from "react";
import { currentUserId } from "./store";
import { getSupabase } from "./supabase";

const DB_NAME = "diet-tracker-photos";
const STORE = "photos";
const BUCKET = "photos";
/** Photo ids saved on this device that still have to be uploaded. */
const QUEUE_KEY = "diet-tracker:photo-uploads";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    // A failed open shouldn't stick for the rest of the session.
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = fn(db.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

const newId = () => "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/** Resizes to at most `maxSide` px on the long edge and re-encodes as JPEG. */
export async function compressImage(file: Blob, maxSide = 1280, quality = 0.75): Promise<Blob> {
  let source: CanvasImageSource;
  let width: number;
  let height: number;
  let bitmap: ImageBitmap | null = null;
  try {
    // Respects the phone's rotation info, so photos aren't sideways.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    source = bitmap;
    width = bitmap.width;
    height = bitmap.height;
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      source = img;
      width = img.naturalWidth;
      height = img.naturalHeight;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  if (!width || !height) throw new Error("Could not read photo");
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  canvas.getContext("2d")!.drawImage(source, 0, 0, canvas.width, canvas.height);
  bitmap?.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not compress photo"))), "image/jpeg", quality),
  );
}

// ---------------------------------------------------------------------------
// Cloud copy
// ---------------------------------------------------------------------------

const pathFor = (userId: string, id: string) => `${userId}/${id}.jpg`;

function readQueue(): string[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(QUEUE_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeQueue(ids: string[]) {
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(ids));
  } catch {
    // not important: the photo is still on this device
  }
}

let uploading: Promise<void> | null = null;

/** Uploads photos taken on this device that haven't reached the cloud yet. Safe to call often. */
export function uploadPendingPhotos(): Promise<void> {
  if (uploading) return uploading;
  const sb = getSupabase();
  const userId = currentUserId();
  if (!sb || !userId || !navigator.onLine || !readQueue().length) return Promise.resolve();
  uploading = (async () => {
    for (const id of readQueue()) {
      if (currentUserId() !== userId) return;
      let blob: Blob | null = null;
      try {
        blob = ((await run("readonly", (s) => s.get(id))) as Blob | undefined) ?? null;
      } catch {
        return; // storage isn't available right now; try again later
      }
      if (blob) {
        const { error } = await sb.storage
          .from(BUCKET)
          .upload(pathFor(userId, id), blob, { contentType: "image/jpeg", upsert: true, cacheControl: "31536000" });
        if (error) {
          console.warn("Photo upload failed; will retry", error);
          return;
        }
      }
      // Uploaded, or no longer on this device: either way it leaves the queue.
      writeQueue(readQueue().filter((x) => x !== id));
    }
  })().finally(() => {
    uploading = null;
  });
  return uploading;
}

export async function savePhoto(file: Blob): Promise<string> {
  const blob = await compressImage(file);
  const id = newId();
  await run("readwrite", (s) => s.put(blob, id));
  if (getSupabase()) {
    writeQueue([...readQueue(), id]);
    void uploadPendingPhotos();
  }
  return id;
}

/** When a photo was last looked for in the cloud and not found, so we don't ask on every render. */
const missing = new Map<string, number>();

async function downloadPhoto(id: string): Promise<Blob | null> {
  const sb = getSupabase();
  const userId = currentUserId();
  if (!sb || !userId || !navigator.onLine) return null;
  if (Date.now() - (missing.get(id) ?? 0) < 60_000) return null;
  const { data, error } = await sb.storage.from(BUCKET).download(pathFor(userId, id));
  if (error || !data) {
    missing.set(id, Date.now());
    return null;
  }
  try {
    await run("readwrite", (s) => s.put(data, id));
  } catch {
    // couldn't keep a copy; still show it this time
  }
  return data;
}

/** The photo from this device, or (with cloud sync) fetched from your account. */
export async function getPhoto(id: string): Promise<Blob | null> {
  let local: Blob | null = null;
  try {
    local = ((await run("readonly", (s) => s.get(id))) as Blob | undefined) ?? null;
  } catch {
    // fall through to the cloud copy
  }
  if (local) return local;
  try {
    return await downloadPhoto(id);
  } catch {
    return null;
  }
}

/**
 * Deletes stored photos that nothing refers to any more.
 * `synced` must only be true when `keep` comes from data just loaded from the
 * cloud; only then are unreferenced cloud copies removed too.
 */
export async function cleanupPhotos(keep: Set<string>, synced = false) {
  try {
    const keys = (await run("readonly", (s) => s.getAllKeys())) as string[];
    for (const key of keys) if (!keep.has(key)) await run("readwrite", (s) => s.delete(key));
    const queue = readQueue();
    const kept = queue.filter((id) => keep.has(id));
    if (kept.length !== queue.length) writeQueue(kept);
  } catch {
    // not important
  }

  const sb = getSupabase();
  const userId = currentUserId();
  if (!synced || !sb || !userId || !navigator.onLine) return;
  try {
    // Photos newer than a day are left alone: another device may have just
    // taken one whose log entry hasn't reached this device yet.
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const stale: string[] = [];
    const PAGE = 100;
    for (let offset = 0; offset < 5000; offset += PAGE) {
      const { data, error } = await sb.storage.from(BUCKET).list(userId, { limit: PAGE, offset, sortBy: { column: "name", order: "asc" } });
      if (error || !data) return;
      for (const f of data) {
        const id = f.name.replace(/\.jpg$/, "");
        const created = f.created_at ? Date.parse(f.created_at) : NaN;
        if (!keep.has(id) && created < cutoff) stale.push(pathFor(userId, id));
      }
      if (data.length < PAGE) break;
    }
    if (stale.length && currentUserId() === userId) await sb.storage.from(BUCKET).remove(stale);
  } catch {
    // not important
  }
}

const urlCache = new Map<string, string>();

/** Object URL for a stored photo, or null while loading / if it can't be found. */
export function usePhotoUrl(id: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(() => (id ? urlCache.get(id) ?? null : null));
  useEffect(() => {
    if (!id) {
      setUrl(null);
      return;
    }
    const cached = urlCache.get(id);
    if (cached) {
      setUrl(cached);
      return;
    }
    setUrl(null);
    let alive = true;
    void getPhoto(id).then((blob) => {
      if (!blob) return;
      const u = urlCache.get(id) ?? URL.createObjectURL(blob);
      urlCache.set(id, u);
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [id]);
  return url;
}
