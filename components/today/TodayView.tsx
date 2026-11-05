"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useHotkeys } from "@/lib/useHotkeys";
import { haptic, slideIn, useSwipe } from "@/lib/useSwipe";
import { cleanupPhotos } from "@/lib/photos";
import { Icon } from "@/components/Icons";
import PageHeader from "@/components/PageHeader";
import Sheet from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import { addDays, dayLabel, longDate, nowTime, resolveDate, shortDate, toKey } from "@/lib/dates";
import { minutesOf, quickItems } from "@/lib/quick";
import {
  addWater,
  duplicateEntry,
  entriesFor,
  entryTotals,
  logCombo,
  logFood,
  removeEntries,
  removeEntry,
  removePendingMeal,
  removeWater,
  restoreEntry,
  restorePendingMeal,
  restoreWater,
  undoWater,
  updateWater,
  useStore,
  deleteHabit,
  restoreHabit,
  toggleHabit,
  type Habit,
  waterFor,
  type Combo,
  type Entry,
  type Food,
  type PendingMeal,
  type WaterLog,
} from "@/lib/store";
import PendingMeals from "./PendingMeals";
import DaySummary from "./DaySummary";
import { currentStreak, dayGoals, loggedDays } from "@/lib/streaks";
import WaterLogList from "./WaterLogList";

