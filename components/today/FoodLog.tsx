import Link from "next/link";
import { Icon } from "@/components/Icons";
import { fmt, portion } from "@/lib/format";
import { entryTotals, type Entry } from "@/lib/store";

export default function FoodLog({
  entries,
  onRemove,
  onEdit,
  addHref,
}: {
  entries: Entry[];
  onRemove: (e: Entry) => void;
  onEdit: (e: Entry) => void;
  addHref: string;
}) {
  const t = entryTotals(entries);
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
        <Link href={addHref} className="btn btn-secondary btn-sm">
          <Icon name="plus" size={16} strokeWidth={2.2} />
          Add
        </Link>
      </div>

      {entries.length ? (
        <div className="meal-body">
          {entries.map((e) => (
            <div key={e.id} className="row">
              <button type="button" className="row-hit" onClick={() => onEdit(e)} aria-label={`Edit ${e.name}`}>
                <span className="row-time num">{e.time}</span>
                <span className="row-main">
                  <span className="row-title" style={{ display: "block" }}>
                    {e.name}
                  </span>
                  <span className="row-sub" style={{ display: "block" }}>
                    {portion(e.serving, e.servings)}
                  </span>
                  <span className="row-macros num">
                    <span>
                      <i className="dot" style={{ background: "var(--protein)" }} />
                      {fmt(e.protein * e.servings)}g
                    </span>
                    <span>
                      <i className="dot" style={{ background: "var(--carbs)" }} />
                      {fmt(e.carbs * e.servings)}g
                    </span>
                    <span>
                      <i className="dot" style={{ background: "var(--fat)" }} />
                      {fmt(e.fat * e.servings)}g
                    </span>
                  </span>
                </span>
                <span className="row-end">
                  <span className="row-kcal num">
                    {fmt(e.kcal * e.servings)}
                    <small>kcal</small>
                  </span>
                </span>
              </button>
              <button type="button" className="icon-btn del" onClick={() => onRemove(e)} aria-label={`Remove ${e.name}`}>
                <Icon name="trash" size={18} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="meal-empty">
          <span>Nothing logged for this day</span>
          <Link href={addHref} className="btn btn-ghost btn-sm">
            Add food
          </Link>
        </div>
      )}
    </section>
  );
}
