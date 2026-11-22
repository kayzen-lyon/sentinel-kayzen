"use client";
/* eslint-disable @next/next/no-img-element -- petit logo local ; next/image impose un style en ligne que la CSP interdit */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import DigitalContactCard from "@/components/DigitalContactCard";
import ThemeToggle from "@/components/ui/ThemeToggle";

const NAV = [
  { label: "Le service", href: "/#service" },
  { label: "Plateforme", href: "/#plateforme" },
  { label: "Couverture", href: "/#couverture" },
  { label: "Tarifs", href: "/#tarifs" },
  { label: "Cours", href: "/blog" },
  { label: "FAQ", href: "/#faq" },
  { label: "Contact", href: "/#contact" },
];

/**
 * En-tête, même comportement que kayzen-lyon.com :
 * - matériau translucide (.site-chrome), filet inférieur seulement quand du contenu passe dessous ;
 * - « intelligent » : s'efface en descendant, revient dès qu'on remonte (jamais tant
 *   qu'un menu est ouvert ou que le focus clavier est dedans) ;
 * - cibles de 44 px, carte de contact (QR codes) et thème en icônes ;
 * - panneau mobile avec piège de focus et fermeture à Échap.
 */
export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let lastY = window.scrollY;
    let downStreak = 0;
    let ticking = false;
    const DELTA = 8;
    const TOP_ZONE = 96;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastY;
        setScrolled(y > 8);
        if (y <= TOP_ZONE) {
          downStreak = 0;
          setHidden(false);
        } else if (delta > DELTA) {
          // Deux lectures consécutives vers le bas : filtre les sauts d'ancrage du navigateur.
          downStreak += 1;
          if (downStreak >= 2) setHidden(true);
        } else if (delta < -DELTA) {
          downStreak = 0;
          setHidden(false);
        }
        lastY = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Menu mobile : défilement verrouillé, Échap, piège de focus, retour du focus au bouton.
  useEffect(() => {
    if (!open) return;
    const burger = burgerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = [
        burger,
        ...panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
      ].filter(Boolean) as HTMLElement[];
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
      burger?.focus();
    };
  }, [open]);

  return (
    <header
      data-scrolled={scrolled ? "true" : undefined}
      className={`site-chrome site-chrome--smart fixed inset-x-0 top-0 z-50 ${
        hidden && !open ? "-translate-y-full" : "translate-y-0"
      }`}
      onFocusCapture={() => setHidden(false)}
    >
      <nav
        className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-4 sm:px-6"
        aria-label="Navigation principale"
      >
        <Link href="/" className="relative z-50 flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <img src="/logo-mark.png" decoding="async" alt="" width={44} height={44} className="w-11 shrink-0" />
          <span className="flex flex-col leading-none">
            <span className="font-heading text-lg font-bold uppercase tracking-tight text-heading sm:text-xl">
              Sentinel
            </span>{" "}
            <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-subtle">
              by Kayzen
            </span>
            <span className="sr-only"> — accueil</span>
          </span>
        </Link>

        <div className="hidden items-center gap-4 lg:flex xl:gap-6">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="border-b-2 border-transparent py-2 font-heading text-sm font-semibold whitespace-nowrap text-fg transition-colors duration-150 hover:border-brand hover:text-brand"
            >
              {n.label}
            </a>
          ))}
          <Link
            href="/login"
            className="border-b-2 border-transparent py-2 font-heading text-sm font-semibold whitespace-nowrap text-fg transition-colors duration-150 hover:border-brand hover:text-brand"
          >
            Connexion
          </Link>
          <Link
            href="/signup"
            className="group flex h-11 items-center justify-center gap-1.5 rounded-full btn-primary px-5 font-heading text-sm font-bold whitespace-nowrap transition-colors duration-150"
          >
            Scanner mon site
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>

        <div className="relative z-50 flex items-center gap-1 sm:gap-2">
          <DigitalContactCard />
          <ThemeToggle />
          <button
            ref={burgerRef}
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full text-fg transition-colors duration-150 hover:bg-hover lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            aria-controls="mobile-menu-panel"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d={open ? "M6 6l12 12M18 6 6 18" : "M4 7h16M4 12h16M4 17h16"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </nav>

      {open && (
        <div
          id="mobile-menu-panel"
          ref={panelRef}
          className="max-h-[calc(100dvh-4.5rem)] overflow-y-auto border-t border-border bg-bg px-4 pb-8 pt-3 sm:px-6 lg:hidden"
        >
          <ul className="flex flex-col">
            {NAV.map((n) => (
              <li key={n.href}>
                <a
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 items-center rounded-xl px-3 font-heading text-base font-semibold text-fg hover:bg-hover hover:text-brand"
                >
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-2">
            <Link href="/signup" onClick={() => setOpen(false)} className="btn btn-primary w-full">
              Scanner mon site
            </Link>
            <Link href="/login" onClick={() => setOpen(false)} className="btn btn-ghost w-full">
              Connexion
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
