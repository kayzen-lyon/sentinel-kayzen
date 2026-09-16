"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";

/** Formulaire de contact conforme RGPD : honeypot anti-bot, consentement explicite,
 *  minimisation (aucun stockage), retours par toasts. */
export default function ContactForm() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get("name") || ""),
      email: String(data.get("email") || ""),
      company: String(data.get("company") || ""),
      message: String(data.get("message") || ""),
      consent: data.get("consent") === "on",
      website: String(data.get("website") || ""), // honeypot
    };
    inFlight.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Message envoyé. Nous vous répondons sous 24 h ouvrées.");
        form.reset();
      } else {
        toast.error(d.error || "L'envoi a échoué.");
      }
    } catch {
      toast.error("Impossible de contacter le serveur.");
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-8 max-w-xl text-left">
      {/* Honeypot : masqué aux humains, laissé vide ; les bots le remplissent. */}
      <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden">
        <label htmlFor="website">Ne pas remplir</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label="Nom" autoComplete="name" required />
        <Field name="email" label="E-mail" type="email" autoComplete="email" required />
      </div>
      <div className="mt-4">
        <Field name="company" label="Société (optionnel)" autoComplete="organization" />
      </div>
      <div className="mt-4">
        <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-fg">
          Votre besoin
        </label>
        <textarea
          id="message"
          name="message"
          required
          minLength={10}
          rows={4}
          className="input w-full resize-y"
          placeholder="Décrivez votre périmètre, vos échéances…"
        />
      </div>

      <label className="mt-4 flex items-start gap-3 text-sm text-muted">
        <input type="checkbox" name="consent" required className="mt-1 h-4 w-4 flex-none" />
        <span>
          J'accepte que mes données soient utilisées pour traiter ma demande.{" "}
          <Link href="/confidentialite" className="text-brand underline underline-offset-2">
            Politique de confidentialité
          </Link>
          . Aucune donnée n'est cédée à un tiers.
        </span>
      </label>

      <button
        type="submit"
        disabled={loading}
        aria-busy={loading}
        className="btn btn-primary mt-6 w-full disabled:opacity-60 sm:w-auto"
      >
        {loading ? "Envoi…" : "Envoyer ma demande"}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  autoComplete,
  required,
}: {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-fg">{label}</span>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        className="input w-full"
      />
    </label>
  );
}
