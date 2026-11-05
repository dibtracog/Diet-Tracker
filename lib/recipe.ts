import { round1 } from "./format";
import type { Food, Macros, RecipeItem } from "./store";

/** Totals for the whole pot. */
export function recipeTotals(items: RecipeItem[]): Macros {
  return items.reduce(
    (t, i) => ({
      kcal: t.kcal + i.kcal * i.amount,
      protein: t.protein + i.protein * i.amount,
      carbs: t.carbs + i.carbs * i.amount,
      fat: t.fat + i.fat * i.amount,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

/** Numbers for one serving, rounded the way the library stores them. */
export function perServing(items: RecipeItem[], makes: number): Macros {
  const t = recipeTotals(items);
  const n = makes > 0 ? makes : 1;
  return { kcal: round1(t.kcal / n), protein: round1(t.protein / n), carbs: round1(t.carbs / n), fat: round1(t.fat / n) };
}

/** An ingredient row from a library food. */
export function itemFromFood(food: Food, amount = 1): RecipeItem {
  return {
    foodId: food.id,
    name: food.name,
    serving: food.serving,
    amount,
    kcal: food.kcal,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
  };
}

/**
 * When editing, pick up any changes made to ingredient foods since the recipe
 * was saved. Ingredients whose food was deleted keep their saved numbers.
 */
export function refreshItems(items: RecipeItem[], foods: Food[]): RecipeItem[] {
  return items.map((i) => {
    const f = i.foodId ? foods.find((x) => x.id === i.foodId) : undefined;
    return f ? { ...itemFromFood(f, i.amount) } : i;
  });
}
