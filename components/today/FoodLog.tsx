import Link from "next/link";
import { Icon } from "@/components/Icons";
import Thumb from "@/components/Thumb";
import { fmt, portion } from "@/lib/format";
import { entryTotals, type Entry } from "@/lib/store";

export default function FoodLog({
  entries,
  onRemove,
  onEdit,
  addHref,
  onReuse,
  onCopyYesterday,
}: {
  entries: Entry[];
  onRemove: (e: Entry) => void;
  onEdit: (e: Entry) => void;
  addHref: string;
  /** Opens the copy / save-as-combo sheet for this day's foods. */
  onReuse: () => void;
  /** Shown on an empty today when yesterday has food logged. */
  onCopyYesterday?: () => void;
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
        {entries.length ? (
          <button
            type="button"
            className="btn btn-secondary btn-sm btn-icon"
            onClick={onReuse}
            aria-label="Copy these foods or save them as a combo"
            title="Copy or save as combo"
          >
            <Icon name="copy" size={16} />
          </button>
        ) : null}
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
                {e.photoId ? <Thumb photoId={e.photoId} size={44} /> : null}
                <span className="row-main">
                  <span className="row-title" style={{ display: "block" }}>
                    {e.name}
                  </span>
                  <span className="row-sub num" style={{ display: "block" }}>
                    {e.time} · {portion(e.serving, e.servings)}
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
          <span>{onCopyYesterday ? "Eating the same as yesterday?" : "Nothing logged for this day"}</span>
          {onCopyYesterday ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onCopyYesterday}>
              <Icon name="copy" size={16} />
              Copy yesterday
            </button>
          ) : (
            <Link href={addHref} className="btn btn-ghost btn-sm">
              Add food
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
