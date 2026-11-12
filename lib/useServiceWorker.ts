"use client";

import { useEffect } from "react";

/**
 * Registers the service worker (public/sw.js), which makes the app open
 * offline and shows reminders. Only in the published app: during development
 * a service worker would keep serving old files, so any left over is removed.
 */
export function useServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .then((done) => {
          if (done.some(Boolean) && "caches" in window) {
            return caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
          }
        })
        .catch(() => undefined);
      return;
    }

    let timer: number | undefined;
    const start = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then(() => navigator.serviceWorker.ready)
        .then((reg) => {
          // After each visit, refresh the saved copy of every screen so the
          // latest version is the one available offline.
          timer = window.setTimeout(() => {
            if (navigator.onLine) reg.active?.postMessage("warm");
          }, 5000);
        })
        .catch((err) => console.warn("Service worker registration failed", err));
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("load", start);
    };
  }, []);
}
