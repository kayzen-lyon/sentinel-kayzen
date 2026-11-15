"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { COMPANY } from "@/lib/company";

/**
 * Carte de contact numérique — même conception que kayzen-lyon.com : un sélecteur
 * par QR code (Site, Maps, Avis, Contact), coordonnées cliquables, vCard.
 *
 * Rendue dans <body> par un portail : montée dans l'en-tête, la fenêtre était
 * rognée, car `backdrop-filter` (.site-chrome) fait de l'en-tête le bloc
 * conteneur des éléments `position: fixed`.
 *
 * Dialogue modal : focus initial sur « Fermer », piège de focus, Échap,
 * restitution du focus au déclencheur, défilement de la page verrouillé.
 */

type PanelId = "site" | "maps" | "avis" | "vcard";

const PANELS: { id: PanelId; label: string; qr: string; href: string; description: string; icon: string }[] = [
  {
    id: "site",
    label: "Site",
    qr: "/qr/site.svg",
    href: COMPANY.site,
    description: "Ouvrir sentinel.kayzen-lyon.com",
    icon: "M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.500 2.600 3.800 5.600 3.800 9s-1.300 6.400-3.800 9c-2.500-2.600-3.800-5.600-3.800-9S9.500 5.600 12 3z",
  },
  {
    id: "maps",
    label: "Maps",
    qr: "/qr/maps.svg",
    href: COMPANY.mapsUrl,
    description: "Itinéraire vers nos locaux",
    icon: "M12 21s7-6.200 7-11.500A7 7 0 005 9.500C5 14.800 12 21 12 21zM12 12a2.500 2.500 0 100-5 2.500 2.500 0 000 5z",
  },
  {
    id: "avis",
    label: "Avis",
    qr: "/qr/avis.svg",
    href: COMPANY.reviewsUrl,
    description: "Consulter ou laisser un avis Google",
    icon: "M12 3.500l2.600 5.300 5.900.900-4.200 4.100 1 5.800L12 16.900l-5.300 2.700 1-5.800L3.500 9.700l5.900-.900L12 3.500z",
  },
  {
    id: "vcard",
    label: "Contact",
    qr: "/qr/vcard.svg",
    href: "/kayzen-lyon.vcf",
    description: "Ajouter à vos contacts (vCard)",
    icon: "M19 20v-1a5 5 0 00-5-5h-4a5 5 0 00-5 5v1M12 11a4 4 0 100-8 4 4 0 000 8z",
  },
];

