/** 1234.6 -> "1,235" */
export const fmt = (n: number) => Math.round(n).toLocaleString("en-IN");

/** Rounds to at most one decimal: 12.345 -> 12.3, 12 -> 12 */
export const round1 = (n: number) => Math.round(n * 10) / 10;

/** "2 × 1 roti" style label for an entry's portion. */
export function portion(serving: string, servings: number): string {
  return servings === 1 ? serving : `${round1(servings)} × ${serving}`;
}
