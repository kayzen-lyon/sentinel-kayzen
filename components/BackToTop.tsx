"use client";

import { useEffect, useState } from "react";

/**
 * Retour en haut de page avec progression de lecture : l'anneau autour du bouton
 * se remplit à mesure que l'on descend dans la page.
 *
 * Cible de 44 px, écouteur de défilement sous requestAnimationFrame, défilement
 * respectant prefers-reduced-motion. Invisible, le bouton est retiré du rendu
 * (visibility: hidden) : ni tabulation ni lecteur d'écran, et rend le focus au contenu principal après le retour en haut.
 */
const R = 20;
const CIRC = 2 * Math.PI * R;

export default function BackToTop() {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
        setVisible(window.scrollY > 600);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const toTop = () => {
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
    const main = document.getElementById("contenu");
    if (main) {
      main.setAttribute("tabindex", "-1");
      main.focus({ preventScroll: true });
    }
  };

  const pct = Math.round(progress * 100);

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label={`Retour en haut de page — ${pct} % de la page parcourus`}
      className={`back-to-top no-print fixed z-[55] flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-muted shadow-[var(--shadow-md)] transition-[opacity,transform,color] duration-200 hover:text-fg ${
        visible ? "translate-y-0 opacity-100" : "invisible translate-y-2 opacity-0"
      }`}
    >
      <svg viewBox="0 0 48 48" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="24" cy="24" r={R} fill="none" stroke="rgb(var(--border))" strokeWidth="3" />
        <circle
          cx="24"
          cy="24"
          r={R}
          fill="none"
          stroke="rgb(var(--brand))"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - progress)}
        />
      </svg>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative h-5 w-5" aria-hidden="true">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
