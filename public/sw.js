/*
 * Service worker: makes the app open without internet, and shows reminders.
 * Plain browser code with no build step. No AI, no tracking.
 *
 * - Pages: fetched from the network when possible (so new versions show up
 *   straight away), with the last saved copy as the offline fallback.
 * - Built files under /_next/static/ never change once published, so they are
 *   served from the cache.
 * - Everything else (your data, sign-in, photos) is left alone; the app keeps
 *   its own offline copy of your data.
 */

const VERSION = "v1";
const PAGES = `pages-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const ROUTES = ["/", "/library", "/history", "/settings", "/paste"];
const MAX_ASSETS = 220;

/** Saves each screen and the files it needs, so all of them work offline. */
async function warm() {
  const pages = await caches.open(PAGES);
  const assets = await caches.open(ASSETS);
  const wanted = new Set(["/icons/icon-192.png", "/icons/icon-512.png", "/manifest.webmanifest"]);
  await Promise.all(
    ROUTES.map(async (route) => {
      try {
        const res = await fetch(route, { cache: "no-cache", credentials: "same-origin" });
        if (!res.ok || res.redirected) return;
        const html = await res.clone().text();
        await pages.put(route, res);
        for (const m of html.matchAll(/\/_next\/static\/[^"'\\\s<>)]+/g)) wanted.add(m[0]);
      } catch {
        // offline or flaky: keep whatever was saved before
      }
    }),
  );
  await Promise.all(
    [...wanted].map(async (url) => {
      try {
        if (await assets.match(url)) return;
        const res = await fetch(url);
        if (res.ok) await assets.put(url, res);
      } catch {
        // skip
      }
    }),
  );
  // Old builds' files pile up over time; drop the oldest.
  const keys = await assets.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - MAX_ASSETS))) await assets.delete(key);
}

self.addEventListener("install", (event) => {
  event.waitUntil(warm().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) if (name !== PAGES && name !== ASSETS) await caches.delete(name);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "warm") event.waitUntil(warm());
});

async function pageResponse(request) {
  const url = new URL(request.url);
  const cache = await caches.open(PAGES);
  try {
    const res = await fetch(request);
    if (res.ok && !res.redirected && ROUTES.includes(url.pathname)) await cache.put(url.pathname, res.clone());
    return res;
  } catch (err) {
    // Offline. Every screen reads ?date= and the like in the browser, so the
    // saved page for the path works for any query string.
    const saved = (await cache.match(url.pathname)) || (await cache.match("/"));
    if (saved) return saved;
    throw err;
  }
}

async function assetResponse(request) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(request.url);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) await cache.put(request.url, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(pageResponse(request));
    return;
  }
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(assetResponse(request));
  }
  // Anything else (including the app's own page-to-page data requests) goes to
  // the network as usual. If that fails offline, the app falls back to a full
  // page load, which is answered from the saved pages above.
});

// ---- Reminders --------------------------------------------------------------

self.addEventListener("push", (event) => {
  let msg = {};
  try {
    msg = event.data ? event.data.json() : {};
  } catch {
    msg = { body: event.data ? event.data.text() : "" };
  }
  const title = msg.title || "Diet Tracker";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: msg.body || "",
      tag: msg.tag || "reminder",
      renotify: true,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      data: { url: msg.url || "/" },
      actions: msg.tag === "meal" ? [{ action: "paste", title: "Paste entry" }] : [],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.action === "paste" ? "/paste" : (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((c) => new URL(c.url).origin === self.location.origin);
      if (open) {
        await open.focus();
        if (new URL(open.url).pathname !== target && "navigate" in open) await open.navigate(target).catch(() => {});
        return;
      }
      await self.clients.openWindow(target);
    })(),
  );
});
