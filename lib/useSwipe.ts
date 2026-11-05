"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Horizontal swipe detection for touch screens.
 *
 * A swipe is a quick, mostly sideways flick: at least 60px across, clearly more
 * horizontal than vertical, within 700 ms. Touches that start in a field, in a
 * horizontally scrollable area, or inside [data-no-swipe] are ignored, as are
 * multi-finger gestures (pinch zoom).
 */
export type SwipeHandler = (dir: "left" | "right", target: HTMLElement) => void;

const MIN_DX = 60;
const MAX_MS = 700;

function blocked(el: HTMLElement | null, root: HTMLElement): boolean {
  for (let n = el; n && n !== root; n = n.parentElement) {
    if (n.dataset.noSwipe !== undefined) return true;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(n.tagName)) return true;
    const style = getComputedStyle(n);
    if ((style.overflowX === "auto" || style.overflowX === "scroll") && n.scrollWidth > n.clientWidth) return true;
  }
  return false;
}

export function useSwipe(ref: RefObject<HTMLElement | null>, onSwipe: SwipeHandler, enabled = true) {
  const handler = useRef(onSwipe);
  handler.current = onSwipe;

  useEffect(() => {
    const root = ref.current;
    if (!root || !enabled) return;
    let start: { x: number; y: number; t: number; target: HTMLElement } | null = null;

    const onStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      start = e.touches.length === 1 && !blocked(target, root)
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now(), target }
        : null;
    };
    const onMove = (e: TouchEvent) => {
      if (e.touches.length > 1) start = null;
    };
    const onEnd = (e: TouchEvent) => {
      if (!start) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const quick = Date.now() - start.t < MAX_MS;
      const s = start;
      start = null;
      if (!quick || Math.abs(dx) < MIN_DX || Math.abs(dx) < Math.abs(dy) * 1.6) return;
      if (window.visualViewport && window.visualViewport.scale > 1.05) return; // zoomed in: user is panning
      handler.current(dx < 0 ? "left" : "right", s.target);
    };

    const onCancel = () => {
      start = null;
    };

    root.addEventListener("touchstart", onStart, { passive: true });
    root.addEventListener("touchmove", onMove, { passive: true });
    root.addEventListener("touchend", onEnd, { passive: true });
    root.addEventListener("touchcancel", onCancel, { passive: true });
    return () => {
      root.removeEventListener("touchstart", onStart);
      root.removeEventListener("touchmove", onMove);
      root.removeEventListener("touchend", onEnd);
      root.removeEventListener("touchcancel", onCancel);
    };
  }, [ref, enabled]);
}

/** Short vibration on Android; silently does nothing elsewhere. */
export function haptic(ms = 8) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(ms);
  } catch {
    // ignore
  }
}

/** Brief slide-in so a day change by swipe or arrow key reads as movement. */
export function slideIn(el: HTMLElement | null, from: "left" | "right") {
  if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  el.animate(
    [
      { transform: `translateX(${from === "right" ? 28 : -28}px)`, opacity: 0.35 },
      { transform: "none", opacity: 1 },
    ],
    { duration: 240, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
  );
}
