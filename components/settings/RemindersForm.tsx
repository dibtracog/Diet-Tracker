"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icons";
import { disablePush, enablePush, pushState, sendTestPush, type PushState } from "@/lib/push";
import { updateReminders, type Reminders } from "@/lib/store";

const MAX_TIMES = 12;

type Kind = keyof Reminders;

const SECTIONS: { kind: Kind; label: string; hint: string }[] = [
  { kind: "meals", label: "Meal reminders", hint: "A nudge to log what you ate. Mentions photo meals still waiting for details." },
  { kind: "water", label: "Water reminders", hint: "Skipped once you've reached the day's water goal." },
];

/** A time not in the list yet: two hours after the last one, wrapping before midnight. */
function nextTime(times: string[]): string {
  const taken = new Set(times);
  const last = times.length ? times[times.length - 1] : "08:00";
  let minutes = Number(last.slice(0, 2)) * 60 + Number(last.slice(3)) + 120;
  for (let i = 0; i < 48; i++) {
    minutes %= 24 * 60;
    const t = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    if (!taken.has(t)) return t;
    minutes += 30;
  }
  return "12:00";
}

export default function RemindersForm({
  reminders,
  onSaved,
  onMessage,
}: {
  reminders: Reminders;
  onSaved: () => void;
  onMessage: (message: string, ok?: boolean) => void;
}) {
  const [v, setV] = useState<Reminders>(reminders);
  const [error, setError] = useState("");
  const [device, setDevice] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void pushState().then((s) => {
      if (alive) setDevice(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  const patch = (kind: Kind, part: Partial<Reminders[Kind]>) => {
    setError("");
    setV((p) => ({ ...p, [kind]: { ...p[kind], ...part } }));
  };

  const turnOn = async () => {
    setBusy(true);
    const err = await enablePush();
    setDevice(await pushState());
    setBusy(false);
    onMessage(err ?? "Notifications are on for this device", !err);
  };

  const turnOff = async () => {
    setBusy(true);
    await disablePush().catch(() => undefined);
    setDevice(await pushState());
    setBusy(false);
    onMessage("Notifications turned off on this device", true);
  };

  const test = async () => {
    setBusy(true);
    const err = await sendTestPush();
    setBusy(false);
    onMessage(err ?? "Test sent. It should arrive in a few seconds", !err);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    for (const { kind, label } of SECTIONS) {
      if (v[kind].on && !v[kind].times.some((t) => t)) return setError(`${label}: add at least one time, or turn them off.`);
    }
    const clean = (times: string[]) => [...new Set(times.filter((t) => t))].sort();
    updateReminders({
      meals: { on: v.meals.on, times: clean(v.meals.times) },
      water: { on: v.water.on, times: clean(v.water.times) },
    });
    onSaved();
  };

  const anyOn = v.meals.on || v.water.on;

  return (
    <form className="form" onSubmit={submit} noValidate>
      <div className={`device-box ${device === "on" ? "is-on" : ""}`} aria-live="polite">
        <span className="device-icon">
          <Icon name="bell" size={18} />
        </span>
        <div className="device-main">
          {device === null ? (
            <div className="device-title">Checking this device…</div>
          ) : device === "on" ? (
            <>
              <div className="device-title">Notifications are on for this device</div>
              <div className="device-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={test} disabled={busy}>
                  Send a test
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={turnOff} disabled={busy}>
                  Turn off
                </button>
              </div>
            </>
          ) : device === "off" ? (
            <>
              <div className="device-title">Notifications are off for this device</div>
              <div className="device-sub">Each phone or laptop that should get reminders needs this turned on once.</div>
              <div className="device-actions">
                <button type="button" className="btn btn-primary btn-sm" onClick={turnOn} disabled={busy}>
                  {busy ? "Turning on…" : "Turn on notifications"}
                </button>
              </div>
            </>
          ) : device === "blocked" ? (
            <>
              <div className="device-title">Notifications are blocked</div>
              <div className="device-sub">
                Allow them for this site in your browser: tap the icon next to the address, then Permissions → Notifications.
              </div>
            </>
          ) : device === "unsupported" ? (
            <>
              <div className="device-title">Not available in this browser</div>
              <div className="device-sub">
                Reminders arrive on the phone once the app is opened from its https address (your Vercel link) in Chrome.
                You can still set the times here.
              </div>
            </>
          ) : (
            <>
              <div className="device-title">Reminders aren&apos;t set up yet</div>
              <div className="device-sub">
                They need cloud sync and the push keys. Follow step 5 in SETUP.md; the times you choose here are kept.
              </div>
            </>
          )}
        </div>
      </div>

      {SECTIONS.map(({ kind, label, hint }) => (
        <div key={kind} className="remind-section">
          <div className="toggle-row" onClick={() => patch(kind, { on: !v[kind].on })}>
            <span>{label}</span>
            <button
              type="button"
              role="switch"
              aria-checked={v[kind].on}
              aria-label={label}
              className="switch"
              onClick={(e) => {
                e.stopPropagation();
                patch(kind, { on: !v[kind].on });
              }}
            />
          </div>
          {v[kind].on ? (
            <>
              <div className="time-list">
                {v[kind].times.map((t, i) => (
                  <span key={i} className="time-chip">
                    <input
                      type="time"
                      className="time-input num"
                      value={t}
                      aria-label={`${label}: time ${i + 1}`}
                      onChange={(e) => patch(kind, { times: v[kind].times.map((x, n) => (n === i ? e.target.value : x)) })}
                    />
                    <button
                      type="button"
                      className="time-remove"
                      aria-label={`Remove ${t || "time"}`}
                      onClick={() => patch(kind, { times: v[kind].times.filter((_, n) => n !== i) })}
                    >
                      <Icon name="x" size={14} strokeWidth={2.4} />
                    </button>
                  </span>
                ))}
                {v[kind].times.length < MAX_TIMES ? (
                  <button
                    type="button"
                    className="chip time-add"
                    onClick={() => patch(kind, { times: [...v[kind].times, nextTime(v[kind].times.filter((t) => t))] })}
                  >
                    <Icon name="plus" size={14} strokeWidth={2.4} />
                    Add time
                  </button>
                ) : null}
              </div>
              <p className="remind-hint">{hint}</p>
            </>
          ) : null}
        </div>
      ))}

      {anyOn && device === "off" ? (
        <p className="remind-hint">Turn on notifications above to receive these on this device.</p>
      ) : null}
      {error ? <div className="form-error" role="alert">{error}</div> : null}
      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          Save reminders
        </button>
      </div>
    </form>
  );
}
