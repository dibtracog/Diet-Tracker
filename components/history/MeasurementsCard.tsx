"use client";

import { useCallback, useState } from "react";
import { parseNum } from "@/components/Field";
import { Icon } from "@/components/Icons";
import Sheet from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import { addDays, dayLabel, isValidKey, shortDate } from "@/lib/dates";
import {
  logMeasurements,
  MEASURES,
  removeMeasurements,
  restoreMeasurements,
  type MeasureKind,
  type Measurement,
} from "@/lib/store";

type Info = (typeof MEASURES)[number];

const signed = (n: number, unit: string) => {
  const v = Math.round(n * 10) / 10;
  if (v === 0) return `0 ${unit}`;
  return `${v > 0 ? "+" : "−"}${Math.abs(v)} ${unit}`;
};

const dateLabel = (k: string, todayKey: string) => {
  const l = dayLabel(k, todayKey);
  return l === "Today" || l === "Yesterday" ? l : shortDate(k);
};

/** Change over about 30 days, or since the first measurement if there isn't that much history. */
function change(list: Measurement[]): { delta: number; since: string | null } | null {
  if (list.length < 2) return null;
  const last = list[list.length - 1];
  const cutoff = addDays(last.date, -30);
  const base = [...list].reverse().find((m) => m.date <= cutoff);
  return base ? { delta: last.value - base.value, since: null } : { delta: last.value - list[0].value, since: list[0].date };
}

function Sparkline({ list, label }: { list: Measurement[]; label: string }) {
  if (list.length < 2) return <span className="spark" aria-hidden="true" />;
  const w = 72;
  const h = 26;
  const vals = list.map((m) => m.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const pts = list.map((m, i) => [(i / (list.length - 1)) * (w - 6) + 3, h - 4 - ((m.value - min) / span) * (h - 8)]);
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg className="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r="3" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />
    </svg>
  );
}

