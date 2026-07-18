"use client";

import { useState } from "react";

const QA = [
  {
    q: "En quoi Sentinel diffère d'un scanner de vulnérabilités classique ?",
    a: "Un scanner signale des vulnérabilités potentielles à partir de motifs. Sentinel exploite réellement chaque faille et la prouve par un PoC reproductible. Résultat : pas de faux positifs, et des correctifs priorisés sur ce qui est vraiment exploitable.",
  },
  {
    q: "Est-ce que mon code ou mon application est en sécurité pendant les tests ?",
    a: "Oui. Les tests s'exécutent dans un environnement sandbox isolé. Le périmètre, les règles d'engagement et les exclusions sont définis avec vous en amont, et rien n'est mené hors de ce cadre.",
  },
  {
    q: "Sentinel remplace-t-il un pentester humain ?",
    a: "Il démultiplie vos capacités. Sentinel automatise la reconnaissance, l'exploitation et la validation à une échelle et une fréquence impossibles manuellement. Sur les audits managés, nos experts Kayzen interprètent les résultats et vous accompagnent sur la remédiation.",
  },
  {
    q: "Quels types de cibles puis-je tester ?",
    a: "Un dépôt de code (GitHub, GitLab…), une API, une application web déployée ou un domaine. Les tests peuvent être menés en white-box, grey-box ou black-box selon l'accès que vous fournissez.",
  },
  {
    q: "Comment fonctionne l'intégration CI/CD ?",
    a: "La plateforme se branche sur votre pipeline et lance un test de sécurité à chaque pull request. Les scans rapides se limitent automatiquement aux fichiers modifiés, et une faille peut bloquer une fusion avant qu'elle n'atteigne la production.",
  },
  {
    q: "Quel est le lien entre Sentinel, Kayzen, Nexus et Konforme ?",
    a: "Sentinel est la nouvelle entité cybersécurité du groupe Kayzen, aux côtés de Nexus (SEO/IA) et Konforme (accessibilité EAA), toutes portées par l'agence lyonnaise Kayzen Web.",
  },
  {
    q: "Mes données restent-elles confidentielles ?",
    a: "Oui. Les résultats d'audit vous appartiennent, sont stockés de façon sécurisée et ne sont jamais partagés. Un accord de confidentialité est signé avant toute prestation managée.",
  },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="border-t border-border py-24">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Questions fréquentes</span>
          <h2
            className="mt-4 font-heading font-bold text-fg"
            style={{ fontSize: "var(--text-4xl)" }}
          >
            Tout ce que vous devez savoir
          </h2>
        </div>

        <div className="mx-auto mt-12 max-w-3xl divide-y divide-border rounded-2xl border border-border bg-card">
          {QA.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={i}>
                <button
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                >
                  <span className="font-heading text-base font-semibold text-fg">
                    {item.q}
                  </span>
                  <span
                    className={`flex-none text-brand-light transition-transform duration-300 ${
                      isOpen ? "rotate-45" : ""
                    }`}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </span>
                </button>
                <div
                  className="grid transition-all duration-300 ease-out"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <p className="px-6 pb-5 text-[0.95rem] leading-relaxed text-muted">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
