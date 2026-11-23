"use client";

import { useEffect } from "react";

/**
 * Un rapport est un document sur fond blanc : affiché et imprimé en thème clair, même si le
 * tableau de bord est en sombre ou en OLED. Le thème est rétabli en quittant le rapport ; le
 * réglage enregistré n'est jamais modifié.
 */
export default function ThemeClairForce() {
  useEffect(() => {
    const html = document.documentElement;
    const etaitSombre = html.classList.contains("dark");
    const etaitOled = html.classList.contains("oled");
    const appliquer = () => {
      if (html.classList.contains("dark")) html.classList.remove("dark");
      if (html.classList.contains("oled")) html.classList.remove("oled");
    };
    appliquer();
    // Les réglages (thème, OLED) peuvent remettre une classe : on la retire à nouveau.
    const veille = new MutationObserver(appliquer);
    veille.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => {
      veille.disconnect();
      if (etaitSombre) html.classList.add("dark");
      if (etaitOled) html.classList.add("oled");
    };
  }, []);
  return null;
}
