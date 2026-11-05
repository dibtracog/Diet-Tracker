"use client";

import Link from "next/link";
import AddButton from "@/components/AddButton";
import { fmt } from "@/lib/format";
import type { QuickItem } from "@/lib/quick";
import { comboItems, itemTotals, type Combo, type Food } from "@/lib/store";

export default function QuickAdd({
  items,
  foods,
  onAddFood,
  onAddCombo,
  libraryHref,
  libraryEmpty,
}: {
  items: QuickItem[];
  foods: Food[];
  onAddFood: (food: Food) => void;
  onAddCombo: (combo: Combo) => void;
  libraryHref: string;
  libraryEmpty: boolean;
}) {
  const anyUsual = items.some((i) => i.usual);
  return (
    <section className="card card-pad" aria-label="Quick add">
      <div className="card-head" style={{ marginBottom: 4 }}>
        <div>
          <div className="card-title">Quick add</div>
          {anyUsual ? <div className="card-sub">Your usuals for this time</div> : null}
        </div>
        <Link href={libraryHref} className="btn btn-ghost btn-sm">
          See library
        </Link>
      </div>
      {items.length ? (
        <div>
          {items.map((item) => {
            if (item.kind === "combo") {
              const list = comboItems(item.combo, foods);
              const t = itemTotals(list);
              return (
                <div key={`c${item.id}`} className="row">
                  <div className="row-main">
                    <div className="row-title">{item.combo.name}</div>
                    <div className="row-sub">
                      <span className="combo-tag">Combo</span> · {list.length} item{list.length === 1 ? "" : "s"} · <span className="num">{fmt(t.kcal)} kcal</span>
                      {item.usual ? <span className="usual"> · usually {item.usual}</span> : null}
                    </div>
                  </div>
                  <AddButton label={`Add ${item.combo.name}`} onAdd={() => onAddCombo(item.combo)} />
                </div>
              );
            }
            const f = item.food;
            return (
              <div key={`f${item.id}`} className="row">
                <div className="row-main">
                  <div className="row-title">{f.name}</div>
                  <div className="row-sub">
                    {f.serving} · <span className="num">{fmt(f.kcal)} kcal</span>
                    {item.usual ? <span className="usual"> · usually {item.usual}</span> : null}
                  </div>
                </div>
                <AddButton label={`Add ${f.name}`} onAdd={() => onAddFood(f)} />
              </div>
            );
          })}
        </div>
      ) : (
        <p className="quick-empty">
          {libraryEmpty
            ? "Add the foods you eat often to your library, then log them here in one tap."
            : "Star foods in your library and they'll show up here for one-tap logging."}
        </p>
      )}
    </section>
  );
}
