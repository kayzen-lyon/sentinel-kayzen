"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { safeInternalPath } from "@/lib/redirect";

export default function AuthCard({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeInternalPath(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${isSignup ? "signup" : "login"}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          isSignup ? { email, password, name } : { email, password }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Une erreur est survenue.");
        setLoading(false);
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
        <Image
          src="/logo-mark.png"
          alt="Sentinel by Kayzen"
          width={44}
          height={44}
          className="h-11 w-auto drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
        />
        <span className="flex flex-col leading-none">
          <span className="font-heading text-xl font-semibold text-fg">Sentinel</span>
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-subtle">
            by Kayzen
          </span>
        </span>
      </Link>

      <div className="card p-8">
        <h1 className="font-heading text-2xl font-bold text-fg">
          {isSignup ? "Créer votre compte" : "Connexion"}
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          {isSignup
            ? "Accédez à la plateforme de scan de sécurité."
            : "Ravi de vous revoir. Connectez-vous pour lancer un scan."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {isSignup && (
            <Field
              label="Nom (optionnel)"
              type="text"
              value={name}
              onChange={setName}
              autoComplete="name"
              placeholder="Jean Dupont"
            />
          )}
          <Field
            label="E-mail"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            required
            placeholder="vous@entreprise.fr"
          />
          <Field
            label="Mot de passe"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
            placeholder="••••••••"
            hint={isSignup ? "8+ caractères, majuscule, minuscule et chiffre." : undefined}
          />

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-risk/30 bg-risk/10 px-3 py-2 text-sm text-risk"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full disabled:opacity-60"
          >
            {loading
              ? "Un instant…"
              : isSignup
                ? "Créer mon compte"
                : "Se connecter"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          {isSignup ? "Déjà un compte ? " : "Pas encore de compte ? "}
          <Link
            href={isSignup ? "/login" : "/signup"}
            className="font-medium text-brand-light hover:underline"
          >
            {isSignup ? "Se connecter" : "Créer un compte"}
          </Link>
        </p>
      </div>

      <p className="mt-6 text-center text-xs text-subtle">
        En continuant, vous acceptez nos{" "}
        <Link href="/cgu" className="underline hover:text-muted">CGU</Link> et notre{" "}
        <Link href="/confidentialite" className="underline hover:text-muted">
          politique de confidentialité
        </Link>
        .
      </p>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
  required,
  placeholder,
  hint,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-fg">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border-strong bg-bg px-3.5 py-2.5 text-fg outline-none transition-colors placeholder:text-subtle focus:border-brand focus:ring-2 focus:ring-brand/30"
      />
      {hint && <span className="mt-1 block text-xs text-subtle">{hint}</span>}
    </label>
  );
}
