"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import AddButton from "@/components/AddButton";
import { Icon } from "@/components/Icons";
import PageHeader from "@/components/PageHeader";
import Sheet from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import { resolveDate, shortDate, toKey } from "@/lib/dates";
import { fmt } from "@/lib/format";
import {
  comboItems,
  deleteCombo,
  deleteFood,
  itemTotals,
  logCombo,
  logFood,
  removeEntries,
  removeEntry,
  restoreCombo,
  restoreFood,
  toggleFavourite,
  useStore,
  type Combo,
  type Food,
} from "@/lib/store";
import { useToday } from "@/lib/useToday";
import ComboForm from "./ComboForm";
import FoodForm from "./FoodForm";
import RecipeForm from "./RecipeForm";

const FILTERS = ["All", "Favourites", "Recent", "Most used", "Recipes", "Combos"] as const;
type Filter = (typeof FILTERS)[number];
type Kind = "food" | "recipe" | "combo";
const KIND_LABEL: Record<Kind, string> = { food: "Single food", recipe: "Recipe", combo: "Combo" };

export default function LibraryView() {
  const s = useStore();
  const today = useToday();
  const params = useSearchParams();
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Food | null>(null);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [kind, setKind] = useState<Kind>("food");
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = s.foods.filter((f) => f.name.toLowerCase().includes(q));
    if (filter === "Favourites") list = list.filter((f) => f.favourite);
    if (filter === "Recipes") list = list.filter((f) => f.recipe);
    if (filter === "Most used") list = [...list].sort((a, b) => b.uses - a.uses);
    else if (filter === "Recent")
      list = list.filter((f) => f.lastUsedAt).sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0));
    else list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [s.foods, query, filter]);

  const todayKey = today ? toKey(today) : null;
  const date = todayKey ? resolveDate(params.get("date"), todayKey) : null;
  const isToday = date === todayKey;

  const combos = useMemo(() => {
    const q = query.trim().toLowerCase();
    return s.combos.filter((c) => c.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name));
  }, [s.combos, query]);

  const openForm = (food: Food | null, newKind: Kind = filter === "Combos" ? "combo" : "food") => {
    setEditing(food);
    setEditingCombo(null);
    setKind(food?.recipe ? "recipe" : food ? "food" : newKind);
    setFormKey((k) => k + 1);
    setSheetOpen(true);
  };
  const openCombo = (combo: Combo) => {
    setEditing(null);
    setEditingCombo(combo);
    setKind("combo");
    setFormKey((k) => k + 1);
    setSheetOpen(true);
  };
  const isRecipe = kind === "recipe";
  const isEditing = !!(editing || editingCombo);
  const sheetTitle = `${isEditing ? "Edit" : "New"} ${kind === "food" ? "food" : kind}`;

  const addCombo = (c: Combo) => {
    if (!date) return;
    const entries = logCombo(c, date);
    toast.show(`${c.name} added to ${isToday ? "today" : shortDate(date)}`, {
      action: { label: "Undo", onClick: () => removeEntries(entries.map((e) => e.id)) },
    });
  };

  const delCombo = (c: Combo) => {
    closeSheet();
    deleteCombo(c.id);
    toast.show(`${c.name} deleted`, { icon: "trash", action: { label: "Undo", onClick: () => restoreCombo(c) } });
  };

  const add = (f: Food) => {
    if (!date) return;
    const entry = logFood(f, date);
    toast.show(`${f.name} added to ${isToday ? "today" : shortDate(date)}`, {
      action: { label: "Undo", onClick: () => removeEntry(entry.id) },
    });
  };

  const del = (f: Food) => {
    closeSheet();
    deleteFood(f.id);
    toast.show(`${f.name} deleted`, { icon: "trash", action: { label: "Undo", onClick: () => restoreFood(f) } });
  };

  const ready = s.ready && date;

  return (
    <>
      <PageHeader
        eyebrow={ready ? `${s.foods.length} saved food${s.foods.length === 1 ? "" : "s"}` : " "}
        title="Library"
        action={
          <button className="btn btn-primary btn-sm" onClick={() => openForm(null)}>
            <Icon name="plus" size={16} strokeWidth={2.2} />
            New
          </button>
        }
      />

      {ready && !isToday ? (
        <div className="banner">
          <span>
            Adding to <b>{shortDate(date)}</b>
          </span>
          <Link href={`/?date=${date}`} className="btn btn-ghost btn-sm">
            Back to day
          </Link>
        </div>
      ) : null}

      {!ready ? (
        <div className="food-grid" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 118 }} />
          ))}
        </div>
      ) : s.foods.length === 0 && s.combos.length === 0 ? (
        <div className="card empty-cta">
          <span className="empty-icon">
            <Icon name="library" size={24} />
          </span>
          <div className="empty-title">Your library is empty</div>
          <div>
            Save the foods you eat regularly with their calories and macros, then log them in one tap. Once you have a
            few, combine them into recipes.
          </div>
          <button className="btn btn-primary" onClick={() => openForm(null)}>
            <Icon name="plus" size={18} strokeWidth={2.2} />
            Add your first food
          </button>
        </div>
      ) : (
        <>
          <div className="search">
            <Icon name="search" size={18} />
            <input
              type="search"
              placeholder="Search your foods"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search your foods"
            />
          </div>

          <div className="chips" role="tablist" aria-label="Filter foods">
            {FILTERS.map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={filter === f}
                className={`chip ${filter === f ? "is-active" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>

          {filter === "Combos" ? (
            combos.length ? (
              <div className="food-grid">
                {combos.map((c) => {
                  const list = comboItems(c, s.foods);
                  const t = itemTotals(list);
                  return (
                    <article key={c.id} className="card food-card">
                      <div className="food-top">
                        <button type="button" className="food-hit" onClick={() => openCombo(c)} aria-label={`Edit ${c.name}`}>
                          <div className="food-name">
                            {c.name}
                            <span className="combo-badge">Combo</span>
                          </div>
                          <div className="food-serving combo-items">{list.map((i) => i.name).join(", ")}</div>
                        </button>
                      </div>
                      <div className="food-bottom">
                        <div className="food-kcal num">
                          {fmt(t.kcal)}
                          <small>kcal</small>
                        </div>
                        <div className="macro-pills num">
                          <span className="mp">P {fmt(t.protein)}g</span>
                          <span className="mp">C {fmt(t.carbs)}g</span>
                          <span className="mp">F {fmt(t.fat)}g</span>
                        </div>
                        <AddButton label={`Log ${c.name}`} onAdd={() => addCombo(c)} />
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="card empty">
                <Icon name="layers" size={28} />
                <div>
                  {query
                    ? `No combos match “${query}”.`
                    : "No combos yet. Tap New, then Combo, or save foods from a day's log with the copy button."}
                </div>
              </div>
            )
          ) : items.length ? (
            <div className="food-grid">
              {items.map((f) => (
                <article key={f.id} className="card food-card">
                  <div className="food-top">
                    <button type="button" className="food-hit" onClick={() => openForm(f)} aria-label={`Edit ${f.name}`}>
                      <div className="food-name">
                        {f.name}
                        {f.recipe ? <span className="recipe-badge">Recipe</span> : null}
                      </div>
                      <div className="food-serving">
                        {f.serving}
                        {f.recipe
                          ? ` · ${f.recipe.items.length} ingredient${f.recipe.items.length === 1 ? "" : "s"}, makes ${f.recipe.makes}`
                          : ""}
                      </div>
                    </button>
                    <button
                      className={`star ${f.favourite ? "on" : ""}`}
                      onClick={() => toggleFavourite(f.id)}
                      aria-label={f.favourite ? `Remove ${f.name} from Quick add` : `Show ${f.name} in Quick add`}
                      aria-pressed={f.favourite}
                    >
                      <Icon name="star" size={18} />
                    </button>
                  </div>
                  <div className="food-bottom">
                    <div className="food-kcal num">
                      {fmt(f.kcal)}
                      <small>kcal</small>
                    </div>
                    <div className="macro-pills num">
                      <span className="mp">P {fmt(f.protein)}g</span>
                      <span className="mp">C {fmt(f.carbs)}g</span>
                      <span className="mp">F {fmt(f.fat)}g</span>
                    </div>
                    <AddButton label={`Log ${f.name}`} onAdd={() => add(f)} />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="card empty">
              <Icon name="search" size={28} />
              <div>
                {query
                  ? `No foods match “${query}”.`
                  : filter === "Recent"
                    ? "Nothing logged from your library yet."
                    : filter === "Recipes"
                      ? "No recipes yet. Tap New, then Recipe."
                      : "No favourites yet. Tap the star on a food."}
              </div>
            </div>
          )}
        </>
      )}

      <Sheet open={sheetOpen} onClose={closeSheet} title={sheetTitle}>
        {!isEditing ? (
          <div className="seg is-3" role="tablist" aria-label="What to add">
            {(["food", "recipe", "combo"] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={kind === k}
                className={kind === k ? "is-active" : ""}
                onClick={() => setKind(k)}
              >
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
        ) : null}
        {kind === "combo" ? (
          <ComboForm
            key={`c${formKey}`}
            combo={editingCombo ?? undefined}
            foods={s.foods}
            onSaved={(msg) => {
              closeSheet();
              toast.show(msg);
            }}
            onDelete={delCombo}
          />
        ) : isRecipe ? (
          <RecipeForm
            key={`r${formKey}`}
            food={editing ?? undefined}
            foods={s.foods}
            onSaved={(msg) => {
              closeSheet();
              toast.show(msg);
            }}
            onDelete={del}
          />
        ) : (
          <FoodForm
            key={`f${formKey}`}
            food={editing ?? undefined}
            onSaved={(msg) => {
              closeSheet();
              toast.show(msg);
            }}
            onDelete={del}
          />
        )}
      </Sheet>

      {toast.node}
    </>
  );
}
