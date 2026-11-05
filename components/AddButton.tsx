"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icons";
import { haptic } from "@/lib/useSwipe";

/** Round "+" button that briefly flips to a check mark after a tap. */
export default function AddButton({ onAdd, label }: { onAdd: () => void; label: string }) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(() => setDone(false), 1200);
    return () => window.clearTimeout(t);
  }, [done]);

  return (
    <button
      type="button"
      className={`add-btn ${done ? "is-done" : ""}`}
      aria-label={label}
      onClick={() => {
        setDone(true);
        haptic();
        onAdd();
      }}
    >
      <Icon name={done ? "check" : "plus"} size={18} strokeWidth={2.2} />
    </button>
  );
}
