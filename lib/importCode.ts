/**
 * The copy/paste AI workflow, with no AI inside the app:
 *  1. buildPrompt() makes a prompt the user pastes into ANY AI with a meal photo.
 *  2. The AI replies with one JSON object (format below).
 *  3. parseImport() reads that reply with plain code and reports exactly what's wrong.
 */

import { round1 } from "./format";

export const FORMAT_VERSION = 1;

export const FORMAT_EXAMPLE = `{
  "version": 1,
  "name": "Rajma chawal with salad",
  "serving": "1 plate (about 400 g)",
  "kcal": 520,
  "protein": 18,
  "carbs": 86,
  "fat": 11,
  "fiber": 12,
  "sugar": 6,
  "sodium": 780,
  "confidence": "medium",
  "notes": "Assumed 1 cup rice and 3/4 cup rajma cooked with 1 tsp oil."
}`;

export function buildPrompt(personalNotes?: string): string {
  const notes = (personalNotes ?? "").trim();
  return `You are a nutrition estimator. I will send a photo and/or a short description of ONE dish or meal I ate. Estimate the nutrition for the whole portion shown or described.

Reply with ONLY a JSON code block in exactly this format, and nothing else:

\`\`\`json
{
  "version": 1,
  "name": "Short dish name",
  "serving": "The portion in words, e.g. 1 plate (about 350 g)",
  "kcal": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "fiber": 0,
  "sugar": 0,
  "sodium": 0,
  "confidence": "low | medium | high",
  "notes": "One short sentence on your key assumptions"
}
\`\`\`

Rules:
- Number fields must be plain numbers: no units, no ranges, no text.
- kcal is kilocalories. protein, carbs, fat, fiber and sugar are grams. sodium is milligrams.
- Values are for the ENTIRE portion I ate, not per 100 g.
- If there are several items on the plate, combine them into ONE entry and name them together (e.g. "Dal, rice and 2 rotis").
- If unsure, still give your single best estimate, set "confidence" to "low", and say what you assumed in "notes".
${notes ? `\nAbout me and how I usually eat (use this when estimating):\n${notes}\n` : ""}
My meal:`;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

export type Confidence = "low" | "medium" | "high";

export type ParsedDish = {
  name: string;
  serving: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  confidence?: Confidence;
  notes?: string;
};

export type ParseResult = { ok: true; dish: ParsedDish; warnings: string[] } | { ok: false; errors: string[] };

type Field = "name" | "serving" | "kcal" | "protein" | "carbs" | "fat" | "fiber" | "sugar" | "sodium";

/** Accept the common names different AIs use for the same thing. */
const ALIASES: Record<Field, string[]> = {
  name: ["name", "dish", "dish_name", "food", "title", "item"],
  serving: ["serving", "portion", "serving_size", "quantity", "amount"],
  kcal: ["kcal", "calories", "energy", "energy_kcal", "calories_kcal", "cal"],
  protein: ["protein", "protein_g", "proteins"],
  carbs: ["carbs", "carbohydrates", "carbohydrate", "carbs_g", "carbohydrates_g", "total_carbs"],
  fat: ["fat", "fats", "fat_g", "total_fat"],
  fiber: ["fiber", "fibre", "fiber_g", "fibre_g", "dietary_fiber"],
  sugar: ["sugar", "sugars", "sugar_g"],
  sodium: ["sodium", "sodium_mg", "salt_mg"],
};

const fail = (...errors: string[]): ParseResult => ({ ok: false, errors });

/** Smart quotes from chat apps break JSON; turn them into plain ones. */
const normalizeQuotes = (s: string) => s.replace(/[“”„″]/g, '"').replace(/[‘’′]/g, "'");

/** Finds the JSON inside a reply that may have ``` fences or chatty text around it. */
function extractJson(text: string): string | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const src = fence ? fence[1] : text;
  const start = src.search(/[[{]/);
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return src.slice(start); // unbalanced: let JSON.parse report it
}

export function parseImport(text: string): ParseResult {
  const trimmed = text.trim();
  if (!trimmed) return fail("Paste the AI's reply first.");

  const jsonText = extractJson(normalizeQuotes(trimmed));
  if (!jsonText) {
    return fail("Couldn't find any JSON in what you pasted. Copy the AI's whole code block, starting with {.");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(jsonText);
  } catch {
    try {
      // Second chance: drop trailing commas, a common AI slip.
      raw = JSON.parse(jsonText.replace(/,\s*([}\]])/g, "$1"));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown error";
      return fail(
        `The code isn't valid JSON (${msg}).`,
        "It may have been cut off while copying. Ask the AI to send just the JSON block again.",
      );
    }
  }

  if (Array.isArray(raw)) {
    if (raw.length === 1) raw = raw[0];
    else if (raw.length === 0) return fail("The code is an empty list, with no dish in it.");
    else
      return fail(
        `That code has ${raw.length} dishes, but this app takes one dish per paste.`,
        "Ask the AI to combine them into one entry, or paste them one at a time.",
      );
  }
  if (!raw || typeof raw !== "object") {
    return fail('The code should be one JSON object, like { "name": "...", "kcal": 0, ... }.');
  }

  // Lower-case keys and lift values out of nested objects like { "nutrition": { ... } }.
  const obj: Record<string, unknown> = {};
  const absorb = (o: Record<string, unknown>) => {
    for (const [k, v] of Object.entries(o)) {
      const key = k.toLowerCase().trim().replace(/[\s-]+/g, "_");
      if (v && typeof v === "object" && !Array.isArray(v)) absorb(v as Record<string, unknown>);
      else if (!(key in obj)) obj[key] = v;
    }
  };
  absorb(raw as Record<string, unknown>);

  const get = (field: Field) => {
    for (const alias of ALIASES[field]) if (alias in obj) return { key: alias, value: obj[alias] };
    return null;
  };

  const errors: string[] = [];
  const warnings: string[] = [];

  const n = get("name");
  const name = typeof n?.value === "string" ? n.value.trim() : "";
  if (!name) errors.push('Missing "name" (the dish name).');

  const sv = get("serving");
  let serving = typeof sv?.value === "string" ? sv.value.trim() : typeof sv?.value === "number" ? String(sv.value) : "";
  if (!serving) {
    serving = "1 serving";
    warnings.push('No "serving" was given, so it was set to "1 serving".');
  }

  const readNum = (field: Field, label: string, required: boolean): number | undefined => {
    const f = get(field);
    if (!f || f.value === null || f.value === "") {
      if (required) errors.push(`Missing "${field}" (${label}).`);
      return undefined;
    }
    if (typeof f.value === "number" && Number.isFinite(f.value)) {
      if (f.value < 0) {
        errors.push(`"${f.key}" can't be negative (it is ${f.value}).`);
        return undefined;
      }
      return round1(f.value);
    }
    if (typeof f.value === "string") {
      const m = f.value.replace(",", ".").match(/\d+(\.\d+)?/);
      if (m) {
        const v = round1(Number(m[0]));
        warnings.push(`"${f.key}" was written as text ("${f.value}"), so it was read as ${v}.`);
        return v;
      }
    }
    errors.push(`"${f.key}" must be a number, but it is ${JSON.stringify(f.value)}.`);
    return undefined;
  };

  const kcal = readNum("kcal", "calories", true);
  const protein = readNum("protein", "grams of protein", true);
  const carbs = readNum("carbs", "grams of carbs", true);
  const fat = readNum("fat", "grams of fat", true);
  const fiber = readNum("fiber", "grams of fiber", false);
  const sugar = readNum("sugar", "grams of sugar", false);
  const sodium = readNum("sodium", "milligrams of sodium", false);

  const version = obj.version;
  if (typeof version === "number" && version > FORMAT_VERSION) {
    warnings.push(`This code says it's format version ${version}, but this app reads version ${FORMAT_VERSION}. Check the numbers.`);
  }

  const conf = typeof obj.confidence === "string" ? obj.confidence.toLowerCase().trim() : "";
  const confidence = (["low", "medium", "high"] as const).find((c) => c === conf);
  const notes = typeof obj.notes === "string" && obj.notes.trim() ? obj.notes.trim() : undefined;

  if (errors.length || kcal === undefined || protein === undefined || carbs === undefined || fat === undefined) {
    return { ok: false, errors };
  }

  // Sanity check: protein and carbs are ~4 kcal/g, fat ~9 kcal/g.
  const fromMacros = protein * 4 + carbs * 4 + fat * 9;
  if (kcal > 0 && fromMacros > 0 && Math.abs(fromMacros - kcal) / kcal > 0.25) {
    warnings.push(
      `Calories (${kcal}) don't match the macros, which add up to about ${Math.round(fromMacros)} kcal. Double-check before saving.`,
    );
  }
  if (kcal > 4000) warnings.push(`${kcal} kcal is a lot for one dish. Check it's not a whole day's food.`);

  return {
    ok: true,
    dish: { name, serving, kcal, protein, carbs, fat, fiber, sugar, sodium, confidence, notes },
    warnings,
  };
}
