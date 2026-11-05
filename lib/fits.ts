import { foodPortion } from "./format";
import { comboItems, defaultServings, entriesFor, entryTotals, itemTotals, type Combo, type Data, type Food } from "./store";

/**
 * "What fits?": library foods and combos (at their one-tap portion) that fit in
 * the calories left today. While protein is still short, the most protein per
 * calorie comes first; once it's met, the foods you log most.
 */

export type Fit =
  | { kind: "food"; id: string; name: string; portion: string; kcal: number; protein: number; food: Food }
  | { kind: "combo"; id: string; name: string; portion: string; kcal: number; protein: number; combo: Combo };

export type Fits = { kcalLeft: number; proteinLeft: number; items: Fit[] };

/** Calories can run this far over what's left and still count as fitting. */
const SLACK = 1.05;

export function whatFits(d: Data, date: string, limit = 4): Fits {
  const t = entryTotals(entriesFor(d, date));
  const kcalLeft = d.goals.kcal - t.kcal;
  const proteinLeft = Math.max(0, d.goals.protein - t.protein);
  if (kcalLeft <= 0) return { kcalLeft, proteinLeft, items: [] };

  const uses = new Map<string, number>();
  const all: Fit[] = [
    ...d.foods.map((f): Fit => {
      const s = defaultServings(f);
      uses.set(f.id, f.uses);
      return { kind: "food", id: f.id, name: f.name, portion: foodPortion(f), kcal: f.kcal * s, protein: f.protein * s, food: f };
    }),
    ...d.combos.map((c): Fit => {
      const items = comboItems(c, d.foods);
      const tot = itemTotals(items);
      uses.set(c.id, c.uses);
      return {
        kind: "combo",
        id: c.id,
        name: c.name,
        portion: `${items.length} item${items.length === 1 ? "" : "s"}`,
        kcal: tot.kcal,
        protein: tot.protein,
        combo: c,
      };
    }),
  ];

  const fitting = all.filter((x) => x.kcal > 0 && x.kcal <= kcalLeft * SLACK);
  const needProtein = proteinLeft >= 5;
  fitting.sort((a, b) =>
    needProtein
      ? b.protein / b.kcal - a.protein / a.kcal || b.protein - a.protein
      : (uses.get(b.id) ?? 0) - (uses.get(a.id) ?? 0) || b.kcal - a.kcal,
  );
  return { kcalLeft, proteinLeft, items: fitting.slice(0, limit) };
}