function Icon({ d, className = "h-4 w-4" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`flex-none ${className}`} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const QR_ICON = "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z";

export default function DigitalContactCard({ showLabel = false }: { showLabel?: boolean }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<PanelId>("site");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [open]);

  const panel = PANELS.find((p) => p.id === active) ?? PANELS[0];

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label="Ouvrir la carte de contact (QR codes)"
        className={
          showLabel
            ? "inline-flex h-11 items-center gap-2 rounded-full border border-border-strong px-4 font-heading text-sm font-semibold text-fg transition-colors hover:bg-hover"
            : "flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors duration-150 hover:bg-hover hover:text-fg"
        }
      >
        <Icon d={QR_ICON} className="h-5 w-5" />
        {showLabel && <span aria-hidden="true">Carte de contact</span>}
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-end justify-center overflow-y-auto p-4 sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="vcard-title"
          >
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden="true" />

            <div ref={dialogRef} className="vcard-shell qr-card-enter relative my-auto w-full max-w-sm overflow-hidden rounded-3xl">
              <div className="flex items-center justify-between px-5 pb-4 pt-4">
                <div className="flex items-center gap-3">
                  <div className="vcard-monogram flex h-10 w-10 items-center justify-center rounded-2xl" aria-hidden="true">
                    <span className="font-heading text-sm font-black tracking-tight">KS</span>
                  </div>
                  <div>
                    <p id="vcard-title" className="font-heading text-sm font-bold leading-tight text-fg">
                      Sentinel by Kayzen
                    </p>
                    <p className="text-sm font-medium text-muted">Carte de contact numérique</p>
                  </div>
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={() => setOpen(false)}
                  className="vcard-close flex h-11 w-11 flex-none items-center justify-center rounded-full transition-colors"
                  aria-label="Fermer la carte de contact"
                >
                  <Icon d="M6 6l12 12M6 18L18 6" className="h-5 w-5" />
                </button>
              </div>

              <div className="vcard-divider mx-5" />

              <div className="px-5 pb-2 pt-4">
                {/* Un bouton bascule par QR code (aria-pressed), comme sur kayzen-lyon.com. */}
                <div className="vcard-tabs mb-4 flex gap-1" role="group" aria-label="Choix du QR code">
                  {PANELS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={active === p.id}
                      onClick={() => setActive(p.id)}
                      className={`vcard-tab flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-1 py-2 text-sm font-semibold transition-all duration-200 ${
                        active === p.id ? "vcard-tab--active" : "vcard-tab--idle"
                      }`}
                    >
                      <Icon d={p.icon} className="h-3.5 w-3.5" />
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="vcard-qr-frame relative mx-auto flex aspect-square w-full max-w-[13rem] items-center justify-center p-5">
                  {/* eslint-disable-next-line @next/next/no-img-element -- SVG local, net à toute taille */}
                  <img
                    key={panel.id}
                    src={panel.qr}
                    alt={`QR code — ${panel.description}`}
                    className="h-full w-full object-contain"
                    width={256}
                    height={256}
                    decoding="async"
                  />
                  <span className="qr-corner qr-corner--tl" aria-hidden="true" />
                  <span className="qr-corner qr-corner--tr" aria-hidden="true" />
                  <span className="qr-corner qr-corner--bl" aria-hidden="true" />
                  <span className="qr-corner qr-corner--br" aria-hidden="true" />
                </div>

                {/* La légende est un vrai lien : qui regarde déjà l'écran n'a pas de lecteur de QR. */}
                <p className="mb-4 mt-2 text-center text-sm font-medium">
                  {panel.id === "vcard" ? (
                    <a href={panel.href} download="kayzen-lyon.vcf" className="text-muted underline underline-offset-4 transition-colors hover:text-fg">
                      {panel.description}
                    </a>
                  ) : (
                    <a href={panel.href} target="_blank" rel="noopener noreferrer" className="text-muted underline underline-offset-4 transition-colors hover:text-fg">
                      {panel.description}
                      <span className="sr-only"> (nouvel onglet)</span>
                    </a>
                  )}
                </p>
              </div>

              <div className="vcard-divider mx-5" />

              <div className="space-y-1 px-5 py-4">
                <a href={COMPANY.phoneHref} className="vcard-info-row flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 transition-colors">
                  <Icon d="M5 4h4l2 5-2.500 1.500a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" className="h-4 w-4 text-brand" />
                  <span className="text-sm font-medium text-fg">{COMPANY.phone}</span>
                </a>
                <a href={`mailto:${COMPANY.email}`} className="vcard-info-row flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 transition-colors">
                  <Icon d="M4 6h16v12H4zM4 7l8 6 8-6" className="h-4 w-4 text-brand" />
                  <span className="text-sm font-medium text-fg">{COMPANY.email}</span>
                </a>
                <a href={COMPANY.mapsUrl} target="_blank" rel="noopener noreferrer" className="vcard-info-row flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 transition-colors">
                  <Icon d={PANELS[1].icon} className="h-4 w-4 text-brand" />
                  <span className="text-sm font-medium text-fg">
                    {COMPANY.address}
                    <span className="sr-only"> — ouvrir dans Google Maps (nouvel onglet)</span>
                  </span>
                </a>
              </div>

              <div className="px-5 pb-5">
                <a
                  href="/kayzen-lyon.vcf"
                  download="kayzen-lyon.vcf"
                  className="vcard-download-btn flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold transition-all duration-200"
                >
                  <Icon d="M12 4v11M7 11l5 5 5-5M5 20h14" />
                  Enregistrer le contact
                </a>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
