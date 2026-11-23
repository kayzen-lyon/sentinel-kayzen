"use client";

import { useEffect, useState } from "react";
import { sommaire } from "@/lib/accueil";

/**
 * « Sur cette page » : table des matières générée depuis les H2 du contenu principal. Un H2 sans
 * identifiant en reçoit un (ancre lisible) pour que le lien fonctionne.
 */
export default function SurCettePage() {
  const [entrees, setEntrees] = useState<{ id: string; texte: string }[]>([]);
  useEffect(() => {
    const h2 = [...document.querySelectorAll<HTMLHeadingElement>("main h2")].filter((h) => h.id !== "sur-cette-page-titre");
    const liste = sommaire(h2.map((h) => ({ id: h.id || null, texte: h.textContent || "" })));
    // sommaire() ignore les titres vides : on avance dans la liste au même rythme.
    let i = 0;
    for (const h of h2) {
      if (!(h.textContent || "").trim()) continue;
      if (!h.id) h.id = liste[i].id;
      i++;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture du DOM rendu
    setEntrees(liste);
  }, []);
  return (
    <nav aria-labelledby="sur-cette-page-titre" className="rounded-2xl border border-border bg-card p-5">
      <h2 id="sur-cette-page-titre" className="font-heading text-lg font-semibold text-fg">Sur cette page</h2>
      <ol className="mt-3 space-y-1.5 text-sm">
        {entrees.map((e) => (
          <li key={e.id}>
            <a href={`#${e.id}`} className="text-muted underline-offset-2 hover:text-fg hover:underline">
              {e.texte}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
