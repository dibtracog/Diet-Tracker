import Link from "next/link";
import { Icon } from "@/components/Icons";
import Thumb from "@/components/Thumb";
import { dayLabel } from "@/lib/dates";
import type { PendingMeal } from "@/lib/store";

/** Photo meals that still need their nutrition filled in. */
export default function PendingMeals({
  meals,
  todayKey,
  onRemove,
}: {
  meals: PendingMeal[];
  todayKey: string;
  onRemove: (meal: PendingMeal) => void;
}) {
  if (!meals.length) return null;
  const sorted = [...meals].sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

  return (
    <section className="card pending" aria-label="Needs details">
      <div className="meal-head">
        <span className="meal-icon pending-icon">
          <Icon name="camera" size={20} />
        </span>
        <div className="meal-title">
          <div className="meal-name">Needs details</div>
          <div className="meal-meta">
            {meals.length} photo meal{meals.length > 1 ? "s" : ""} waiting to be filled in
          </div>
        </div>
      </div>
      <div className="meal-body">
        {sorted.map((m) => (
          <div key={m.id} className="row">
            <Thumb photoId={m.photoId} size={48} />
            <div className="row-main">
              <div className="row-title">{m.note || "Photo meal"}</div>
              <div className="row-sub num">
                {dayLabel(m.date, todayKey)} · {m.time}
              </div>
            </div>
            <Link href={`/paste?pending=${m.id}`} className="btn btn-primary btn-sm">
              Fill in
            </Link>
            <button type="button" className="icon-btn del" onClick={() => onRemove(m)} aria-label="Discard photo meal">
              <Icon name="trash" size={18} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
