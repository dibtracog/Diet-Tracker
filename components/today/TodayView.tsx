"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import { targets, totals, type Entry, type Food } from "@/lib/mock";
import FoodLog from "./FoodLog";
import QuickAdd from "./QuickAdd";
import SummaryCard from "./SummaryCard";
import WaterCard from "./WaterCard";
import WeekStrip from "./WeekStrip";

const byTime = (a: Entry, b: Entry) => a.time.localeCompare(b.time);

/** Owns the day's entries so the summary updates as dishes are added or removed. */
export default function TodayView({ initialEntries, favourites }: { initialEntries: Entry[]; favourites: Food[] }) {
  const [entries, setEntries] = useState<Entry[]>(() => [...initialEntries].sort(byTime));
  const toast = useToast();

  const remove = (entry: Entry) => {
    setEntries((list) => list.filter((e) => e.id !== entry.id));
    toast.show(`${entry.name} removed`, {
      icon: "trash",
      action: {
        label: "Undo",
        onClick: () => setEntries((list) => [...list, entry].sort(byTime)),
      },
    });
  };

  const add = (food: Food) => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const entry: Entry = {
      id: `${food.id}-${now.getTime()}`,
      name: food.name,
      serving: food.serving,
      kcal: food.kcal,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      time,
    };
    setEntries((list) => [...list, entry].sort(byTime));
    toast.show(`${food.name} added`);
  };

  return (
    <div className="today-grid">
      <div className="area-week">
        <WeekStrip />
      </div>
      <div className="area-summary">
        <SummaryCard totals={totals(entries)} targets={targets} />
      </div>
      <div className="area-side">
        <WaterCard goal={targets.waterMl} initial={1250} />
        <QuickAdd foods={favourites} onAdd={add} />
      </div>
      <div className="area-log">
        <FoodLog entries={entries} onRemove={remove} />
      </div>
      {toast.node}
    </div>
  );
}
