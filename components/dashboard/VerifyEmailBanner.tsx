"use client";

import { useState } from "react";

/** Bandeau affiché tant que l'adresse e-mail n'est pas confirmée (pentests bloqués). */
export default function VerifyEmailBanner({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function resend() {
    if (state === "busy") return;
    setState("busy");
    try {
      const res = await fetch("/api/auth/verify/resend", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (res.ok) setState("sent");
      else {
        setError(d.error || "Échec de l'envoi.");
        setState("error");
      }
    } catch {
      setError("Impossible de contacter le serveur.");
      setState("error");
    }
  }

  return (
    <div role="status" className="border-b border-warn/30 bg-warn/10">
      <div className="container-x flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm text-fg">
        <p>
          Confirmez votre adresse <strong>{email}</strong> pour pouvoir lancer des pentests :
          cliquez sur le lien reçu par e-mail.
        </p>
        {state === "sent" ? (
          <span className="text-safe">E-mail renvoyé ✓</span>
        ) : (
          <span className="flex items-center gap-3">
            {state === "error" && <span className="text-risk">{error}</span>}
            <button
              type="button"
              onClick={resend}
              disabled={state === "busy"}
              className="btn !py-1.5 text-sm disabled:opacity-60"
            >
              {state === "busy" ? "Envoi…" : "Renvoyer l'e-mail"}
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
