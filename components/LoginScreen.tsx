"use client";

import { useState } from "react";
import Field from "./Field";
import { Icon } from "./Icons";
import { signIn } from "@/lib/store";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return setError("Enter your email and password.");
    setBusy(true);
    setError("");
    const err = await signIn(email, password);
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <div className="login">
      <form className="card card-pad login-card form" onSubmit={submit} noValidate>
        <span className="login-icon">
          <Icon name="lock" size={24} />
        </span>
        <div>
          <h1 className="login-title">Sign in</h1>
          <p className="muted">Your log, library and goals sync across your devices.</p>
        </div>
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? <div className="form-error" role="alert">{error}</div> : null}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
