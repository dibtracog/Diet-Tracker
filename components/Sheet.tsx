"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./Icons";

const PHONE = "(max-width: 639px)";

/** True if something between `el` and `sheet` is scrolled down (so a downward drag should scroll it, not close). */
function scrolledAncestor(el: HTMLElement | null, sheet: HTMLElement): boolean {
  for (let n = el; n && n !== sheet; n = n.parentElement) if (n.scrollTop > 0) return true;
  return sheet.scrollTop > 0;
}

/**
 * Bottom sheet on phones, centred dialog on larger screens. Stays mounted so it can animate.
 * On phones it can be dragged down to close.
 */
export default function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // Drag down to close (phones only).
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet || !open) return;
    let startY = 0;
    let startX = 0;
    let startT = 0;
    let dy = 0;
    let state: "idle" | "maybe" | "drag" = "idle";
    let target: HTMLElement | null = null;

    const reset = () => {
      sheet.style.transition = "";
      sheet.style.transform = "";
      if (backdropRef.current) backdropRef.current.style.opacity = "";
    };

    const onStart = (e: TouchEvent) => {
      if (!window.matchMedia(PHONE).matches || e.touches.length > 1) return;
      target = e.target as HTMLElement;
      if (target.closest("input, textarea, select")) return;
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      startT = Date.now();
      dy = 0;
      state = "maybe";
    };
    const onMove = (e: TouchEvent) => {
      if (state === "idle") return;
      const y = e.touches[0].clientY - startY;
      const x = e.touches[0].clientX - startX;
      if (state === "maybe") {
        if (Math.abs(y) < 8 && Math.abs(x) < 8) return;
        // Only a downward drag that isn't scrolling something.
        if (y <= 0 || Math.abs(x) > Math.abs(y) || scrolledAncestor(target, sheet)) {
          state = "idle";
          return;
        }
        state = "drag";
        sheet.style.transition = "none";
      }
      dy = Math.max(0, y);
      if (e.cancelable) e.preventDefault();
      sheet.style.transform = `translateY(${dy}px)`;
      if (backdropRef.current) backdropRef.current.style.opacity = String(Math.max(0.2, 1 - dy / 400));
    };
    const onEnd = () => {
      if (state !== "drag") {
        state = "idle";
        return;
      }
      state = "idle";
      const velocity = dy / Math.max(1, Date.now() - startT);
      if (dy > 110 || (dy > 40 && velocity > 0.6)) closeRef.current();
      reset();
    };

    sheet.addEventListener("touchstart", onStart, { passive: true });
    sheet.addEventListener("touchmove", onMove, { passive: false });
    sheet.addEventListener("touchend", onEnd);
    sheet.addEventListener("touchcancel", onEnd);
    return () => {
      sheet.removeEventListener("touchstart", onStart);
      sheet.removeEventListener("touchmove", onMove);
      sheet.removeEventListener("touchend", onEnd);
      sheet.removeEventListener("touchcancel", onEnd);
      reset();
    };
  }, [open]);

  return (
    <div className={`sheet-root ${open ? "is-open" : ""}`} inert={!open}>
      <div className="sheet-backdrop" ref={backdropRef} onClick={onClose} />
      <div className="sheet" ref={sheetRef} role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-handle" />
        <div className="sheet-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
