"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/Icons";
import PageHeader from "@/components/PageHeader";
import GoalsForm from "@/components/settings/GoalsForm";
import Sheet from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import { toKey } from "@/lib/dates";
import { fmt } from "@/lib/format";
import { exportJSON, parseBackup, replaceData, useStore, type Data } from "@/lib/store";

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
  const closeGoals = useCallback(() => setGoalsOpen(false), []);
  const closeImport = useCallback(() => setImportOpen(false), []);

  const g = s.goals;
  const dash = s.ready ? null : " ";

  const download = () => {
    const blob = new Blob([exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diet-tracker-backup-${toKey(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.show("Backup downloaded");
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

      <section className="group">
        <h2 className="group-title">Goals</h2>
        <div className="card">
          {(
            [
              ["target", "Daily calories", `${fmt(g.kcal)} kcal`, false],
              ["flame", "Macros", `P ${fmt(g.protein)} · C ${fmt(g.carbs)} · F ${fmt(g.fat)} g`, false],
              ["droplet", "Water goal", `${fmt(g.waterMl)} ml`, true],
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
          <Row icon="clipboard" label="Prompt template" value={soon} />
          <Row icon="file" label="Import format" value={soon} />
        </div>
      </section>

      <section className="group">
        <h2 className="group-title">Data</h2>
        <div className="card">
          <Row icon="download" label="Export backup" value="JSON" onClick={download} />
          <Row icon="upload" label="Restore from backup" value="JSON" onClick={() => fileRef.current?.click()} />
        </div>
        <p className="storage-note">
          Your data is saved in this browser on this device only. Export a backup now and then so nothing is lost.
        </p>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={pickFile} />
      </section>

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
