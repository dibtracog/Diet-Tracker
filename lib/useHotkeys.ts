"use client";

import { useEffect, useRef } from "react";

/**
 * Keyboard shortcuts. Keys are KeyboardEvent.key values ("ArrowLeft", "n", "?"),
 * optionally prefixed with "shift+" for Shift + a non-character key.
 *
 * Shortcuts are ignored while typing in a field, while a sheet is open (Escape
 * closes those), and when Ctrl / Cmd / Alt is held, so browser shortcuts keep working.
 */
export type Hotkeys = Record<string, (e: KeyboardEvent) => void>;

export function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

export const sheetOpen = () => !!document.querySelector(".sheet-root.is-open");

export function useHotkeys(keys: Hotkeys, enabled = true) {
  // Always call the latest handlers without re-attaching the listener.
  const ref = useRef(keys);
  ref.current = keys;

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (isTyping(e.target) || sheetOpen()) return;
      const map = ref.current;
      // Printable keys already carry Shift in e.key ("?" vs "/"); Caps Lock still matches.
      const handler =
        e.key.length === 1
          ? (map[e.key] ?? (e.shiftKey ? undefined : map[e.key.toLowerCase()]))
          : map[e.shiftKey ? `shift+${e.key}` : e.key];
      if (!handler) return;
      e.preventDefault();
      handler(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}
