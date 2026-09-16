"use client";

import { useState } from "react";

export default function AccountForm({ email }: { email: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next !== confirm) {
      setMsg({ ok: false, text: "Les deux nouveaux mots de passe ne correspondent pas." });
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/account/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const d = await r.json();
      if (r.ok) {
        setMsg({ ok: true, text: "Mot de passe mis à jour ✓" });
        setCurrent("");
        setNext("");
        setConfirm("");
      } else {
        setMsg({ ok: false, text: d.error || "Erreur." });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-lg">
      <div className="card p-6">
        <h2 className="font-heading text-lg font-semibold text-fg">Compte</h2>
        <p className="mt-1 text-sm text-muted">
          Connecté en tant que <strong className="text-fg">{email}</strong>
        </p>
      </div>

      <form onSubmit={submit} className="card mt-6 space-y-4 p-6">
        <h3 className="font-heading text-base font-semibold text-fg">
          Changer le mot de passe
        </h3>
        <Field label="Mot de passe actuel" value={current} onChange={setCurrent} autoComplete="current-password" />
        <Field label="Nouveau mot de passe" value={next} onChange={setNext} autoComplete="new-password" hint="8+ caractères, majuscule, minuscule et chiffre." />
        <Field label="Confirmer le nouveau mot de passe" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        {msg && (
          <p
            role="alert"
            className={`rounded-lg border px-3 py-2 text-sm ${
              msg.ok
                ? "border-safe/30 bg-safe/10 text-safe"
                : "border-risk/30 bg-risk/10 text-risk"
            }`}
          >
            {msg.text}
          </p>
        )}
        <button type="submit" disabled={busy} aria-busy={busy} className="btn btn-primary disabled:opacity-60">
          {busy ? "Mise à jour…" : "Mettre à jour"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  autoComplete,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-fg">{label}</span>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        className="w-full rounded-xl border border-border-strong bg-bg px-3.5 py-2.5 text-fg outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30"
      />
      {hint && <span className="mt-1 block text-xs text-subtle">{hint}</span>}
    </label>
  );
}
