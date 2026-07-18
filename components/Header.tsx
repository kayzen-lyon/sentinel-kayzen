"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const NAV = [
  { label: "Le service", href: "#service" },
  { label: "Plateforme", href: "#plateforme" },
  { label: "Couverture", href: "#couverture" },
  { label: "Tarifs", href: "#tarifs" },
  { label: "FAQ", href: "#faq" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "border-b border-border bg-bg/85 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <div className="container-x flex h-[72px] items-center justify-between">
        <a href="#" className="flex items-center gap-2.5" aria-label="Sentinel by Kayzen, accueil">
          <Logo />
          <span className="flex flex-col leading-none">
            <span className="font-heading text-[1.15rem] font-semibold tracking-tight text-fg">
              Sentinel
            </span>
            <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-subtle">
              by Kayzen
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Navigation principale">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-hover hover:text-fg"
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <a
            href="#plateforme"
            className="rounded-xl px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-fg"
          >
            Connexion
          </a>
          <a href="#contact" className="btn btn-primary !px-4 !py-2.5 text-sm">
            Demander un audit
          </a>
        </div>

        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-fg md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
        >
          <span className="sr-only">Menu</span>
          {open ? <IconClose /> : <IconMenu />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-bg px-6 pb-8 pt-4 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Navigation mobile">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-medium text-fg hover:bg-hover"
              >
                {n.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            <a
              href="#contact"
              onClick={() => setOpen(false)}
              className="btn btn-primary w-full"
            >
              Demander un audit
            </a>
            <a
              href="#plateforme"
              onClick={() => setOpen(false)}
              className="btn btn-ghost w-full"
            >
              Accéder à la plateforme
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

function Logo() {
  return (
    <Image
      src="/logo-mark.png"
      alt="Sentinel by Kayzen"
      width={40}
      height={40}
      priority
      className="h-10 w-auto drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
    />
  );
}

function IconMenu() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
