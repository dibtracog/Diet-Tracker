"use client";

import Link from "next/link";
import AddButton from "@/components/AddButton";
import { fmt } from "@/lib/format";
import type { Food } from "@/lib/store";

export default function QuickAdd({
  foods,
  onAdd,
  libraryHref,
  libraryEmpty,
}: {
  foods: Food[];
  onAdd: (food: Food) => void;
  libraryHref: string;
  libraryEmpty: boolean;
}) {
  return (
    <section className="card card-pad" aria-label="Quick add">
      <div className="card-head" style={{ marginBottom: 4 }}>
        <div className="card-title">Quick add</div>
        <Link href={libraryHref} className="btn btn-ghost btn-sm">
          See library
        </Link>
      </div>
      {foods.length ? (
        <div>
          {foods.map((f) => (
            <div key={f.id} className="row">
              <div className="row-main">
                <div className="row-title">{f.name}</div>
                <div className="row-sub">
                  {f.serving} · <span className="num">{fmt(f.kcal)} kcal</span>
                </div>
              </div>
              <AddButton label={`Add ${f.name}`} onAdd={() => onAdd(f)} />
            </div>
          ))}
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
