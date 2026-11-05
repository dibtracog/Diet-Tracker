"use client";

import AddButton from "@/components/AddButton";
import { fmt } from "@/lib/format";
import type { Fit, Fits } from "@/lib/fits";

/** Library foods that fit in what's left of today's calories, protein-rich first. */
export default function WhatFits({ fits, onAdd }: { fits: Fits; onAdd: (fit: Fit) => void }) {
  return (
    <section className="card card-pad" aria-label="What fits">
      <div className="card-head" style={{ marginBottom: 4 }}>
        <div>
          <div className="card-title">What fits?</div>
          <div className="card-sub num">
            {fmt(fits.kcalLeft)} kcal left
            {fits.proteinLeft >= 1 ? ` · ${fmt(fits.proteinLeft)} g protein to go` : " · protein done"}
          </div>
        </div>
      </div>
      {fits.items.length ? (
        fits.items.map((f) => (
          <div key={`${f.kind}${f.id}`} className="row">
            <div className="row-main">
              <div className="row-title">{f.name}</div>
              <div className="row-sub num">
                {f.kind === "combo" ? <span className="combo-tag">Combo</span> : null}
                {f.kind === "combo" ? " · " : ""}
                {f.portion} · {fmt(f.kcal)} kcal · <span className="fit-protein">{fmt(f.protein)} g protein</span>
              </div>
            </div>
            <AddButton label={`Add ${f.name}`} onAdd={() => onAdd(f)} />
          </div>
        ))
      ) : (
        <p className="quick-empty" style={{ marginTop: 0 }}>
          Nothing in your library fits in {fmt(fits.kcalLeft)} kcal.
        </p>
      )}
    </section>
  );
}
