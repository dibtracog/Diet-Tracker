"use client";

import { Icon } from "@/components/Icons";
import { fmt } from "@/lib/format";

const SEGMENTS = 12;

export default function WaterCard({
  total,
  goal,
  canUndo,
  onAdd,
  onUndo,
  onOpenLog,
}: {
  total: number;
  goal: number;
  canUndo: boolean;
  onAdd: (ml: number) => void;
  onUndo: () => void;
  onOpenLog: () => void;
}) {
  const filled = goal > 0 ? Math.min(SEGMENTS, Math.round((total / goal) * SEGMENTS)) : 0;

  return (
    <section className="card card-pad" id="water" aria-label="Water">
      <div className="card-head" style={{ marginBottom: 6 }}>
        <div>
          <div className="card-sub">Water</div>
          <div className="water-amount num">
            {fmt(total)} <span>/ {fmt(goal)} ml</span>
          </div>
        </div>
        <button type="button" className="water-icon" onClick={onOpenLog} aria-label="See water entries">
          <Icon name="droplet" size={20} />
        </button>
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
        <button className="btn" onClick={() => onAdd(250)}>
          +250 ml
        </button>
        <button className="btn" onClick={() => onAdd(500)}>
          +500 ml
        </button>
        <button className="btn" onClick={() => onAdd(1000)}>
          +1 L
        </button>
        <button className="icon-btn" onClick={onOpenLog} aria-label="Add a custom amount" title="Custom amount">
          <Icon name="plus" size={18} />
        </button>
        <button className="icon-btn" onClick={onUndo} disabled={!canUndo} aria-label="Undo last water entry">
          <Icon name="undo" size={18} />
        </button>
      </div>
    </section>
  );
}