/** Removes stored photos nothing refers to, once per app session (after the Undo window). */
let photosCleaned = false;
let latest: { entries: Entry[]; pendingMeals: PendingMeal[] } = { entries: [], pendingMeals: [] };
import { useToday } from "@/lib/useToday";
import EntryForm from "./EntryForm";
import FoodLog from "./FoodLog";
import QuickAdd from "./QuickAdd";
import ReuseForm from "./ReuseForm";
import HabitsCard from "./HabitsCard";
import WhatFits from "./WhatFits";
import { whatFits } from "@/lib/fits";
import HabitsForm from "./HabitsForm";
import { habitDays, sortedHabits } from "@/lib/habits";
import { foodPortion } from "@/lib/format";
import { averageWindow, eatingWindow } from "@/lib/window";
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
  const [waterKey, setWaterKey] = useState(0);
  const [habitsOpen, setHabitsOpen] = useState(false);
  const closeHabits = useCallback(() => setHabitsOpen(false), []);
  /** Which day's log the Reuse sheet is showing. */
  const [reuseFrom, setReuseFrom] = useState<string | null>(null);
  const [reuseOpen, setReuseOpen] = useState(false);
  const [reuseKey, setReuseKey] = useState(0);
  const closeReuse = useCallback(() => setReuseOpen(false), []);

  // ---- Moving between days: arrow keys, swipes, with a short slide ----------
  const gridRef = useRef<HTMLDivElement>(null);
  const slideFrom = useRef<"left" | "right" | null>(null);
  const tk = today ? toKey(today) : null;
  const current = tk ? resolveDate(params.get("date"), tk) : null;

  // Where we're heading before the URL catches up, so quick repeated presses add up.
  const heading = useRef<string | null>(null);
  const goTo = (k: string) => {
    const from = heading.current ?? current;
    if (!tk || !from) return;
    const target = k > tk ? tk : k;
    if (target === from) return;
    slideFrom.current = target > from ? "right" : "left";
    heading.current = target;
    router.replace(target === tk ? "/" : `/?date=${target}`, { scroll: false });
  };
  const step = (days: number) => {
    const from = heading.current ?? current;
    if (from) goTo(addDays(from, days));
  };

  useEffect(() => {
    heading.current = null;
  }, [current]);

  useEffect(() => {
    if (!slideFrom.current) return;
    // Everything but the week row, which already shows where you are.
    gridRef.current
      ?.querySelectorAll<HTMLElement>(":scope > :not(.area-week)")
      .forEach((el) => slideIn(el, slideFrom.current!));
    slideFrom.current = null;
  }, [current]);

  const ready = s.ready && !!tk;
  useHotkeys(
    {
      ArrowLeft: () => step(-1),
      ArrowRight: () => step(1),
      "shift+ArrowLeft": () => step(-7),
      "shift+ArrowRight": () => step(7),
      t: () => tk && goTo(tk),
      w: () => {
        if (!current) return;
        addWater(current, 250);
        toast.show("250 ml water added", { icon: "droplet", action: { label: "Undo", onClick: () => undoWater(current) } });
      },
    },
    ready,
  );

  useSwipe(
    gridRef,
    (dir, target) => {
      const weeks = !!target.closest(".week-wrap");
      const days = (weeks ? 7 : 1) * (dir === "left" ? 1 : -1);
      if (dir === "left" && current === tk) return; // nothing after today
      haptic();
      step(days);
    },
    ready,
  );

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
  const logged = loggedDays(s);
  const streak = currentStreak(logged, todayKey);
  const goals = dayGoals(s, date);
  const label = dayLabel(date, todayKey);
  const summaryTitle = isToday ? "Today so far" : `How ${label === "Yesterday" ? "yesterday" : label} went`;
  const showSummary = entries.length > 0 || water.total > 0;
  const yesterday = addDays(todayKey, -1);
  const canCopyYesterday = isToday && entries.length === 0 && s.entries.some((e) => e.date === yesterday);
  const now = nowTime();
  const quick = quickItems(s, date, todayKey, minutesOf(now));
  const win = eatingWindow(entries);
  const reuseEntries = reuseFrom ? entriesFor(s, reuseFrom) : [];
  // What fits: today only, once something is logged, while there's room left.
  const fits = whatFits(s, date);
  const showFits =
    isToday && entries.length > 0 && fits.kcalLeft >= 100 && (s.foods.length > 0 || s.combos.length > 0);
  const habits = sortedHabits(s);
  const byHabit = habitDays(s);
  const doneOnDay = new Set(habits.filter((h) => byHabit.get(h.id)?.has(date)).map((h) => h.id));
  const habitStreaks = new Map(habits.map((h) => [h.id, currentStreak(byHabit.get(h.id) ?? new Set(), todayKey)]));

  const removeHabit = (h: Habit) => {
    const { habit, logs } = deleteHabit(h.id);
    if (habit) toast.show(`${h.name} deleted`, { icon: "trash", action: { label: "Undo", onClick: () => restoreHabit(habit, logs) } });
  };

  const openReuse = (from: string) => {
    setReuseFrom(from);
    setReuseKey((k) => k + 1);
    setReuseOpen(true);
  };

  const select = goTo;

  const remove = (e: Entry) => {
    removeEntry(e.id);
    toast.show(`${e.name} removed`, { icon: "trash", action: { label: "Undo", onClick: () => restoreEntry(e) } });
  };

  const add = (f: Food) => {
    const entry = logFood(f, date);
    toast.show(`${f.name}${f.unit === "g" ? ` · ${foodPortion(f)}` : ""} added`, {
      action: { label: "Undo", onClick: () => removeEntry(entry.id) },
    });
  };

  const addCombo = (c: Combo) => {
    const added = logCombo(c, date);
    toast.show(`${c.name} added`, { action: { label: "Undo", onClick: () => removeEntries(added.map((e) => e.id)) } });
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
        eyebrow={
          <>
            {longDate(date)}
            {!isToday ? (
              <button type="button" className="today-jump" onClick={() => goTo(todayKey)}>
                Back to today
                <Icon name="chevronRight" size={12} strokeWidth={2.4} />
              </button>
            ) : null}
            {isToday && streak >= 2 ? (
              <span className="streak-pill" title="Days in a row with food logged">
                <Icon name="flame" size={12} strokeWidth={2.2} />
                {streak} day streak
              </span>
            ) : null}
          </>
        }
        title={dayLabel(date, todayKey)}
        action={
          <Link href={isToday ? "/paste" : `/paste?date=${date}`} className="btn btn-secondary btn-sm">
            <Icon name="clipboard" size={16} />
            Paste entry
          </Link>
        }
      />

      <div className="today-grid" ref={gridRef}>
        <div className="area-week">
          <WeekStrip selected={date} todayKey={todayKey} onSelect={select} logged={logged} />
        </div>
        <div className="area-summary">
          <SummaryCard totals={entryTotals(entries)} goals={s.goals} />
        </div>
        <div className="area-side">
          {showSummary && !isToday ? (
            <DaySummary goals={goals} title={summaryTitle} isToday={false} window={win} avgWindow={null} now={now} />
          ) : null}
          <WaterCard
            total={water.total}
            goal={s.goals.waterMl}
            canUndo={water.count > 0}
            onAdd={(ml) => addWater(date, ml)}
            onUndo={() => undoWater(date)}
            onOpenLog={() => {
              setWaterKey((k) => k + 1);
              setWaterOpen(true);
            }}
          />
          <HabitsCard
            habits={habits}
            done={doneOnDay}
            streaks={habitStreaks}
            onToggle={(h) => {
              if (toggleHabit(h.id, date)) haptic();
            }}
            onManage={() => setHabitsOpen(true)}
          />
          <QuickAdd
            items={quick}
            foods={s.foods}
            onAddFood={add}
            onAddCombo={addCombo}
            libraryHref={libraryHref}
            libraryEmpty={s.foods.length === 0 && s.combos.length === 0}
          />
          {showFits ? (
            <WhatFits fits={fits} onAdd={(f) => (f.kind === "food" ? add(f.food) : addCombo(f.combo))} />
          ) : null}
          {showSummary && isToday ? (
            <DaySummary goals={goals} title={summaryTitle} isToday window={win} avgWindow={averageWindow(s, todayKey)} now={now} />
          ) : null}
        </div>
        <div className="area-log log-stack">
          <PendingMeals meals={s.pendingMeals} todayKey={todayKey} onRemove={discardPending} />
          <FoodLog
            entries={entries}
            onRemove={remove}
            onEdit={edit}
            addHref={libraryHref}
            onReuse={() => openReuse(date)}
            onCopyYesterday={canCopyYesterday ? () => openReuse(yesterday) : undefined}
          />
        </div>
      </div>

      <Sheet open={habitsOpen} onClose={closeHabits} title="Habits & supplements">
        <HabitsForm habits={habits} onDelete={removeHabit} />
      </Sheet>

      <Sheet
        open={reuseOpen}
        onClose={closeReuse}
        title={reuseFrom === todayKey ? "Save as combo" : reuseFrom === yesterday && isToday ? "Copy from yesterday" : `Reuse ${reuseFrom ? shortDate(reuseFrom) : ""}`}
      >
        {reuseFrom && reuseEntries.length ? (
          <ReuseForm
            key={reuseKey}
            entries={reuseEntries}
            copyTo={reuseFrom === todayKey ? undefined : todayKey}
            copyLabel="Copy to today"
            onCopied={(copies) => {
              closeReuse();
              toast.show(`${copies.length} item${copies.length === 1 ? "" : "s"} copied to today`, {
                action: { label: "Undo", onClick: () => removeEntries(copies.map((c) => c.id)) },
              });
              if (!isToday) select(todayKey);
            }}
            onSaved={(name) => {
              closeReuse();
              toast.show(`${name} saved. Find it in Quick add`, { icon: "layers" });
            }}
          />
        ) : null}
      </Sheet>

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
        <WaterLogList
          key={waterKey}
          logs={s.water.filter((w) => w.date === date)}
          onAdd={(ml) => addWater(date, ml)}
          onUpdate={(w, ml) => {
            updateWater(w.id, ml);
            toast.show(`Changed to ${ml} ml`, { icon: "droplet", action: { label: "Undo", onClick: () => updateWater(w.id, w.ml) } });
          }}
          onRemove={dropWater}
        />
      </Sheet>

      {toast.node}
    </>
  );
}
