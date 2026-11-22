import { HOME_SECTIONS } from "@/lib/homeSections";
import { PLANS as QUOTAS, type Limits, type PlanId } from "@/lib/plans";

const PLATFORM_LIMITS = QUOTAS.platform.limits;

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
    cta: "Commencer gratuitement",
    href: "/signup",
    highlight: true,
    features: [
      `Jusqu'à ${PLATFORM_LIMITS.domains} domaines et ${PLATFORM_LIMITS.pentests} pentests autonomes par mois`,
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

const COMPARE_PLANS: PlanId[] = ["free", "platform", "enterprise"];

const COMPARE_ROWS: { key: keyof Limits; label: string; unit?: string }[] = [
  { key: "passiveScans", label: "Scans passifs par mois" },
  { key: "domains", label: "Domaines" },
  { key: "pentests", label: "Pentests autonomes par mois" },
  { key: "members", label: "Membres de l'équipe" },
  { key: "schedules", label: "Surveillances planifiées" },
  { key: "aiBudgetUsd", label: "Budget IA des pentests par mois", unit: " $" },
];

function quota(v: number | null, unit = ""): string {
  if (v === null) return "Illimité";
  if (v === 0) return "Non inclus";
  return `${v}${unit}`;
}

export default function Pricing() {
  return (
    <section id={HOME_SECTIONS.tarifs.id} className="border-t border-border py-24">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Les offres</span>
          <h2
            className="mt-4 font-heading font-bold text-fg"
            data-size="4xl"
          >
            {HOME_SECTIONS.tarifs.title}
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
                  ? "border-brand/50 bg-brand/[0.05] shadow-[var(--shadow-brand)]"
                  : ""
              }`}
            >
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
          Le compte gratuit inclut {QUOTAS.free.limits.passiveScans} scans passifs par mois et {QUOTAS.free.limits.domains} domaine ; le pentest autonome fait partie de l'offre Plateforme. Tarifs indicatifs HT — un devis précis est établi après
          cadrage du périmètre.
        </p>

        <div className="mx-auto mt-14 max-w-4xl overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
            <caption className="mb-4 text-left font-heading text-lg font-semibold text-fg">
              Comparatif des offres de la plateforme : quotas mensuels
            </caption>
            <thead>
              <tr className="border-b border-border-strong">
                <th scope="col" className="py-3 pr-4 font-semibold text-fg">Quota</th>
                {COMPARE_PLANS.map((id) => (
                  <th key={id} scope="col" className="px-4 py-3 font-semibold text-fg">
                    {QUOTAS[id].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <th scope="row" className="py-3 pr-4 font-medium text-fg">Prix</th>
                <td className="px-4 py-3 text-muted">Gratuit</td>
                <td className="px-4 py-3 text-muted">{PLANS[1].price} {PLANS[1].unit} HT</td>
                <td className="px-4 py-3 text-muted">{PLANS[2].price}</td>
              </tr>
              {COMPARE_ROWS.map((row) => (
                <tr key={row.key} className="border-b border-border">
                  <th scope="row" className="py-3 pr-4 font-medium text-fg">{row.label}</th>
                  {COMPARE_PLANS.map((id) => (
                    <td key={id} className="px-4 py-3 text-muted">
                      {quota(QUOTAS[id].limits[row.key], row.unit)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-subtle">
            « Illimité » : sans quota mensuel, des limites anti-abus restent appliquées. L&apos;audit managé est chiffré sur devis.
          </p>
        </div>
      </div>
    </section>
  );
}
