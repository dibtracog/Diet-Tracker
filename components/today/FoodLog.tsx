import Link from "next/link";
import { Icon } from "@/components/Icons";
import { fmt, totals, type Entry } from "@/lib/mock";

export default function FoodLog({ entries, onRemove }: { entries: Entry[]; onRemove: (e: Entry) => void }) {
  const t = totals(entries);
  return (
    <section className="card" aria-label="Food log">
      <div className="meal-head">
        <div className="meal-title">
          <div className="meal-name">Food log</div>
          <div className="meal-meta num">
            {entries.length
              ? `${entries.length} item${entries.length > 1 ? "s" : ""} · ${fmt(t.kcal)} kcal`
              : "Nothing logged yet"}
          </div>
        </div>
        <Link href="/library" className="btn btn-secondary btn-sm">
          <Icon name="plus" size={16} strokeWidth={2.2} />
          Add
        </Link>
      </div>

      {entries.length ? (
        <div className="meal-body">
          {entries.map((e) => (
            <div key={e.id} className="row">
              <div className="row-time num">{e.time}</div>
              <div className="row-main">
                <div className="row-title">{e.name}</div>
                <div className="row-sub">{e.serving}</div>
                <div className="row-macros num">
                  <span>
                    <i className="dot" style={{ background: "var(--protein)" }} />
                    {e.protein}g
                  </span>
                  <span>
                    <i className="dot" style={{ background: "var(--carbs)" }} />
                    {e.carbs}g
                  </span>
                  <span>
                    <i className="dot" style={{ background: "var(--fat)" }} />
                    {e.fat}g
                  </span>
                </div>
              </div>
              <div className="row-end">
                <div className="row-kcal num">
                  {fmt(e.kcal)}
                  <small>kcal</small>
                </div>
              </div>
              <button type="button" className="icon-btn del" onClick={() => onRemove(e)} aria-label={`Remove ${e.name}`}>
                <Icon name="trash" size={18} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="meal-empty">
          <span>Nothing logged for this day</span>
          <Link href="/library" className="btn btn-ghost btn-sm">
            Add food
          </Link>
        </div>
      )}
    </section>
  );
}
