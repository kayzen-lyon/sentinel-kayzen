"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import ContactCard from "@/components/ContactCard";
import ThemeToggle from "@/components/ui/ThemeToggle";

const NAV = [
  { label: "Le service", href: "/#service" },
  { label: "Plateforme", href: "/#plateforme" },
  { label: "Couverture", href: "/#couverture" },
  { label: "Tarifs", href: "/#tarifs" },
  { label: "FAQ", href: "/#faq" },
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
      className={`site-chrome fixed inset-x-0 top-0 z-50 border-b transition-[border-color,box-shadow] duration-300 ${
        scrolled ? "border-border shadow-[var(--shadow-sm)]" : "border-border"
      }`}
    >
      <div className="container-x flex h-20 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Sentinel by Kayzen, accueil">
          <Logo />
          <span className="flex flex-col leading-none">
            <span className="font-heading text-[1.15rem] font-bold tracking-tight text-heading">
              Sentinel
            </span>{" "}
            <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-subtle">
              by Kayzen
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Navigation principale">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="border-b-2 border-transparent py-2 font-heading text-sm font-semibold whitespace-nowrap text-fg transition-colors duration-150 hover:text-brand"
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ContactCard />
          <ThemeToggle />
          <Link
            href="/login"
            className="px-3 py-2 font-heading text-sm font-semibold text-fg transition-colors duration-150 hover:text-brand"
          >
            Connexion
          </Link>
          <Link href="/signup" className="btn btn-primary">
            Scanner mon site
            <IconArrow />
          </Link>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-fg"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
          >
            <span className="sr-only">Menu</span>
            {open ? <IconClose /> : <IconMenu />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-bg px-6 pb-8 pt-4 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Navigation mobile">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 font-heading text-base font-semibold text-fg hover:bg-bg-elev hover:text-brand"
              >
                {n.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex justify-center pb-1">
              <ContactCard />
            </div>
            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className="btn btn-primary w-full"
            >
              Scanner mon site
            </Link>
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="btn btn-ghost w-full"
            >
              Connexion
            </Link>
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
      alt=""
      width={40}
      height={40}
      priority
      className="h-10 w-auto"
    />
  );
}

function IconArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
