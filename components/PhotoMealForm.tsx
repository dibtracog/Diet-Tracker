"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Field from "./Field";
import { Icon } from "./Icons";
import { toKey } from "@/lib/dates";
import { savePhoto } from "@/lib/photos";
import { addPendingMeal } from "@/lib/store";

/** After picking a meal photo: optional note, then save it as "needs details". */
export default function PhotoMealForm({ file, onDone }: { file: File; onDone: (message?: string) => void }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const save = async (fillNow: boolean) => {
    setBusy(true);
    setError("");
    try {
      const photoId = await savePhoto(file);
      const meal = addPendingMeal({ date: toKey(new Date()), photoId, note: note.trim() || undefined });
      if (fillNow) {
        onDone();
        router.push(`/paste?pending=${meal.id}`);
      } else {
        onDone("Photo saved. Fill in the details when you're ready");
      }
    } catch {
      setError("Couldn't save that photo. Try a different one.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        void save(false);
      }}
    >
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="photo" src={preview} alt="Meal photo preview" />
      ) : null}
      <Field
        label="What's in it? (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. 2 rotis, dal, a bit of rice"
        autoComplete="off"
      />
      <p className="helper" style={{ marginTop: -4 }}>
        This note is added to the AI prompt when you fill in the details.
      </p>
      {error ? <div className="form-error" role="alert">{error}</div> : null}
      <div className="form-actions">
        <button type="submit" className="btn btn-secondary" disabled={busy}>
          Save for later
        </button>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void save(true)}>
          <Icon name="clipboard" size={16} />
          Fill in now
        </button>
      </div>
    </form>
  );
}
