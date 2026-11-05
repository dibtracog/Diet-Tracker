"use client";

import { useState } from "react";
import Field, { parseNum } from "@/components/Field";
import { Icon } from "@/components/Icons";
import { round1 } from "@/lib/format";
import { addFood, updateFood, type Food } from "@/lib/store";

type Vals = { name: string; serving: string; kcal: string; protein: string; carbs: string; fat: string };

const str = (n: number | undefined) => (n === undefined ? "" : String(n));

export default function FoodForm({
  food,
  onSaved,
  onDelete,
}: {
  food?: Food;
  onSaved: (message: string) => void;
  onDelete: (food: Food) => void;
}) {
  const [v, setV] = useState<Vals>({
    name: food?.name ?? "",
    serving: food?.serving ?? "",
    kcal: str(food?.kcal),
    protein: str(food?.protein),
    carbs: str(food?.carbs),
    fat: str(food?.fat),
  });
  const [favourite, setFavourite] = useState(food?.favourite ?? false);
  const [byWeight, setByWeight] = useState(food?.unit === "g");
  const [grams, setGrams] = useState(str(food?.defaultGrams ?? (food?.unit === "g" ? 100 : undefined)));
  const [error, setError] = useState("");
  const [armed, setArmed] = useState(false);

  const set = (k: keyof Vals) => (e: React.ChangeEvent<HTMLInputElement>) => setV((p) => ({ ...p, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = v.name.trim();
    if (!name) return setError("Give the food a name.");
    const kcal = parseNum(v.kcal, NaN);
    if (!(kcal >= 0)) return setError("Calories must be a number, 0 or more.");
    const protein = parseNum(v.protein);
    const carbs = parseNum(v.carbs);
    const fat = parseNum(v.fat);
    if (![protein, carbs, fat].every((n) => n >= 0)) return setError("Protein, carbs and fat must be numbers, 0 or more.");

    const usual = grams.trim() ? Math.round(parseNum(grams, NaN)) : 100;
    if (byWeight && !(usual > 0 && usual <= 5000)) return setError("Usual portion should be in grams, e.g. 150.");

    const input = {
      name,
      serving: byWeight ? "100 g" : v.serving.trim() || "1 serving",
      kcal: round1(kcal),
      protein: round1(protein),
      carbs: round1(carbs),
      fat: round1(fat),
      favourite,
      unit: byWeight ? ("g" as const) : undefined,
      defaultGrams: byWeight ? usual : undefined,
    };
    if (food) {
      updateFood(food.id, input);
      onSaved(`${name} saved`);
    } else {
      addFood(input);
      onSaved(`${name} added to your library`);
    }
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      <Field label="Name" value={v.name} onChange={set("name")} placeholder="e.g. Dal tadka" autoComplete="off" />
      <div className="seg" role="radiogroup" aria-label="How you log it" style={{ marginBottom: 0 }}>
        <button type="button" role="radio" aria-checked={!byWeight} className={!byWeight ? "is-active" : ""} onClick={() => setByWeight(false)}>
          By serving
        </button>
        <button type="button" role="radio" aria-checked={byWeight} className={byWeight ? "is-active" : ""} onClick={() => setByWeight(true)}>
          By weight (per 100 g)
        </button>
      </div>
      {byWeight ? (
        <>
          <p className="fineprint" style={{ margin: 0 }}>
            Enter the numbers for 100 g, as printed on the pack. You log it in grams, and one tap logs your usual portion.
          </p>
          <Field
            label="Usual portion"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
            inputMode="numeric"
            placeholder="100"
            suffix="g"
          />
        </>
      ) : (
        <Field label="One serving is" value={v.serving} onChange={set("serving")} placeholder="e.g. 1 bowl, 2 rotis" autoComplete="off" />
      )}
      {byWeight ? <div className="field-label" style={{ marginBottom: -6 }}>Per 100 g</div> : null}
      <div className="grid-2">
        <Field label="Calories" value={v.kcal} onChange={set("kcal")} inputMode="decimal" placeholder="0" suffix="kcal" />
        <Field label="Protein" value={v.protein} onChange={set("protein")} inputMode="decimal" placeholder="0" suffix="g" />
        <Field label="Carbs" value={v.carbs} onChange={set("carbs")} inputMode="decimal" placeholder="0" suffix="g" />
        <Field label="Fat" value={v.fat} onChange={set("fat")} inputMode="decimal" placeholder="0" suffix="g" />
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
          {food ? "Save" : "Add food"}
        </button>
      </div>
    </form>
  );
}
