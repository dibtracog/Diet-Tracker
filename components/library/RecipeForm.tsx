"use client";

import { useMemo, useState } from "react";
import Field, { parseNum } from "@/components/Field";
import { Icon } from "@/components/Icons";
import { fmt, round1 } from "@/lib/format";
import { itemFromFood, perServing, recipeTotals, refreshItems } from "@/lib/recipe";
import { addFood, updateFood, type Food, type RecipeItem } from "@/lib/store";

type Row = RecipeItem & { key: string };
type View = "form" | "pick" | "custom";

let keySeq = 0;
const withKey = (i: RecipeItem): Row => ({ ...i, key: `k${++keySeq}` });

const STEP = 0.5;

export default function RecipeForm({
  food,
  foods,
  onSaved,
  onDelete,
}: {
  food?: Food;
  foods: Food[];
  onSaved: (message: string) => void;
  onDelete: (food: Food) => void;
}) {
  const [name, setName] = useState(food?.name ?? "");
  const [serving, setServing] = useState(food?.serving ?? "1 bowl");
  const [makes, setMakes] = useState(food?.recipe?.makes ?? 2);
  const [items, setItems] = useState<Row[]>(() => refreshItems(food?.recipe?.items ?? [], foods).map(withKey));
  const [favourite, setFavourite] = useState(food?.favourite ?? false);
  const [view, setView] = useState<View>("form");
  const [query, setQuery] = useState("");
  const [custom, setCustom] = useState({ name: "", serving: "", kcal: "", protein: "", carbs: "", fat: "" });
  const [error, setError] = useState("");
  const [armed, setArmed] = useState(false);

  const total = recipeTotals(items);
  const per = perServing(items, makes);

  const choices = useMemo(() => {
    const q = query.trim().toLowerCase();
    return foods
      .filter((f) => f.id !== food?.id && f.name.toLowerCase().includes(q))
      .sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name));
  }, [foods, food?.id, query]);

  const addIngredient = (f: Food) => {
    setItems((list) => {
      const existing = list.find((i) => i.foodId === f.id);
      return existing
        ? list.map((i) => (i.key === existing.key ? { ...i, amount: round1(i.amount + 1) } : i))
        : [...list, withKey(itemFromFood(f))];
    });
    setQuery("");
    setView("form");
  };

  const setAmount = (key: string, amount: number) =>
    setItems((list) => list.map((i) => (i.key === key ? { ...i, amount: Math.max(STEP, round1(amount)) } : i)));

  const addCustom = () => {
    const kcal = parseNum(custom.kcal, NaN);
    const protein = parseNum(custom.protein);
    const carbs = parseNum(custom.carbs);
    const fat = parseNum(custom.fat);
    if (!custom.name.trim()) return setError("Give the ingredient a name.");
    if (![kcal, protein, carbs, fat].every((n) => n >= 0)) return setError("Ingredient numbers must be 0 or more.");
    setItems((list) => [
      ...list,
      withKey({
        name: custom.name.trim(),
        serving: custom.serving.trim() || "1 portion",
        amount: 1,
        kcal: round1(kcal),
        protein: round1(protein),
        carbs: round1(carbs),
        fat: round1(fat),
      }),
    ]);
    setCustom({ name: "", serving: "", kcal: "", protein: "", carbs: "", fat: "" });
    setError("");
    setView("form");
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Give the recipe a name.");
    if (!items.length) return setError("Add at least one ingredient.");
    const input = {
      name: name.trim(),
      serving: serving.trim() || "1 serving",
      ...per,
      favourite,
      recipe: { makes, items: items.map(({ key: _key, ...item }) => item) },
    };
    if (food) {
      updateFood(food.id, input);
      onSaved(`${input.name} saved`);
    } else {
      addFood(input);
      onSaved(`${input.name} added to your library`);
    }
  };

  // ---- Ingredient picker -------------------------------------------------
  if (view === "pick") {
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
              <button key={f.id} type="button" className="row pick-row" onClick={() => addIngredient(f)}>
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
            <p className="quick-empty">{foods.length <= (food ? 1 : 0) ? "Your library is empty." : "No foods match."}</p>
          )}
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setView("form")}>
            Back
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setView("custom")}>
            <Icon name="plus" size={16} />
            Custom ingredient
          </button>
        </div>
      </div>
    );
  }

  // ---- One-off ingredient that isn't in the library -----------------------
  if (view === "custom") {
    const set = (k: keyof typeof custom) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setCustom((c) => ({ ...c, [k]: e.target.value }));
    return (
      <div className="form">
        <p className="sheet-text" style={{ marginBottom: 0 }}>
          For things you don&apos;t keep in your library, like cooking oil or spices.
        </p>
        <Field label="Ingredient" value={custom.name} onChange={set("name")} placeholder="e.g. Mustard oil" autoFocus />
        <Field label="Amount" value={custom.serving} onChange={set("serving")} placeholder="e.g. 1 tbsp" />
        <div className="grid-2">
          <Field label="Calories" value={custom.kcal} onChange={set("kcal")} inputMode="decimal" suffix="kcal" />
          <Field label="Protein" value={custom.protein} onChange={set("protein")} inputMode="decimal" placeholder="0" suffix="g" />
          <Field label="Carbs" value={custom.carbs} onChange={set("carbs")} inputMode="decimal" placeholder="0" suffix="g" />
          <Field label="Fat" value={custom.fat} onChange={set("fat")} inputMode="decimal" placeholder="0" suffix="g" />
        </div>
        {error ? <div className="form-error" role="alert">{error}</div> : null}
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setError("");
              setView("pick");
            }}
          >
            Back
          </button>
          <button type="button" className="btn btn-primary" onClick={addCustom}>
            Add ingredient
          </button>
        </div>
      </div>
    );
  }

  // ---- Main recipe form -------------------------------------------------
  return (
    <form className="form" onSubmit={save} noValidate>
      <Field label="Recipe name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. My dal tadka" autoComplete="off" />

      <div className="field">
        <span className="field-label">Ingredients (for the whole pot)</span>
        {items.length ? (
          <div className="ing-list">
            {items.map((i) => (
              <div key={i.key} className="row ing-row">
                <div className="row-main">
                  <div className="row-title">{i.name}</div>
                  <div className="row-sub num">
                    {i.amount} × {i.serving} · {fmt(i.kcal * i.amount)} kcal
                  </div>
                </div>
                <div className="mini-stepper">
                  <button type="button" onClick={() => setAmount(i.key, i.amount - STEP)} disabled={i.amount <= STEP} aria-label={`Less ${i.name}`}>
                    <Icon name="minus" size={16} strokeWidth={2.2} />
                  </button>
                  <span className="num">{i.amount}</span>
                  <button type="button" onClick={() => setAmount(i.key, i.amount + STEP)} aria-label={`More ${i.name}`}>
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
          <p className="quick-empty">Add the foods that go into it, e.g. dal, oil, onion.</p>
        )}
        <button type="button" className="btn btn-secondary btn-block" onClick={() => setView("pick")} style={{ marginTop: 6 }}>
          <Icon name="plus" size={16} strokeWidth={2.2} />
          Add ingredient
        </button>
      </div>

      <div className="grid-2">
        <div className="field">
          <span className="field-label">Makes</span>
          <div className="mini-stepper is-large">
            <button type="button" onClick={() => setMakes((m) => Math.max(1, m - 1))} disabled={makes <= 1} aria-label="Fewer servings">
              <Icon name="minus" size={18} strokeWidth={2.2} />
            </button>
            <span className="num">
              {makes} <small>serving{makes === 1 ? "" : "s"}</small>
            </span>
            <button type="button" onClick={() => setMakes((m) => m + 1)} aria-label="More servings">
              <Icon name="plus" size={18} strokeWidth={2.2} />
            </button>
          </div>
        </div>
        <Field label="One serving is" value={serving} onChange={(e) => setServing(e.target.value)} placeholder="e.g. 1 bowl" autoComplete="off" />
      </div>

      <div>
        <div className="field-label" style={{ marginBottom: 6 }}>
          Per serving <span className="muted">· whole recipe {fmt(total.kcal)} kcal</span>
        </div>
        <div className="preview-macros num">
          <div className="pm">
            <b>{fmt(per.kcal)}</b>
            <span>kcal</span>
          </div>
          <div className="pm">
            <b>{fmt(per.protein)}g</b>
            <span>protein</span>
          </div>
          <div className="pm">
            <b>{fmt(per.carbs)}g</b>
            <span>carbs</span>
          </div>
          <div className="pm">
            <b>{fmt(per.fat)}g</b>
            <span>fat</span>
          </div>
        </div>
      </div>

      <div className="toggle-row" onClick={() => setFavourite((f) => !f)}>
        <span>Show in Quick add</span>
        <button
          type="button"
          role="switch"
          aria-checked={favourite}
          aria-label="Show in Quick add"
          className="switch"
          onClick={(e) => {
            e.stopPropagation();
            setFavourite((f) => !f);
          }}
        />
      </div>

      {error ? <div className="form-error" role="alert">{error}</div> : null}

      <div className="form-actions">
        {food ? (
          <button
            type="button"
            className={`btn btn-danger ${armed ? "is-armed" : ""}`}
            onClick={() => (armed ? onDelete(food) : setArmed(true))}
          >
            <Icon name="trash" size={16} />
            {armed ? "Tap to confirm" : "Delete"}
          </button>
        ) : null}
        <button type="submit" className="btn btn-primary">
          {food ? "Save" : "Save recipe"}
        </button>
      </div>
    </form>
  );
}
