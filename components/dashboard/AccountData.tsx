"use client";

import Link from "next/link";
import { useState } from "react";

/** Mes données : export (JSON) et suppression définitive du compte. */
export default function AccountData() {
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || "Suppression impossible.");
        setBusy(false);
        return;
      }
      window.location.assign("/?compte=supprime");
    } catch {
      setError("Impossible de contacter le serveur.");
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="mes-donnees" className="card p-6">
      <h2 id="mes-donnees" className="font-heading text-xl font-semibold text-fg">
        Mes données
      </h2>
      <p className="mt-1.5 max-w-2xl text-sm text-muted">
        Vous pouvez à tout moment récupérer une copie de vos données ou supprimer votre
        compte. Ces droits sont décrits dans la{" "}
        <Link href="/confidentialite" className="text-brand underline underline-offset-2">
          politique de confidentialité
        </Link>
        .
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <a href="/api/account/export" className="btn btn-ghost">
          Télécharger mes données (JSON)
        </a>
        {!confirming && (
          <button type="button" onClick={() => setConfirming(true)} className="btn btn-ghost text-risk">
            Supprimer mon compte
          </button>
        )}
      </div>

      {confirming && (
        <form onSubmit={remove} className="mt-5 max-w-md rounded-xl border border-risk/40 bg-risk/5 p-4">
          <p className="text-sm text-fg">
            <strong>Suppression définitive.</strong> Votre compte, vos scans, vos pentests et
            leurs rapports, vos domaines vérifiés, vos clés API et votre espace personnel
            seront effacés. Cette action ne peut pas être annulée.
          </p>
          <label className="mt-4 block">
            <span className="mb-1.5 block font-heading text-sm font-semibold text-fg">
              Confirmez avec votre mot de passe
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="input"
              aria-describedby={error ? "delete-error" : undefined}
              aria-invalid={error ? true : undefined}
            />
          </label>
          {error && (
            <p id="delete-error" role="alert" className="mt-3 text-sm text-risk">
              {error}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="submit" disabled={busy} aria-busy={busy} className="btn btn-primary disabled:opacity-60">
              {busy ? "Suppression…" : "Supprimer définitivement"}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setPassword("");
                setError(null);
              }}
              className="btn btn-ghost"
            >
              Annuler
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
