"use client";

import { useState } from "react";
import { Icon } from "@/components/Icons";
import PageHeader from "@/components/PageHeader";

export default function PastePage() {
  const [code, setCode] = useState("");

  return (
    <div className="narrow">
      <PageHeader eyebrow="Add entry" title="Paste AI entry" />

      <div className="steps">
        <section className="card card-pad step">
          <span className="step-num">1</span>
          <div className="step-body">
            <div className="step-title">Copy the prompt</div>
            <p className="step-text">
              A ready-made prompt that asks any AI to reply with one dish in this app&apos;s JSON format.
            </p>
            <div className="step-actions">
              <button className="btn btn-secondary btn-sm" disabled>
                <Icon name="copy" size={16} />
                Copy prompt
              </button>
              <span className="badge" style={{ alignSelf: "center" }}>
                Next step
              </span>
            </div>
          </div>
        </section>

        <section className="card card-pad step">
          <span className="step-num">2</span>
          <div className="step-body">
            <div className="step-title">Ask any AI</div>
            <p className="step-text">
              Paste the prompt into ChatGPT, Claude, Gemini or any other AI, and attach your meal photo plus a
              short description.
            </p>
          </div>
        </section>

        <section className="card card-pad step">
          <span className="step-num">3</span>
          <div className="step-body">
            <div className="step-title">Paste the reply here</div>
            <p className="step-text">You&apos;ll see a preview you can edit before anything is saved.</p>
            <textarea
              className="textarea"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={'{\n  "version": 1,\n  "name": "…",\n  "kcal": …\n}'}
              spellCheck={false}
              aria-label="Paste the AI's reply"
            />
            <div className="step-actions">
              <button className="btn btn-primary" disabled={!code.trim()}>
                Preview entry
              </button>
              <button className="btn btn-ghost" onClick={() => setCode("")} disabled={!code}>
                Clear
              </button>
            </div>
            <p className="helper">Reading the pasted code is built in an upcoming step.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
