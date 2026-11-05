"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/Icons";
import PageHeader from "@/components/PageHeader";
import GoalsForm from "@/components/settings/GoalsForm";
import PromptNotesForm from "@/components/settings/PromptNotesForm";
import { copyText } from "@/lib/clipboard";
import { downloadFile, logToCsv } from "@/lib/download";
import { FORMAT_EXAMPLE } from "@/lib/importCode";
import Sheet from "@/components/Sheet";
import ShortcutsList from "@/components/Shortcuts";
import { useToast } from "@/components/Toast";
import { toKey } from "@/lib/dates";
import { fmt } from "@/lib/format";
import {
  exportJSON,
  exportLibrary,
  importLibrary,
  parseBackup,
  parseLibrary,
  type LibraryImport,
  replaceData,
  signOut,
  syncNow,
  useStore,
  type Data,
  type State,
} from "@/lib/store";

function syncLabel(s: State): string {
  if (s.sync === "syncing") return "Saving…";
  if (s.sync === "offline") return s.pending ? `Offline · ${s.pending} waiting` : "Offline";
  if (s.sync === "error") return s.pending ? `Retrying · ${s.pending} waiting` : "Couldn't sync, retrying";
  if (s.pending) return `${s.pending} waiting`;
  return "All changes saved";
}

function Row({
  icon,
  label,
  value,
  water,
  onClick,
}: {
  icon: IconName;
  label: string;
  value: ReactNode;
  water?: boolean;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span className={`setting-icon ${water ? "is-water" : ""}`}>
        <Icon name={icon} size={18} />
      </span>
      <span className="setting-label">{label}</span>
      <span className="setting-value num">{value}</span>
      {onClick ? <Icon name="chevronRight" size={18} className="chev" /> : null}
    </>
  );
  return onClick ? (
    <button type="button" className="setting" onClick={onClick}>
      {inner}
    </button>
  ) : (
    <div className="setting" style={{ cursor: "default" }}>
      {inner}
    </div>
  );
}

const soon = <span className="badge">Soon</span>;