export default function MeasurementsCard({ measurements, todayKey }: { measurements: Measurement[]; todayKey: string }) {
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [kind, setKind] = useState<Info | null>(null);
  const closeForm = useCallback(() => setFormOpen(false), []);
  const closeKind = useCallback(() => setKind(null), []);

  const byKind = new Map<MeasureKind, Measurement[]>();
  for (const m of [...measurements].sort((a, b) => a.date.localeCompare(b.date))) {
    byKind.set(m.kind, [...(byKind.get(m.kind) ?? []), m]);
  }
  const tracked = MEASURES.filter((k) => byKind.has(k.kind));
  const latest = (k: MeasureKind) => {
    const l = byKind.get(k);
    return l ? l[l.length - 1].value : undefined;
  };

  const save = (date: string, values: Partial<Record<MeasureKind, number>>) => {
    closeForm();
    const { added, replaced } = logMeasurements(date, values);
    toast.show(`${added.length} measurement${added.length === 1 ? "" : "s"} saved`, {
      action: {
        label: "Undo",
        onClick: () => {
          removeMeasurements(added.map((m) => m.id));
          restoreMeasurements(replaced);
        },
      },
    });
  };

  const drop = (m: Measurement, info: Info) => {
    removeMeasurements([m.id]);
    toast.show(`${info.label} ${m.value} ${info.unit} removed`, {
      icon: "trash",
      action: { label: "Undo", onClick: () => restoreMeasurements([m]) },
    });
  };

  const kindList = kind ? [...(byKind.get(kind.kind) ?? [])].reverse() : [];

  return (
    <section className="card card-pad chart-card" aria-label="Body measurements">
      <div className="card-head" style={{ marginBottom: tracked.length ? 4 : 8 }}>
        <div>
          <div className="card-title">Measurements</div>
          <div className="card-sub">Change over the last 30 days</div>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => {
            setFormKey((k) => k + 1);
            setFormOpen(true);
          }}
        >
          <Icon name="plus" size={16} strokeWidth={2.2} />
          Log
        </button>
      </div>

      {tracked.length ? (
        tracked.map((info) => {
          const list = byKind.get(info.kind)!;
          const last = list[list.length - 1];
          const c = change(list.slice(-90));
          return (
            <button key={info.kind} type="button" className="row measure-row" onClick={() => setKind(info)}>
              <span className="row-main">
                <span className="row-title" style={{ display: "block" }}>
                  {info.label}
                </span>
                <span className="row-sub num" style={{ display: "block" }}>
                  {c ? `${signed(c.delta, info.unit)}${c.since ? ` since ${shortDate(c.since)}` : ""}` : dateLabel(last.date, todayKey)}
                </span>
              </span>
              <Sparkline list={list.slice(-12)} label={`${info.label} trend, latest ${last.value} ${info.unit}`} />
              <span className="row-kcal num measure-val">
                {last.value}
                <small>{info.unit}</small>
              </span>
            </button>
          );
        })
      ) : (
        <p className="quick-empty" style={{ marginTop: 0 }}>
          Measure your waist, chest, arms or body fat now and then. When the scale stalls, these often still move.
        </p>
      )}

      <Sheet open={formOpen} onClose={closeForm} title="Log measurements">
        <MeasureForm key={formKey} todayKey={todayKey} latest={latest} onSave={save} />
      </Sheet>

      <Sheet open={!!kind} onClose={closeKind} title={kind ? kind.label : ""}>
        {kind ? (
          kindList.length ? (
            <div>
              {kindList.map((m) => (
                <div key={m.id} className="row">
                  <div className="row-main">
                    <div className="row-title num">
                      {m.value} {kind.unit}
                    </div>
                    <div className="row-sub">{dateLabel(m.date, todayKey)}</div>
                  </div>
                  <button type="button" className="icon-btn del" style={{ opacity: 1 }} onClick={() => drop(m, kind)} aria-label={`Remove ${m.value} ${kind.unit}`}>
                    <Icon name="trash" size={18} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="sheet-text">No {kind.label.toLowerCase()} measurements left.</p>
          )
        ) : null}
      </Sheet>
      {toast.node}
    </section>
  );
}

function MeasureForm({
  todayKey,
  latest,
  onSave,
}: {
  todayKey: string;
  latest: (k: MeasureKind) => number | undefined;
  onSave: (date: string, values: Partial<Record<MeasureKind, number>>) => void;
}) {
  const [date, setDate] = useState(todayKey);
  const [vals, setVals] = useState<Partial<Record<MeasureKind, string>>>({});
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidKey(date) || date > todayKey) return setError("Pick a date up to today.");
    const out: Partial<Record<MeasureKind, number>> = {};
    for (const info of MEASURES) {
      const raw = vals[info.kind]?.trim();
      if (!raw) continue;
      const n = parseNum(raw, NaN);
      const max = info.unit === "%" ? 70 : 300;
      if (!(n > 0 && n <= max)) return setError(`${info.label} should be ${info.unit === "%" ? "a percentage" : "in cm"}, e.g. ${latest(info.kind) ?? (info.unit === "%" ? 18 : 85)}.`);
      out[info.kind] = Math.round(n * 10) / 10;
    }
    if (!Object.keys(out).length) return setError("Fill in at least one measurement.");
    onSave(date, out);
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      <label className="field">
        <span className="field-label">Date</span>
        <input className="input" type="date" value={date} max={todayKey} onChange={(e) => setDate(e.target.value)} />
      </label>
      <div className="grid-2">
        {MEASURES.map((info) => (
          <label key={info.kind} className="field">
            <span className="field-label">{info.label}</span>
            <span className="input-wrap has-suffix">
              <input
                className="input"
                inputMode="decimal"
                value={vals[info.kind] ?? ""}
                placeholder={latest(info.kind) !== undefined ? String(latest(info.kind)) : ""}
                onChange={(e) => setVals((v) => ({ ...v, [info.kind]: e.target.value }))}
              />
              <span className="input-suffix">{info.unit}</span>
            </span>
          </label>
        ))}
      </div>
      <p className="fineprint" style={{ margin: 0 }}>
        Fill in only what you measured. Measure at the same spot, ideally in the morning. Grey numbers are your last values.
      </p>
      {error ? <div className="form-error" role="alert">{error}</div> : null}
      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          Save
        </button>
      </div>
    </form>
  );
}
