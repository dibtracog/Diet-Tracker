"use client";

import { useState } from "react";
import { Icon } from "@/components/Icons";
import { fmt } from "@/lib/mock";

const SEGMENTS = 12;

export default function WaterCard({ goal, initial = 0 }: { goal: number; initial?: number }) {
  const [log, setLog] = useState<number[]>(initial ? [initial] : []);
  const total = log.reduce((a, b) => a + b, 0);
  const filled = Math.min(SEGMENTS, Math.round((total / goal) * SEGMENTS));
  const add = (ml: number) => setLog((l) => [...l, ml]);
  const undo = () => setLog((l) => l.slice(0, -1));

  return (
    <section className="card card-pad" id="water" aria-label="Water">
      <div className="card-head" style={{ marginBottom: 6 }}>
        <div>
          <div className="card-sub">Water</div>
          <div className="water-amount num">
            {fmt(total)} <span>/ {fmt(goal)} ml</span>
          </div>
        </div>
        <span className="water-icon">
          <Icon name="droplet" size={20} />
        </span>
      </div>

      <div
        className="water-segs"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={total}
        aria-label="Water progress"
      >
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span key={i} className={`water-seg ${i < filled ? "on" : ""}`} />
        ))}
      </div>

      <div className="water-actions">
        <button className="btn" onClick={() => add(250)}>
          +250 ml
        </button>
        <button className="btn" onClick={() => add(500)}>
          +500 ml
        </button>
        <button className="btn" onClick={() => add(1000)}>
          +1 L
        </button>
        <button className="icon-btn" onClick={undo} disabled={log.length === 0} aria-label="Undo last water entry">
          <Icon name="undo" size={18} />
        </button>
      </div>
    </section>
  );
}