export default function SettingsPage() {
  const s = useStore();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [goalsOpen, setGoalsOpen] = useState(false);
  const [goalsKey, setGoalsKey] = useState(0);
  const [pending, setPending] = useState<Data | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesKey, setNotesKey] = useState(0);
  const [formatOpen, setFormatOpen] = useState(false);
  const [signOutArmed, setSignOutArmed] = useState(false);
  const closeGoals = useCallback(() => setGoalsOpen(false), []);
  const closeImport = useCallback(() => setImportOpen(false), []);
  const closeNotes = useCallback(() => setNotesOpen(false), []);
  const closeFormat = useCallback(() => setFormatOpen(false), []);
  const [keysOpen, setKeysOpen] = useState(false);
  const closeKeys = useCallback(() => setKeysOpen(false), []);
  const libRef = useRef<HTMLInputElement>(null);
  const [libImport, setLibImport] = useState<LibraryImport | null>(null);
  const [libOpen, setLibOpen] = useState(false);
  const closeLib = useCallback(() => setLibOpen(false), []);

  // Arriving from the paste screen's "Edit my notes" link opens the notes editor
  // (once saved data has loaded, so the form starts with the current notes).
  const openedFromHash = useRef(false);
  useEffect(() => {
    if (!s.ready || openedFromHash.current || window.location.hash !== "#prompt") return;
    openedFromHash.current = true;
    setNotesKey((k) => k + 1);
    setNotesOpen(true);
  }, [s.ready]);

  const g = s.goals;
  const dash = s.ready ? null : " ";

  const download = () => {
    downloadFile(`diet-tracker-backup-${toKey(new Date())}.json`, exportJSON(), "application/json");
    toast.show("Backup downloaded");
  };

  const downloadCsv = () => {
    if (!s.entries.length) return toast.show("Nothing logged yet", { icon: "x" });
    downloadFile(`diet-tracker-log-${toKey(new Date())}.csv`, logToCsv(s), "text/csv;charset=utf-8");
    toast.show("Food log downloaded");
  };

  const downloadLibrary = () => {
    if (!s.foods.length && !s.combos.length) return toast.show("Your library is empty", { icon: "x" });
    downloadFile(`diet-tracker-library-${toKey(new Date())}.json`, exportLibrary(), "application/json");
    toast.show("Library downloaded");
  };

  const pickLibrary = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const result = parseLibrary(await file.text());
    if (!result.ok) return toast.show(result.error, { icon: "x" });
    if (!result.foods.length && !result.combos.length) {
      return toast.show(
        result.skipped === 1 ? "Nothing new: you already have it" : `Nothing new: you already have all ${result.skipped}`,
        { icon: "check" },
      );
    }
    setLibImport(result);
    setLibOpen(true);
  };

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const result = parseBackup(await file.text());
    if (!result.ok) {
      toast.show(result.error, { icon: "x" });
      return;
    }
    setPending(result.data);
    setImportOpen(true);
  };

  return (
    <div className="narrow">
      <PageHeader eyebrow="Preferences" title="Settings" />

      {s.auth === "signedIn" ? (
        <section className="group">
          <h2 className="group-title">Account</h2>
          <div className="card">
            <Row icon="lock" label="Signed in as" value={s.email ?? ""} />
            <Row
              icon="upload"
              label="Sync"
              value={
                <>
                  <span className={`sync-dot ${s.pending && s.sync === "synced" ? "syncing" : s.sync}`} />
                  {syncLabel(s)}
                </>
              }
              onClick={() => {
                void syncNow().then(() => toast.show("Synced"));
              }}
            />
            <Row
              icon="x"
              label={signOutArmed ? "Tap again to sign out" : "Sign out"}
              value={signOutArmed && s.pending ? `${s.pending} changes not synced yet` : ""}
              onClick={() => {
                if (!signOutArmed) {
                  setSignOutArmed(true);
                  window.setTimeout(() => setSignOutArmed(false), 4000);
                  return;
                }
                void signOut();
              }}
            />
          </div>
        </section>
      ) : null}

      <section className="group">
        <h2 className="group-title">Goals</h2>
        <div className="card">
          {(
            [
              ["target", "Daily calories", `${fmt(g.kcal)} kcal`, false],
              ["flame", "Macros", `P ${fmt(g.protein)} · C ${fmt(g.carbs)} · F ${fmt(g.fat)} g`, false],
              ["droplet", "Water goal", `${fmt(g.waterMl)} ml`, true],
              ["scale", "Goal weight", g.weightKg ? `${g.weightKg} kg` : "Not set", false],
              ["sun", "Eating window", g.windowHours ? `${g.windowHours} h max` : "Not set", false],
            ] as const
          ).map(([icon, label, value, water]) => (
            <Row
              key={label}
              icon={icon}
              label={label}
              value={dash ?? value}
              water={water}
              onClick={() => {
                setGoalsKey((k) => k + 1);
                setGoalsOpen(true);
              }}
            />
          ))}
        </div>
      </section>

      <section className="group">
        <h2 className="group-title">Reminders</h2>
        <div className="card">
          <Row icon="bell" label="Meal reminders" value={soon} />
          <Row icon="droplet" label="Water reminders" value={soon} water />
        </div>
      </section>

      <section className="group">
        <h2 className="group-title">AI entries</h2>
        <div className="card">
          <Row
            icon="clipboard"
            label="My prompt notes"
            value={dash ?? (s.promptNotes.trim() ? "Added" : "None")}
            onClick={() => {
              setNotesKey((k) => k + 1);
              setNotesOpen(true);
            }}
          />
          <Row icon="file" label="Import format" value="JSON v1" onClick={() => setFormatOpen(true)} />
        </div>
      </section>

      <section className="group">
        <h2 className="group-title">App</h2>
        <div className="card">
          <Row icon="keyboard" label="Shortcuts & gestures" value="?" onClick={() => setKeysOpen(true)} />
        </div>
      </section>

      <section className="group">
        <h2 className="group-title">Data</h2>
        <div className="card">
          <Row icon="file" label="Export food log" value="CSV" onClick={downloadCsv} />
          <Row icon="download" label="Export backup" value="JSON" onClick={download} />
          <Row icon="upload" label="Restore from backup" value="JSON" onClick={() => fileRef.current?.click()} />
        </div>
        <div className="card" style={{ marginTop: 12 }}>
          <Row icon="library" label="Export food library" value="JSON" onClick={downloadLibrary} />
          <Row icon="upload" label="Import food library" value="JSON" onClick={() => libRef.current?.click()} />
        </div>
        <p className="storage-note">
          {s.auth === "signedIn"
            ? "Your data is saved to your account and shared between your devices. A copy is kept on this device so the app works offline."
            : "Your data is saved in this browser on this device only. Export a backup now and then so nothing is lost."}{" "}
          Meal photos stay on the device that took them and aren&apos;t part of the backup file.
        </p>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={pickFile} />
        <input ref={libRef} type="file" accept="application/json,.json" hidden onChange={pickLibrary} />
      </section>

      <Sheet open={libOpen} onClose={closeLib} title="Import food library?">
        {libImport ? (
          <>
            <p className="sheet-text">
              This adds{" "}
              <b>
                {libImport.foods.length} food{libImport.foods.length === 1 ? "" : "s"}
              </b>
              {libImport.combos.length ? (
                <>
                  {" "}
                  and{" "}
                  <b>
                    {libImport.combos.length} combo{libImport.combos.length === 1 ? "" : "s"}
                  </b>
                </>
              ) : null}{" "}
              to your library.
              {libImport.skipped
                ? ` ${libImport.skipped} you already have (same name) will be skipped.`
                : ""}{" "}
              Nothing in your library or log is changed or removed.
            </p>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={closeLib}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  importLibrary(libImport);
                  closeLib();
                  const n = libImport.foods.length + libImport.combos.length;
                  toast.show(`${n} item${n === 1 ? "" : "s"} added to your library`);
                }}
              >
                Import
              </button>
            </div>
          </>
        ) : null}
      </Sheet>

      <Sheet open={keysOpen} onClose={closeKeys} title="Shortcuts & gestures">
        <ShortcutsList />
      </Sheet>

      <Sheet open={goalsOpen} onClose={closeGoals} title="Daily goals">
        <GoalsForm
          key={goalsKey}
          goals={g}
          onSaved={() => {
            closeGoals();
            toast.show("Goals saved");
          }}
        />
      </Sheet>

      <Sheet open={notesOpen} onClose={closeNotes} title="My prompt notes">
        <PromptNotesForm
          key={notesKey}
          notes={s.promptNotes}
          onSaved={() => {
            closeNotes();
            toast.show("Prompt notes saved");
          }}
        />
      </Sheet>

      <Sheet open={formatOpen} onClose={closeFormat} title="Import format (JSON v1)">
        <p className="sheet-text" style={{ marginBottom: 0 }}>
          One dish per paste. Required: <b>name</b>, <b>kcal</b>, <b>protein</b>, <b>carbs</b>, <b>fat</b>. Optional:
          serving, fiber, sugar, sodium (mg), confidence, notes. Grams unless noted, for the whole portion.
        </p>
        <pre className="code-block">{FORMAT_EXAMPLE}</pre>
        <div className="form-actions" style={{ marginTop: 14 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={async () => toast.show((await copyText(FORMAT_EXAMPLE)) ? "Example copied" : "Couldn't copy", {})}
          >
            <Icon name="copy" size={16} />
            Copy example
          </button>
        </div>
      </Sheet>

      <Sheet open={importOpen} onClose={closeImport} title="Restore backup?">
        {pending ? (
          <>
            <p className="sheet-text">
              This backup has <b>{pending.foods.length}</b> foods, <b>{pending.entries.length}</b> log entries and{" "}
              <b>{pending.water.length}</b> water entries. It will <b>replace</b> everything currently on this device.
            </p>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={closeImport}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  replaceData(pending);
                  closeImport();
                  toast.show("Backup restored");
                }}
              >
                Replace data
              </button>
            </div>
          </>
        ) : null}
      </Sheet>

      {toast.node}
    </div>
  );
}
