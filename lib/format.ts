/** 1234.6 -> "1,235" */
export const fmt = (n: number) => Math.round(n).toLocaleString("en-IN");

/** Rounds to at most one decimal: 12.345 -> 12.3, 12 -> 12 */
export const round1 = (n: number) => Math.round(n * 10) / 10;

/** "2 × 1 roti" style label for an entry's portion. */
export function portion(serving: string, servings: number): string {
  return servings === 1 ? serving : `${round1(servings)} × ${serving}`;
}

type Portioned = { serving: string; unit?: "g" };

/** How much was eaten: "180 g" for weighed foods, otherwise "2 × 1 roti". */
export function amountLabel(x: Portioned, servings: number): string {
  return x.unit === "g" ? `${fmt(servings * 100)} g` : portion(x.serving, servings);
}

/** A library food's one-tap portion: "180 g" for weighed foods, otherwise its serving. */
export function foodPortion(f: Portioned & { defaultGrams?: number }): string {
  return f.unit === "g" ? `${fmt(f.defaultGrams || 100)} g` : f.serving;
}

/** "12h 20m" */
export function duration(min: number): string {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? (r ? `${h}h ${r}m` : `${h}h`) : `${r}m`;
}
