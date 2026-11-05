"use client";

/**
 * Meal photos, kept on this device in IndexedDB (localStorage is far too small).
 *
 * Photos are compressed before saving. The full-quality original stays in the
 * phone's own gallery. Kept separate from the main store on purpose, so cloud
 * upload (and the later phone-to-laptop sync) can be added here on their own.
 */

import { useEffect, useState } from "react";

const DB_NAME = "diet-tracker-photos";
const STORE = "photos";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
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
  try {
    // Respects the phone's rotation info, so photos aren't sideways.
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    source = bmp;
    width = bmp.width;
    height = bmp.height;
  } catch {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    await img.decode();
    URL.revokeObjectURL(url);
    source = img;
    width = img.naturalWidth;
    height = img.naturalHeight;
  }
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d")!.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not compress photo"))), "image/jpeg", quality),
  );
}

export async function savePhoto(file: Blob): Promise<string> {
  const blob = await compressImage(file);
  const id = newId();
  await run("readwrite", (s) => s.put(blob, id));
  return id;
}

export async function getPhoto(id: string): Promise<Blob | null> {
  try {
    return ((await run("readonly", (s) => s.get(id))) as Blob | undefined) ?? null;
  } catch {
    return null;
  }
}

/** Deletes stored photos that nothing refers to any more. */
export async function cleanupPhotos(keep: Set<string>) {
  try {
    const keys = (await run("readonly", (s) => s.getAllKeys())) as string[];
    for (const key of keys) if (!keep.has(key)) await run("readwrite", (s) => s.delete(key));
  } catch {
    // not important
  }
}

const urlCache = new Map<string, string>();

/** Object URL for a stored photo, or null while loading / if it's not on this device. */
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
    let alive = true;
    void getPhoto(id).then((blob) => {
      if (!alive || !blob) return;
      const u = URL.createObjectURL(blob);
      urlCache.set(id, u);
      setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [id]);
  return url;
}
