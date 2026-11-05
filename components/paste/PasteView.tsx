"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icons";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/components/Toast";
import { canReadClipboard, copyText } from "@/lib/clipboard";
import { resolveDate, shortDate, toKey } from "@/lib/dates";
import { buildPrompt, parseImport, type ParseResult } from "@/lib/importCode";
import { getPhoto } from "@/lib/photos";
import { useStore } from "@/lib/store";
import { Photo } from "@/components/Thumb";
import { useToday } from "@/lib/useToday";
import PreviewForm from "./PreviewForm";

type Saved = { date: string; name: string; savedToLibrary: boolean };

export default function PasteView() {
  const s = useStore();
  const today = useToday();
  const params = useSearchParams();
  const toast = useToast();

  const [code, setCode] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [canRead, setCanRead] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanRead(canReadClipboard());
    try {
      // Sharing files needs https, so this lights up once the app is on Vercel.
      setCanShare(!!navigator.canShare?.({ files: [new File([""], "meal.jpg", { type: "image/jpeg" })] }));
    } catch {
      setCanShare(false);
    }
  }, []);

  // Opened from a photo meal ("Fill in")?
  const pendingId = params.get("pending");
  const meal = pendingId ? s.pendingMeals.find((m) => m.id === pendingId) : undefined;

  const todayKey = today ? toKey(today) : null;
  const date = meal ? meal.date : todayKey ? resolveDate(params.get("date"), todayKey) : null;
  const prompt = buildPrompt(s.promptNotes) + (meal?.note ? ` ${meal.note}` : "");

  const share = async () => {
    if (!meal?.photoId) return;
    const blob = await getPhoto(meal.photoId);
    if (!blob) return toast.show("This photo isn't on this device", { icon: "x" });
    try {
      await navigator.share({ files: [new File([blob], "meal.jpg", { type: "image/jpeg" })], text: prompt });
    } catch {
      // closed the share menu
    }
  };

  const copy = async () => {
    const ok = await copyText(prompt);
    toast.show(ok ? "Prompt copied. Paste it into your AI" : "Couldn't copy. Open “See the prompt” and copy it by hand", {
      icon: ok ? "check" : "x",
    });
  };

  const read = (text: string) => {
    const r = parseImport(text);
    setResult(r);
    if (r.ok) setFormKey((k) => k + 1);
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setCode(text);
      read(text);
    } catch {
      toast.show("Clipboard access was blocked. Long-press the box and paste", { icon: "x" });
    }
  };

  const reset = () => {
    setCode("");
    setResult(null);
    setSaved(null);
  };

  const dayHref = (k: string) => (k === todayKey ? "/" : `/?date=${k}`);

  if (saved && todayKey) {
    return (
      <div className="narrow">
        <PageHeader eyebrow="Add entry" title="Paste AI entry" />
        <section className="card success">
          <span className="success-icon">
            <Icon name="check" size={28} strokeWidth={2.4} />
          </span>
          <div className="empty-title">{saved.name} added</div>
          <div className="muted">
            Logged to {saved.date === todayKey ? "today" : shortDate(saved.date)}
            {saved.savedToLibrary ? " and saved to your library" : ""}.
          </div>
          <div className="form-actions" style={{ width: "100%", maxWidth: 380, marginTop: 14 }}>
            <button type="button" className="btn btn-secondary" onClick={reset}>
              Paste another
            </button>
            <Link href={dayHref(saved.date)} className="btn btn-primary">
              View day
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="narrow">
      <PageHeader
        eyebrow={date && date !== todayKey ? `Adding to ${shortDate(date)}` : "Add entry"}
        title={meal ? "Fill in photo meal" : "Paste AI entry"}
      />

      <div className="steps">
        {meal ? (
          <section className="card card-pad" aria-label="Your photo">
            <Photo photoId={meal.photoId} />
            <div className="share-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="step-title">{meal.note || "Photo meal"}</div>
                <div className="step-text">
                  Taken {meal.date === todayKey ? "today" : shortDate(meal.date)} at {meal.time}
                  {meal.note ? ". Your note is added to the prompt." : ""}
                </div>
              </div>
              {canShare && meal.photoId ? (
                <button type="button" className="btn btn-primary btn-sm" onClick={share}>
                  Share to AI
                </button>
              ) : null}
            </div>
          </section>
        ) : null}
        <section className="card card-pad step">
          <span className="step-num">1</span>
          <div className="step-body">
            <div className="step-title">Copy the prompt</div>
            <p className="step-text">It asks the AI to reply with one dish in this app&apos;s format.</p>
            <div className="step-actions">
              <button type="button" className="btn btn-primary btn-sm" onClick={copy} disabled={!s.ready}>
                <Icon name="copy" size={16} />
                Copy prompt
              </button>
              <Link href="/settings#prompt" className="btn btn-ghost btn-sm">
                {s.promptNotes.trim() ? "Edit my notes" : "Add notes about me"}
              </Link>
            </div>
            <details className="disclosure">
              <summary>
                <Icon name="chevronRight" size={16} />
                See the prompt
              </summary>
              <pre className="code-block">{prompt}</pre>
            </details>
          </div>
        </section>

        <section className="card card-pad step">
          <span className="step-num">2</span>
          <div className="step-body">
            <div className="step-title">Ask any AI</div>
            <p className="step-text">
              Paste the prompt into ChatGPT, Claude, Gemini or any AI. Attach your meal photo and add a few words, like
              “2 rotis, big bowl of dal”.
            </p>
          </div>
        </section>

        <section className="card card-pad step">
          <span className="step-num">3</span>
          <div className="step-body">
            <div className="step-title">Paste the reply here</div>
            <p className="step-text">Copy the AI&apos;s whole reply. Extra text around the code is fine.</p>
            <textarea
              className="textarea"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (result) setResult(null);
              }}
              onPaste={(e) => {
                // Read the box right after the paste lands, so the preview appears straight away.
                const el = e.currentTarget;
                window.setTimeout(() => read(el.value), 0);
              }}
              placeholder={'{\n  "version": 1,\n  "name": "…",\n  "kcal": …\n}'}
              spellCheck={false}
              aria-label="Paste the AI's reply"
            />
            <div className="step-actions">
              <button type="button" className="btn btn-primary" onClick={() => read(code)} disabled={!code.trim()}>
                Read entry
              </button>
              {canRead ? (
                <button type="button" className="btn btn-secondary" onClick={pasteFromClipboard}>
                  <Icon name="clipboard" size={16} />
                  Paste
                </button>
              ) : null}
              {code ? (
                <button type="button" className="btn btn-ghost" onClick={reset}>
                  Clear
                </button>
              ) : null}
            </div>

            {result && !result.ok ? (
              <div className="alert alert-error" role="alert" style={{ marginTop: 14 }}>
                <div className="alert-title">
                  <Icon name="x" size={16} strokeWidth={2.4} />
                  Couldn&apos;t read that
                </div>
                <ul className="issues">
                  {result.errors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>

        {result?.ok && date && todayKey ? (
          <section className="card card-pad" aria-label="Preview">
            <div className="card-head" style={{ marginBottom: 10 }}>
              <div>
                <div className="card-title">Check and save</div>
                <div className="card-sub">Nothing is saved until you tap Add to log.</div>
              </div>
              {result.dish.confidence ? (
                <span className={`badge conf conf-${result.dish.confidence}`}>{result.dish.confidence} confidence</span>
              ) : null}
            </div>

            {result.dish.notes ? <p className="ai-note">{result.dish.notes}</p> : null}

            {result.warnings.length ? (
              <div className="alert alert-warn" style={{ margin: "12px 0 2px" }}>
                <div className="alert-title">Worth a look</div>
                <ul className="issues">
                  {result.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div style={{ marginTop: 14 }}>
              <PreviewForm
                key={formKey}
                dish={result.dish}
                date={date}
                todayKey={todayKey}
                foods={s.foods}
                pendingId={meal?.id}
                initialTime={meal?.time}
                onSaved={setSaved}
                onCancel={reset}
              />
            </div>
          </section>
        ) : null}
      </div>

      {toast.node}
    </div>
  );
}
