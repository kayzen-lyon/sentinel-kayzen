"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "sentinel_cookie_ack";

/**
 * Bandeau d'information cookies (RGPD). Le site ne dépose qu'un cookie strictement
 * nécessaire (session), sans traceur tiers : la loi n'impose donc pas de consentement
 * préalable (art. 82 LIL). Ce bandeau informe et se referme ; le choix est mémorisé
 * localement (localStorage), jamais transmis.
 */
export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setVisible(true);
    } catch {
      /* localStorage indisponible : on n'affiche rien plutôt que de gêner */
    }
  }, []);

  function ack() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Information sur les cookies"
      className="fixed inset-x-0 bottom-0 z-[180] border-t border-border bg-card/95 backdrop-blur"
    >
      <div className="container-x flex flex-col items-start gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          Sentinel utilise uniquement un <strong className="text-fg">cookie strictement
          nécessaire</strong> à votre session. Aucun traceur, aucune publicité.{" "}
          <Link href="/confidentialite" className="text-brand underline underline-offset-2">
            En savoir plus
          </Link>
          .
        </p>
        <button type="button" onClick={ack} className="btn btn-primary !py-2 text-sm">
          J'ai compris
        </button>
      </div>
    </div>
  );
}
