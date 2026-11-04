"use client";

import { useState } from "react";
import { Icon } from "@/components/Icons";
import { buildPrompt } from "@/lib/importCode";
import { setPromptNotes } from "@/lib/store";

export default function PromptNotesForm({ notes, onSaved }: { notes: string; onSaved: () => void }) {
  const [value, setValue] = useState(notes);

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        setPromptNotes(value.trim());
        onSaved();
      }}
    >
      <p className="sheet-text" style={{ marginBottom: 0 }}>
        These notes are added to the end of the prompt so the AI estimates the way you actually eat. The rest of the prompt
        stays fixed so the reply always matches the app&apos;s format.
      </p>
      <label className="field">
        <span className="field-label">About me</span>
        <textarea
          className="textarea is-plain"
          style={{ marginTop: 0 }}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={"e.g. Home-style North Indian food, cooked with little oil.\nMy rotis are medium (about 35 g flour each).\nA “bowl” for me is about 250 ml."}
        />
      </label>
      <details className="disclosure" style={{ marginTop: 0 }}>
        <summary>
          <Icon name="chevronRight" size={16} />
          Preview full prompt
        </summary>
        <pre className="code-block">{buildPrompt(value)}</pre>
      </details>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          Save notes
        </button>
      </div>
    </form>
  );
}
