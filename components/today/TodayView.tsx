"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { cleanupPhotos } from "@/lib/photos";
import { Icon } from "@/components/Icons";
import PageHeader from "@/components/PageHeader";
import Sheet from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import { dayLabel, longDate, resolveDate, toKey } from "@/lib/dates";
import {
  addWater,
  duplicateEntry,
  entriesFor,
  entryTotals,
  logFood,
  quickFoods,
  removeEntry,
  removePendingMeal,
  removeWater,
  restoreEntry,
  restorePendingMeal,
  restoreWater,
  undoWater,
  useStore,
  waterFor,
  type Entry,
  type Food,
  type PendingMeal,
  type WaterLog,
} from "@/lib/store";
import PendingMeals from "./PendingMeals";
import WaterLogList from "./WaterLogList";

/** Removes stored photos nothing refers to, once per app session (after the Undo window). */
let photosCleaned = false;
let latest: { entries: Entry[]; pendingMeals: PendingMeal[] } = { entries: [], pendingMeals: [] };
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
  const [waterOpen, setWaterOpen] = useState(false);
  const closeWater = useCallback(() => setWaterOpen(false), []);

  useEffect(() => {
    if (!s.ready || photosCleaned) return;
    photosCleaned = true;
    const t = window.setTimeout(() => {
      // Read the latest data at that moment, not when the timer was set.
      const keep = new Set<string>();
      for (const e of latest.entries) if (e.photoId) keep.add(e.photoId);
      for (const m of latest.pendingMeals) if (m.photoId) keep.add(m.photoId);
      void cleanupPhotos(keep);
    }, 60_000);
    return () => window.clearTimeout(t);
  }, [s.ready]);
  latest = s;

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

  const logAgain = (e: Entry) => {
    closeEdit();
    const copy = duplicateEntry(e, todayKey);
    toast.show(`${e.name} logged again today`, { action: { label: "Undo", onClick: () => removeEntry(copy.id) } });
  };

  const discardPending = (m: PendingMeal) => {
    removePendingMeal(m.id);
    toast.show("Photo meal discarded", { icon: "trash", action: { label: "Undo", onClick: () => restorePendingMeal(m) } });
  };

  const dropWater = (w: WaterLog) => {
    removeWater(w.id);
    toast.show(`${w.ml} ml removed`, { icon: "trash", action: { label: "Undo", onClick: () => restoreWater(w) } });
  };

  return (
    <>
      <PageHeader
        eyebrow={longDate(date)}
        title={dayLabel(date, todayKey)}
        action={
          <Link href={isToday ? "/paste" : `/paste?date=${date}`} className="btn btn-secondary btn-sm">
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
            onOpenLog={() => setWaterOpen(true)}
          />
          <QuickAdd
            foods={quickFoods(s.foods)}
            onAdd={add}
            libraryHref={libraryHref}
            libraryEmpty={s.foods.length === 0}
          />
        </div>
        <div className="area-log log-stack">
          <PendingMeals meals={s.pendingMeals} todayKey={todayKey} onRemove={discardPending} />
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
            onLogAgain={logAgain}
          />
        ) : null}
      </Sheet>

      <Sheet open={waterOpen} onClose={closeWater} title={`Water · ${dayLabel(date, todayKey)}`}>
        <WaterLogList logs={s.water.filter((w) => w.date === date)} onRemove={dropWater} />
      </Sheet>

      {toast.node}
    </>
  );
}
