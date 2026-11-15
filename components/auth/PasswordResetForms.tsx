"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

const labelCls = "mb-1.5 block font-heading text-sm font-semibold text-fg";

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-4 rounded-lg border border-risk/30 bg-risk/10 px-4 py-2.5 text-sm text-risk">
      {children}
    </p>
  );
}

/** Étape 1 : demander un lien de réinitialisation. */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ emailConfigured: boolean } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setError(d.error || "Une erreur est survenue.");
      else setDone({ emailConfigured: Boolean(d.emailConfigured) });
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <div role="status" className="mt-6 space-y-3 text-sm text-fg">
        {done.emailConfigured ? (
          <p>
            Si un compte existe pour <strong>{email}</strong>, un e-mail contenant un lien de
            réinitialisation vient d&apos;être envoyé. Il est valable 30 minutes. Pensez à
            vérifier vos courriers indésirables.
          </p>
        ) : (
          <p>
            L&apos;envoi d&apos;e-mails n&apos;est pas encore activé sur ce service : contactez le
            support via la page Contact pour récupérer votre accès.
          </p>
        )}
        <Link href="/login" className="btn w-full">Retour à la connexion</Link>
      </div>
    );

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <label className="block">
        <span className={labelCls}>E-mail du compte</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          placeholder="vous@entreprise.fr"
          className="input"
        />
      </label>
      {error && <Alert>{error}</Alert>}
      <button type="submit" disabled={busy} aria-busy={busy} className="btn btn-primary w-full disabled:opacity-60">
        {busy ? "Un instant…" : "Recevoir un lien"}
      </button>
      <p className="text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-brand-light hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </form>
  );
}

/** Étape 2 : choisir le nouveau mot de passe depuis le lien reçu. */
export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || "Une erreur est survenue.");
        return;
      }
      router.push("/login?reinitialise=1");
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <label className="block">
        <span className={labelCls}>Nouveau mot de passe</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
          className="input"
          aria-describedby="pw-hint"
        />
        <span id="pw-hint" className="mt-1 block text-xs text-subtle">
          8+ caractères, majuscule, minuscule et chiffre.
        </span>
      </label>
      <label className="block">
        <span className={labelCls}>Confirmer le mot de passe</span>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
          className="input"
        />
      </label>
      {error && <Alert>{error}</Alert>}
      <button type="submit" disabled={busy} aria-busy={busy} className="btn btn-primary w-full disabled:opacity-60">
        {busy ? "Un instant…" : "Enregistrer le mot de passe"}
      </button>
    </form>
  );
}
