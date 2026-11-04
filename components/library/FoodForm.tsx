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

    const input = {
      name,
      serving: v.serving.trim() || "1 serving",
      kcal: round1(kcal),
      protein: round1(protein),
      carbs: round1(carbs),
      fat: round1(fat),
      favourite,
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
      <Field label="One serving is" value={v.serving} onChange={set("serving")} placeholder="e.g. 1 bowl, 2 rotis" autoComplete="off" />
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
