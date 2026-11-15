"use client";

import { useSyncExternalStore } from "react";

/** Script inline (dans <head>) : applique le thème avant le premier rendu, sans flash.
 *  Clair par défaut : le sombre ne s'active que si l'utilisateur l'a choisi. */
export const THEME_INIT_SCRIPT = `try{if(localStorage.getItem("theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`;

function subscribe(onChange: () => void) {
  const obs = new MutationObserver(onChange);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}

const isDark = () => document.documentElement.classList.contains("dark");

/** Bouton lune / soleil (comme kayzen-lyon.com). Mémorise le choix dans localStorage. */
export default function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);

  function toggle() {
    const next = !dark;
    // Coupe les transitions le temps du basculement : sinon chaque élément
    // anime sa couleur à son propre rythme et le changement paraît décousu.
    const style = document.createElement("style");
    style.textContent = "*,*::before,*::after{transition:none!important}";
    document.head.appendChild(style);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    requestAnimationFrame(() => requestAnimationFrame(() => style.remove()));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Activer le mode clair" : "Activer le mode sombre"}
      title={dark ? "Mode clair" : "Mode sombre"}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-fg transition-[background-color,color,transform] duration-150 hover:bg-bg-elev hover:text-brand active:scale-[0.97]"
    >
      {dark ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
