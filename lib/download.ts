import { round1 } from "./format";
import type { Data } from "./store";

export function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const cell = (v: unknown) => {
  const s = v === undefined || v === null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** One row per logged dish, with totals for the amount eaten. Opens in Excel / Google Sheets. */
export function logToCsv(d: Data): string {
  const header = ["date", "time", "name", "serving", "servings", "kcal", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "sodium_mg", "notes"];
  const rows = [...d.entries]
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .map((e) => {
      const x = (n: number | undefined) => (n === undefined ? "" : round1(n * e.servings));
      return [e.date, e.time, e.name, e.serving, e.servings, x(e.kcal), x(e.protein), x(e.carbs), x(e.fat), x(e.fiber), x(e.sugar), x(e.sodium), e.notes ?? ""];
    });
  // Leading BOM so Excel reads non-English characters correctly.
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
}
