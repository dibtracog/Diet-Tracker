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
import { deleteFood, logFood, removeEntry, restoreFood, toggleFavourite, useStore, type Food } from "@/lib/store";
import { useToday } from "@/lib/useToday";
import FoodForm from "./FoodForm";

const FILTERS = ["All", "Favourites", "Most used"] as const;
type Filter = (typeof FILTERS)[number];

export default function LibraryView() {
  const s = useStore();
  const today = useToday();
  const params = useSearchParams();
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Food | null>(null);
  const [formKey, setFormKey] = useState(0);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = s.foods.filter((f) => f.name.toLowerCase().includes(q));
    if (filter === "Favourites") list = list.filter((f) => f.favourite);
    if (filter === "Most used") list = [...list].sort((a, b) => b.uses - a.uses);
    else list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [s.foods, query, filter]);

  const todayKey = today ? toKey(today) : null;
  const date = todayKey ? resolveDate(params.get("date"), todayKey) : null;
  const isToday = date === todayKey;

  const openForm = (food: Food | null) => {
    setEditing(food);
    setFormKey((k) => k + 1);
    setSheetOpen(true);
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
            New food
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
      ) : s.foods.length === 0 ? (
        <div className="card empty-cta">
          <span className="empty-icon">
            <Icon name="library" size={24} />
          </span>
          <div className="empty-title">Your library is empty</div>
          <div>Save the foods you eat regularly with their calories and macros, then log them in one tap.</div>
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

          {items.length ? (
            <div className="food-grid">
              {items.map((f) => (
                <article key={f.id} className="card food-card">
                  <div className="food-top">
                    <button type="button" className="food-hit" onClick={() => openForm(f)} aria-label={`Edit ${f.name}`}>
                      <div className="food-name">{f.name}</div>
                      <div className="food-serving">{f.serving}</div>
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
              <div>{query ? `No foods match “${query}”.` : "No favourites yet. Tap the star on a food."}</div>
            </div>
          )}
        </>
      )}

      <Sheet open={sheetOpen} onClose={closeSheet} title={editing ? "Edit food" : "New food"}>
        <FoodForm
          key={formKey}
          food={editing ?? undefined}
          onSaved={(msg) => {
            closeSheet();
            toast.show(msg);
          }}
          onDelete={del}
        />
      </Sheet>

      {toast.node}
    </>
  );
}
