"use client";
/* « Le déroulé » en scène fixe (remplacerait components/HowItWorks.tsx).
   Mêmes titre, sur-titre et quatre étapes, mot pour mot. Sur grand écran, un
   panneau reste à l'écran et affiche l'étape en cours pendant que la liste
   défile à côté ; en dessous de 1024 px, les étapes restent des cartes empilées.
   Défilement natif : on ne fait que lire la position, jamais intercepter la molette. */
import { useEffect, useRef, useState } from "react";

const STEPS = [
  {
    n: "01",
    title: "Connectez votre cible",
    body: "Un domaine, une API ou un dépôt GitHub. Le scan passif est instantané et gratuit ; le pentest offensif se débloque après vérification de propriété du domaine.",
  },
  {
    n: "02",
    title: "Les agents attaquent",
    body: "Sentinel cartographie la surface d'attaque, lance une équipe d'agents en parallèle et enchaîne les vulnérabilités exactement comme le ferait un attaquant réel.",
  },
  {
    n: "03",
    title: "Chaque faille est prouvée",
    body: "Pas d'alerte spéculative : chaque vulnérabilité est exploitée et accompagnée d'un PoC reproductible, d'un score CVSS et de sa classification OWASP.",
  },
  {
    n: "04",
    title: "Corrigez, suivez, rejouez",
    body: "Créez des tickets Jira/Linear, exportez en SARIF/CSV/JSON, recevez le rapport par e-mail et rebranchez Sentinel sur votre CI/CD pour bloquer les failles à chaque release.",
  },
];

export default function DerouleScene() {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLOListElement>(null);

  // L'étape active est celle dont le bloc est le plus proche du milieu de l'écran.
  // Position mesurée à chaque défilement (les sections voisines peuvent changer de hauteur).
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const list = listRef.current;
      if (!list) return;
      const bounds = list.getBoundingClientRect();
      if (bounds.bottom < 0 || bounds.top > window.innerHeight) return;
      const mid = window.innerHeight / 2;
      let best = 0;
      let bestDistance = Infinity;
      Array.from(list.children).forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - mid);
        if (d < bestDistance) {
          bestDistance = d;
          best = i;
        }
      });
      setActive(best);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const step = STEPS[active];

  return (
    <section className="apv-scene">
      <div className="container-x">
        <div className="apv-scene-head">
          <span className="eyebrow">Le déroulé</span>
          <h2 className="mt-4 font-heading font-bold text-fg" data-size="4xl">
            Opérationnel en moins de 10 minutes
          </h2>
        </div>

        <div className="apv-scene-grid">
          {/* Décoratif : répète l'étape en cours, déjà lue dans la liste. */}
          <div className="apv-stage band-dark" aria-hidden="true">
            <p className="apv-stage-count">
              <b key={step.n} className="apv-stage-n">{step.n}</b>
              <span>/ {STEPS[STEPS.length - 1].n}</span>
            </p>
            <p key={step.title} className="apv-stage-title">{step.title}</p>
            <div className="apv-stage-rail">
              {STEPS.map((s, i) => (
                <i key={s.n} className={i <= active ? "on" : undefined} />
              ))}
            </div>
          </div>

          <ol className="apv-steps" ref={listRef}>
            {STEPS.map((s, i) => (
              <li key={s.n} className={i === active ? "apv-step on" : "apv-step"}>
                <span aria-hidden="true" className="apv-step-n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
