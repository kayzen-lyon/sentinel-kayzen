"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Carte de contact numérique Kayzen Web : coordonnées, vCard téléchargeable et un
 * QR code vCard, + liens site/localisation/avis. Modale accessible (RGAA/WCAG) — focus piégé,
 * Escape, retour du focus au déclencheur, verrou de défilement.
 */
export default function ContactCard() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = triggerRef.current;
    document.body.style.overflow = "hidden";
    // Focus le premier élément focusable de la modale.
    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    focusables?.[0]?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key === "Tab" && focusables && focusables.length > 0) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previouslyFocused?.focus();
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-border-strong px-3.5 text-sm font-medium text-fg transition-colors hover:bg-hover"
      >
        <IconCard />
        <span className="hidden sm:inline">Contact</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            className="absolute inset-0 bg-navy-deep/50 backdrop-blur-sm"
            aria-hidden="true"
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-card-title"
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-lg)]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border p-5">
              <div>
                <h2
                  id="contact-card-title"
                  className="font-heading text-lg font-semibold text-fg"
                >
                  Carte de contact — Kayzen Web
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Sentinel by Kayzen · Cybersécurité offensive
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Fermer la carte de contact"
                className="flex-none rounded-md px-2 py-1 text-muted transition-colors hover:text-fg"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-5">
              <dl className="space-y-2 text-sm">
                <Row label="Téléphone">
                  <a href="tel:+33487776861" className="text-brand hover:underline">
                    +33 (0)4 87 77 68 61
                  </a>
                </Row>
                <Row label="E-mail">
                  <a
                    href="mailto:contact@kayzen-lyon.fr"
                    className="text-brand hover:underline"
                  >
                    contact@kayzen-lyon.fr
                  </a>
                </Row>
                <Row label="Adresse">6, rue Pierre Termier, 69009 Lyon</Row>
              </dl>

              <div className="mt-6 flex flex-col items-center">
                <span className="rounded-xl border border-border bg-bg p-2.5">
                  <Image
                    src="/qr/vcard.svg"
                    alt="QR code de la carte de visite vCard de Kayzen Web"
                    width={180}
                    height={180}
                    className="h-auto w-44"
                    unoptimized
                  />
                </span>
                <p className="mt-3 text-center text-xs text-subtle">
                  Scannez pour enregistrer le contact
                </p>
              </div>

              <a
                href="/kayzen-lyon.vcf"
                download
                className="btn btn-primary mt-5 w-full"
              >
                Enregistrer dans mes contacts
              </a>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
                <a
                  href="https://sentinel.kayzen-lyon.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand hover:underline"
                >
                  Site web
                <span className="sr-only"> (nouvel onglet)</span></a>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=KAYZEN%20LYON%2C%206%20rue%20Pierre%20Termier%2C%2069009%20Lyon"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand hover:underline"
                >
                  Localisation
                <span className="sr-only"> (nouvel onglet)</span></a>
                <a
                  href="https://www.google.com/search?q=KAYZEN%20LYON%20avis"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand hover:underline"
                >
                  Avis Google
                <span className="sr-only"> (nouvel onglet)</span></a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-24 flex-none text-subtle">{label}</dt>
      <dd className="text-fg">{children}</dd>
    </div>
  );
}

function IconCard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="11" r="2" />
      <path d="M14 10h4M14 13h4M5.5 16c.5-1.3 1.6-2 3-2s2.5.7 3 2" />
    </svg>
  );
}
