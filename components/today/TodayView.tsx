"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Icon } from "@/components/Icons";
import PageHeader from "@/components/PageHeader";
import Sheet from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import { dayLabel, longDate, resolveDate, toKey } from "@/lib/dates";
import {
  addWater,
  entriesFor,
  entryTotals,
  logFood,
  quickFoods,
  removeEntry,
  restoreEntry,
  undoWater,
  useStore,
  waterFor,
  type Entry,
  type Food,
} from "@/lib/store";
import { useToday } from "@/lib/useToday";
import EntryForm from "./EntryForm";
import FoodLog from "./FoodLog";
import QuickAdd from "./QuickAdd";
import SummaryCard from "./SummaryCard";
import TodaySkeleton from "./TodaySkeleton";
import WaterCard from "./WaterCard";
import WeekStrip from "./WeekStrip";

export default function TodayView() {
  const s = useStore();
  const today = useToday();
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();

  const [editing, setEditing] = useState<Entry | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editKey, setEditKey] = useState(0);
  const closeEdit = useCallback(() => setEditOpen(false), []);

  if (!s.ready || !today) return <TodaySkeleton />;

  const todayKey = toKey(today);
  const date = resolveDate(params.get("date"), todayKey);
  const isToday = date === todayKey;
  const entries = entriesFor(s, date);
  const water = waterFor(s, date);
  const libraryHref = isToday ? "/library" : `/library?date=${date}`;

  const select = (k: string) => router.replace(k === todayKey ? "/" : `/?date=${k}`, { scroll: false });

  const remove = (e: Entry) => {
    removeEntry(e.id);
    toast.show(`${e.name} removed`, { icon: "trash", action: { label: "Undo", onClick: () => restoreEntry(e) } });
  };

  const add = (f: Food) => {
    const entry = logFood(f, date);
    toast.show(`${f.name} added`, { action: { label: "Undo", onClick: () => removeEntry(entry.id) } });
  };

  const edit = (e: Entry) => {
    setEditing(e);
    setEditKey((k) => k + 1);
    setEditOpen(true);
  };

  return (
    <>
      <PageHeader
        eyebrow={longDate(date)}
        title={dayLabel(date, todayKey)}
        action={
          <Link href="/paste" className="btn btn-secondary btn-sm">
            <Icon name="clipboard" size={16} />
            Paste entry
          </Link>
        }
      />

      <div className="today-grid">
        <div className="area-week">
          <WeekStrip selected={date} todayKey={todayKey} onSelect={select} />
        </div>
        <div className="area-summary">
          <SummaryCard totals={entryTotals(entries)} goals={s.goals} />
        </div>
        <div className="area-side">
          <WaterCard
            total={water.total}
            goal={s.goals.waterMl}
            canUndo={water.count > 0}
            onAdd={(ml) => addWater(date, ml)}
            onUndo={() => undoWater(date)}
          />
          <QuickAdd
            foods={quickFoods(s.foods)}
            onAdd={add}
            libraryHref={libraryHref}
            libraryEmpty={s.foods.length === 0}
          />
        </div>
        <div className="area-log">
          <FoodLog entries={entries} onRemove={remove} onEdit={edit} addHref={libraryHref} />
        </div>
      </div>

      <Sheet open={editOpen} onClose={closeEdit} title="Edit entry">
        {editing ? (
          <EntryForm
            key={editKey}
            entry={editing}
            onDone={closeEdit}
            onRemove={(e) => {
              closeEdit();
              remove(e);
            }}
          />
        ) : null}
      </Sheet>

      {toast.node}
    </>
  );
}
