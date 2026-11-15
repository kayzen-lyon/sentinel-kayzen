"use client";
/* eslint-disable @next/next/no-img-element -- petit logo local ; next/image impose un style en ligne que la CSP interdit */

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { safeInternalPath } from "@/lib/redirect";
import { useToast } from "@/components/ui/Toast";

export default function AuthCard({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const next = safeInternalPath(params.get("next"));
  // Pré-rempli depuis un lien d'invitation (?email=…).
  const [email, setEmail] = useState(params.get("email") || "");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${isSignup ? "signup" : "login"}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          isSignup ? { email, password, name } : { email, password }
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Une erreur est survenue.");
        setLoading(false);
        return;
      }
      toast.success(isSignup ? "Compte créé." : "Connexion réussie.");
      router.push(next);
      router.refresh();
    } catch {
      toast.error("Impossible de contacter le serveur.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
        <img
          src="/logo-mark.png" decoding="async"
          alt="Sentinel by Kayzen"
          width={44}
          height={44}
          className="w-11"
        />
        <span className="flex flex-col leading-none">
          <span className="font-heading text-xl font-bold text-heading">Sentinel</span>
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-subtle">
            by Kayzen
          </span>
        </span>
      </Link>

      <div className="card p-8 sm:p-10">
        <h1 className="font-heading text-2xl font-bold text-fg">
          {isSignup ? "Créer votre compte" : "Connexion"}
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          {isSignup
            ? "Accédez à la plateforme de scan de sécurité."
            : "Ravi de vous revoir. Connectez-vous pour lancer un scan."}
        </p>

        {!isSignup && params.get("reinitialise") === "1" && (
          <p role="status" className="mt-4 rounded-lg border border-safe/30 bg-safe/10 px-4 py-2.5 text-sm text-fg">
            Mot de passe modifié. Vous pouvez vous connecter.
          </p>
        )}

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
          {!isSignup && (
            <p className="-mt-2 text-right text-xs">
              <Link href="/mot-de-passe-oublie" className="text-muted hover:text-fg hover:underline">
                Mot de passe oublié ?
              </Link>
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
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
            // Conserve ?next= et ?email= (ex. lien d'invitation) en changeant de formulaire.
            href={`${isSignup ? "/login" : "/signup"}${params.toString() ? `?${params.toString()}` : ""}`}
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
      <span className="mb-1.5 block font-heading text-sm font-semibold text-fg">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        placeholder={placeholder}
        className="input"
      />
      {hint && <span className="mt-1 block text-xs text-subtle">{hint}</span>}
    </label>
  );
}
