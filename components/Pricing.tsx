const PLANS = [
  {
    name: "Audit",
    tagline: "Un pentest ponctuel, clé en main",
    price: "sur devis",
    cta: "Demander un audit",
    href: "#contact",
    highlight: false,
    features: [
      "Une cible (app, API ou dépôt)",
      "Audit managé par les experts Kayzen",
      "Rapport commenté + PoC validés",
      "Plan de remédiation priorisé",
      "Restitution avec vos équipes",
    ],
  },
  {
    name: "Plateforme",
    tagline: "Scan de sécurité continu en self-service",
    price: "à partir de 290 €",
    unit: "/ mois",
    cta: "Démarrer un essai",
    href: "/signup",
    highlight: true,
    features: [
      "Cibles et dépôts illimités*",
      "Scans à la demande, 24/7",
      "Intégration CI/CD (GitHub, GitLab…)",
      "Autofix en pull requests",
      "Surveillance continue & alertes",
    ],
  },
  {
    name: "Entreprise",
    tagline: "Sécurité offensive à l'échelle",
    price: "sur mesure",
    cta: "Parler à un expert",
    href: "#contact",
    highlight: false,
    features: [
      "Audit managé + plateforme illimitée",
      "SLA & environnement dédié",
      "Règles d'engagement personnalisées",
      "Reporting conformité (ISO, SOC2…)",
      "Accompagnement DevSecOps dédié",
    ],
  },
];

export default function Pricing() {
  return (
    <section id="tarifs" className="border-t border-border py-24">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Les offres</span>
          <h2
            className="mt-4 font-heading font-bold text-fg"
            style={{ fontSize: "var(--text-4xl)" }}
          >
            Un tarif pour chaque maturité sécurité
          </h2>
          <p className="mt-4 text-lg text-muted">
            De l'audit ponctuel à la sécurité continue. Sans engagement caché.
          </p>
        </div>

        <div className="mt-14 grid items-start gap-6 lg:grid-cols-3">
          {PLANS.map((p) => (
            <article
              key={p.name}
              className={`card relative p-8 ${
                p.highlight
                  ? "border-brand/50 bg-gradient-to-b from-brand/[0.08] to-transparent shadow-[var(--shadow-brand)]"
                  : ""
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-8 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
                  Le plus choisi
                </span>
              )}
              <h3 className="font-heading text-xl font-semibold text-fg">
                {p.name}
              </h3>
              <p className="mt-1 text-sm text-muted">{p.tagline}</p>
              <p className="mt-6 flex items-baseline gap-1">
                <span className="font-heading text-3xl font-bold text-fg">
                  {p.price}
                </span>
                {p.unit && <span className="text-sm text-subtle">{p.unit}</span>}
              </p>
              <a
                href={p.href}
                className={`btn mt-6 w-full ${p.highlight ? "btn-primary" : "btn-ghost"}`}
              >
                {p.cta}
              </a>
              <ul className="mt-7 space-y-3 border-t border-border pt-7">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-muted">
                    <svg
                      className="mt-0.5 flex-none text-brand-light"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path d="m5 12 4 4 10-10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-subtle">
          * Selon l'offre. Tarifs indicatifs HT — un devis précis est établi après
          cadrage du périmètre.
        </p>
      </div>
    </section>
  );
}
