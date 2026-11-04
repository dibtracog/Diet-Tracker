"use client";

import { useMemo, useState } from "react";
import AddButton from "@/components/AddButton";
import { Icon } from "@/components/Icons";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/components/Toast";
import { fmt, library } from "@/lib/mock";

const FILTERS = ["All", "Favourites", "Most used"] as const;
type Filter = (typeof FILTERS)[number];

export default function LibraryPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [favs, setFavs] = useState(() => new Set(library.filter((f) => f.favourite).map((f) => f.id)));
  const toast = useToast();

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = library.filter((f) => f.name.toLowerCase().includes(q));
    if (filter === "Favourites") list = list.filter((f) => favs.has(f.id));
    if (filter === "Most used") list = [...list].sort((a, b) => (b.uses ?? 0) - (a.uses ?? 0));
    return list;
  }, [query, filter, favs]);

  const toggleFav = (id: string) =>
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <PageHeader
        eyebrow={`${library.length} saved foods`}
        title="Library"
        action={
          <button className="btn btn-primary btn-sm" onClick={() => toast.show("Adding new foods comes next")}>
            <Icon name="plus" size={16} strokeWidth={2.2} />
            New food
          </button>
        }
      />

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
                <div style={{ minWidth: 0 }}>
                  <div className="food-name">{f.name}</div>
                  <div className="food-serving">{f.serving}</div>
                </div>
                <button
                  className={`star ${favs.has(f.id) ? "on" : ""}`}
                  onClick={() => toggleFav(f.id)}
                  aria-label={favs.has(f.id) ? `Remove ${f.name} from favourites` : `Add ${f.name} to favourites`}
                  aria-pressed={favs.has(f.id)}
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
                  <span className="mp">P {f.protein}g</span>
                  <span className="mp">C {f.carbs}g</span>
                  <span className="mp">F {f.fat}g</span>
                </div>
                <AddButton label={`Add ${f.name} to today`} onAdd={() => toast.show(`${f.name} added to today`)} />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="card empty">
          <Icon name="search" size={28} />
          <div>No foods match “{query}”.</div>
        </div>
      )}

      {toast.node}
    </>
  );
}
