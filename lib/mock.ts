/**
 * TEMPORARY sample data so the layout can be reviewed.
 * Replaced by real stored data in a later step.
 */

export type Macros = { kcal: number; protein: number; carbs: number; fat: number };

export type Food = Macros & {
  id: string;
  name: string;
  serving: string;
  favourite?: boolean;
  uses?: number;
};

export type Entry = Macros & {
  id: string;
  name: string;
  serving: string;
  /** "HH:MM" in 24h time; the day's log is ordered by this. */
  time: string;
};

export const targets = { kcal: 2200, protein: 140, carbs: 250, fat: 70, waterMl: 3000 };

export const library: Food[] = [
  { id: "f1", name: "Poha", serving: "1 plate", kcal: 270, protein: 6, carbs: 46, fat: 7, uses: 24, favourite: true },
  { id: "f2", name: "Masala chai", serving: "1 cup", kcal: 90, protein: 3, carbs: 12, fat: 3, uses: 41 },
  { id: "f3", name: "Rajma chawal", serving: "1 plate", kcal: 480, protein: 17, carbs: 82, fat: 9, uses: 12 },
  { id: "f4", name: "Curd", serving: "1 bowl", kcal: 100, protein: 6, carbs: 8, fat: 5, uses: 18 },
  { id: "f5", name: "Whey protein", serving: "1 scoop, in water", kcal: 120, protein: 24, carbs: 3, fat: 2, uses: 33, favourite: true },
  { id: "f6", name: "Banana", serving: "1 medium", kcal: 105, protein: 1, carbs: 27, fat: 0, uses: 20, favourite: true },
  { id: "f7", name: "Masala omelette", serving: "2 eggs", kcal: 220, protein: 14, carbs: 4, fat: 16, uses: 27, favourite: true },
  { id: "f8", name: "Roti", serving: "1 medium", kcal: 110, protein: 3, carbs: 18, fat: 3, uses: 52 },
  { id: "f9", name: "Dal tadka", serving: "1 bowl", kcal: 190, protein: 10, carbs: 24, fat: 6, uses: 30 },
  { id: "f10", name: "Paneer bhurji", serving: "1 bowl", kcal: 320, protein: 18, carbs: 8, fat: 24, uses: 9 },
  { id: "f11", name: "Chicken curry", serving: "1 bowl", kcal: 300, protein: 28, carbs: 8, fat: 17, uses: 14 },
  { id: "f12", name: "Oats with milk", serving: "1 bowl", kcal: 260, protein: 11, carbs: 40, fat: 6, uses: 11 },
];

export const todayEntries: Entry[] = [
  { id: "e1", time: "08:40", name: "Poha", serving: "1 plate", kcal: 270, protein: 6, carbs: 46, fat: 7 },
  { id: "e2", time: "08:45", name: "Masala chai", serving: "1 cup", kcal: 90, protein: 3, carbs: 12, fat: 3 },
  { id: "e3", time: "13:20", name: "Rajma chawal", serving: "1 plate", kcal: 480, protein: 17, carbs: 82, fat: 9 },
  { id: "e4", time: "13:21", name: "Curd", serving: "1 bowl", kcal: 100, protein: 6, carbs: 8, fat: 5 },
  { id: "e5", time: "17:05", name: "Whey protein", serving: "1 scoop, in water", kcal: 120, protein: 24, carbs: 3, fat: 2 },
  { id: "e6", time: "17:06", name: "Banana", serving: "1 medium", kcal: 105, protein: 1, carbs: 27, fat: 0 },
];

/** Sample history: [kcal, protein, waterMl] for the previous days, most recent first. */
export const pastDays: [number, number, number][] = [
  [2140, 128, 3000],
  [1985, 112, 2500],
  [2410, 146, 2750],
  [2210, 135, 3250],
  [1760, 98, 2000],
  [2290, 141, 3000],
  [2050, 120, 2250],
];

export function totals(entries: Macros[]): Macros {
  return entries.reduce(
    (t, e) => ({
      kcal: t.kcal + e.kcal,
      protein: t.protein + e.protein,
      carbs: t.carbs + e.carbs,
      fat: t.fat + e.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export const fmt = (n: number) => Math.round(n).toLocaleString("en-IN");
