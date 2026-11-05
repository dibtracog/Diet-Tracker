import { round1 } from "./format";
import type { Food, Macros, Recipe, RecipeItem, Unit } from "./store";

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

const scale = (t: Macros, by: number): Macros => ({
  kcal: round1(t.kcal / by),
  protein: round1(t.protein / by),
  carbs: round1(t.carbs / by),
  fat: round1(t.fat / by),
});

/** Numbers for one serving, rounded the way the library stores them. */
export function perServing(items: RecipeItem[], makes: number): Macros {
  return scale(recipeTotals(items), makes > 0 ? makes : 1);
}

/**
 * What a recipe's library food stores. With a cooked weight the recipe is
 * logged by grams: numbers per 100 g, and one tap logs one serving's weight.
 * Without one, numbers are per serving.
 */
export function recipeNutrition(
  recipe: Recipe,
): Macros & { unit: Unit | undefined; defaultGrams: number | undefined; serving?: string } {
  const cooked = recipe.cookedGrams ?? 0;
  if (cooked > 0) {
    return {
      ...scale(recipeTotals(recipe.items), cooked / 100),
      unit: "g",
      defaultGrams: Math.round(cooked / Math.max(1, recipe.makes)),
      serving: "100 g",
    };
  }
  return { ...perServing(recipe.items, recipe.makes), unit: undefined, defaultGrams: undefined };
}

/** An ingredient row from a library food (a weighed food starts at its usual portion). */
export function itemFromFood(food: Food, amount?: number): RecipeItem {
  return {
    foodId: food.id,
    name: food.name,
    serving: food.serving,
    amount: amount ?? (food.unit === "g" ? (food.defaultGrams || 100) / 100 : 1),
    kcal: food.kcal,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    ...(food.unit ? { unit: food.unit } : {}),
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
