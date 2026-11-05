"use client";

import { useMemo, useState } from "react";
import Field from "@/components/Field";
import { Icon } from "@/components/Icons";
import { fmt, round1 } from "@/lib/format";
import {
  addCombo,
  comboItemFrom,
  comboItems,
  itemTotals,
  updateCombo,
  type Combo,
  type ComboItem,
  type Food,
} from "@/lib/store";

type Row = ComboItem & { key: string };

let keySeq = 0;
const withKey = (i: ComboItem): Row => ({ ...i, key: `c${++keySeq}` });

const STEP = 0.5;

export default function ComboForm({
  combo,
  foods,
  onSaved,
  onDelete,
}: {
  combo?: Combo;
  foods: Food[];
  onSaved: (message: string) => void;
  onDelete: (combo: Combo) => void;
}) {
  const [name, setName] = useState(combo?.name ?? "");
  const [items, setItems] = useState<Row[]>(() => (combo ? comboItems(combo, foods) : []).map(withKey));
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [armed, setArmed] = useState(false);

  const t = itemTotals(items);

  const choices = useMemo(() => {
    const q = query.trim().toLowerCase();
    return foods
      .filter((f) => f.name.toLowerCase().includes(q))
      .sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name));
  }, [foods, query]);

  const addItem = (f: Food) => {
    setItems((list) => {
      const existing = list.find((i) => i.foodId === f.id);
      return existing
        ? list.map((i) => (i.key === existing.key ? { ...i, servings: round1(i.servings + 1) } : i))
        : [...list, withKey(comboItemFrom(f))];
    });
    setQuery("");
    setPicking(false);
  };

  const setServings = (key: string, servings: number) =>
    setItems((list) => list.map((i) => (i.key === key ? { ...i, servings: Math.max(STEP, round1(servings)) } : i)));

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Give the combo a name.");
    if (!items.length) return setError("Add at least one food.");
    const list = items.map(({ key: _key, ...item }) => item);
    if (combo) {
      updateCombo(combo.id, { name: name.trim(), items: list });
      onSaved(`${name.trim()} saved`);
    } else {
      addCombo(name.trim(), list);
      onSaved(`${name.trim()} added to your library`);
    }
  };

  if (picking) {
    return (
      <div className="form">
        <div className="search">
          <Icon name="search" size={18} />
          <input
            type="search"
            placeholder="Search your library"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search your library"
            autoFocus
          />
        </div>
        <div className="pick-list">
          {choices.length ? (
            choices.map((f) => (
              <button key={f.id} type="button" className="row pick-row" onClick={() => addItem(f)}>
                <span className="row-main">
                  <span className="row-title" style={{ display: "block" }}>
                    {f.name}
                  </span>
                  <span className="row-sub num" style={{ display: "block" }}>
                    {f.serving} · {fmt(f.kcal)} kcal
                  </span>
                </span>
                <span className="add-btn">
                  <Icon name="plus" size={18} strokeWidth={2.2} />
                </span>
              </button>
            ))
          ) : (
            <p className="quick-empty">{foods.length ? "No foods match." : "Your library is empty."}</p>
          )}
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setPicking(false)}>
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={save} noValidate>
      <p className="sheet-text" style={{ marginBottom: 0 }}>
        Foods you often have together. Logging a combo adds each food to your log on its own, so you can still
        change or remove one.
      </p>
      <Field label="Combo name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Usual breakfast" autoComplete="off" />

      <div className="field">
        <span className="field-label">Foods</span>
        {items.length ? (
          <div className="ing-list">
            {items.map((i) => (
              <div key={i.key} className="row ing-row">
                <div className="row-main">
                  <div className="row-title">{i.name}</div>
                  <div className="row-sub num">
                    {i.servings} × {i.serving} · {fmt(i.kcal * i.servings)} kcal
                  </div>
                </div>
                <div className="mini-stepper">
                  <button type="button" onClick={() => setServings(i.key, i.servings - STEP)} disabled={i.servings <= STEP} aria-label={`Less ${i.name}`}>
                    <Icon name="minus" size={16} strokeWidth={2.2} />
                  </button>
                  <span className="num">{i.servings}</span>
                  <button type="button" onClick={() => setServings(i.key, i.servings + STEP)} aria-label={`More ${i.name}`}>
                    <Icon name="plus" size={16} strokeWidth={2.2} />
                  </button>
                </div>
                <button
                  type="button"
                  className="icon-btn del"
                  style={{ opacity: 1 }}
                  onClick={() => setItems((list) => list.filter((x) => x.key !== i.key))}
                  aria-label={`Remove ${i.name}`}
                >
                  <Icon name="x" size={18} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="quick-empty">Add foods from your library, e.g. oats, banana and coffee.</p>
        )}
        <button type="button" className="btn btn-secondary btn-block" onClick={() => setPicking(true)} style={{ marginTop: 6 }}>
          <Icon name="plus" size={16} strokeWidth={2.2} />
          Add food
        </button>
      </div>

      <div>
        <div className="field-label" style={{ marginBottom: 6 }}>
          Total
        </div>
        <div className="preview-macros num">
          <div className="pm">
            <b>{fmt(t.kcal)}</b>
            <span>kcal</span>
          </div>
          <div className="pm">
            <b>{fmt(t.protein)}g</b>
            <span>protein</span>
          </div>
          <div className="pm">
            <b>{fmt(t.carbs)}g</b>
            <span>carbs</span>
          </div>
          <div className="pm">
            <b>{fmt(t.fat)}g</b>
            <span>fat</span>
          </div>
        </div>
      </div>

      {error ? <div className="form-error" role="alert">{error}</div> : null}

      <div className="form-actions">
        {combo ? (
          <button
            type="button"
            className={`btn btn-danger ${armed ? "is-armed" : ""}`}
            onClick={() => (armed ? onDelete(combo) : setArmed(true))}
          >
            <Icon name="trash" size={16} />
            {armed ? "Tap to confirm" : "Delete"}
          </button>
        ) : null}
        <button type="submit" className="btn btn-primary">
          {combo ? "Save" : "Save combo"}
        </button>
      </div>
    </form>
  );
}
