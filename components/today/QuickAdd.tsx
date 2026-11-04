"use client";

import Link from "next/link";
import AddButton from "@/components/AddButton";
import { fmt, type Food } from "@/lib/mock";

export default function QuickAdd({ foods, onAdd }: { foods: Food[]; onAdd: (food: Food) => void }) {
  return (
    <section className="card card-pad" aria-label="Quick add">
      <div className="card-head" style={{ marginBottom: 4 }}>
        <div className="card-title">Quick add</div>
        <Link href="/library" className="btn btn-ghost btn-sm">
          See library
        </Link>
      </div>
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
    </section>
  );
}
