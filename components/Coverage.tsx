import { HOME_SECTIONS } from "@/lib/homeSections";
import { TRUST_CHECKS, TRUST_REFERENCES } from "@/lib/trust";

const GROUPS = [
  {
    title: "Contrôle d'accès",
    items: ["IDOR", "Élévation de privilèges", "Contournement d'auth"],
  },
  {
    title: "Injections",
    items: ["SQL / NoSQL", "Commande OS", "SSTI"],
  },
  {
    title: "Côté serveur",
    items: ["SSRF", "XXE", "Désérialisation", "RCE"],
  },
  {
    title: "Côté client",
    items: ["XSS (stored/reflected/DOM)", "Prototype pollution", "CSRF"],
  },
  {
    title: "Logique métier",
    items: ["Race conditions", "Manipulation de paiement", "Bypass de workflow"],
  },
  {
    title: "Auth & session",
    items: ["Attaques JWT", "Fixation de session", "Credential stuffing"],
  },
  {
    title: "API",
    items: ["Auth cassée", "Mass assignment", "Bypass de rate limiting"],
  },
  {
    title: "Infra & cloud",
    items: ["Mauvaises configs", "Services exposés", "Sécurité cloud"],
  },
];

export default function Coverage() {
  return (
    <section id={HOME_SECTIONS.couverture.id} className="border-t border-border py-24">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">La couverture</span>
          <h2
            className="mt-4 font-heading font-bold text-fg"
            data-size="4xl"
          >
            {HOME_SECTIONS.couverture.title}
          </h2>
          <p className="mt-4 text-lg text-muted">
            Les classes de vulnérabilités ciblées par les agents du pentest
            autonome, avec scoring CVSS et classification OWASP.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {GROUPS.map((g) => (
            <div key={g.title} className="card p-6">
              <h3 className="font-heading text-base font-semibold text-fg">
                {g.title}
              </h3>
              <ul className="mt-4 space-y-2">
                {g.items.map((i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-muted">
                    <span className="h-1.5 w-1.5 flex-none rounded-full bg-brand-light" />
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="card p-6 sm:p-8">
            <h3 className="font-heading text-lg font-semibold text-fg">
              Contrôles du scanner, comptés dans le code
            </h3>
            <p className="mt-2 text-sm text-muted">
              Chaque chiffre est calculé à partir des listes de sondes réellement
              exécutées : il évolue avec le moteur, sans saisie manuelle.
            </p>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {TRUST_CHECKS.map((c) => (
                <li key={c.label} className="flex items-start gap-3">
                  <span className="min-w-10 font-heading text-2xl font-bold text-brand">{c.count}</span>
                  <span className="text-sm text-muted">
                    {c.label}
                    <span className="mt-0.5 block text-xs text-subtle">{c.scope}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-6 sm:p-8">
            <h3 className="font-heading text-lg font-semibold text-fg">
              Référentiels utilisés
            </h3>
            <ul className="mt-4 space-y-3">
              {TRUST_REFERENCES.map((r) => (
                <li key={r.name} className="text-sm text-muted">
                  <strong className="font-semibold text-fg">{r.name}</strong> : {r.use}
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-border pt-4 text-sm text-muted">
              Conçu par <strong className="font-semibold text-fg">Tarek BELHADJ, Kayzen (EI)</strong>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
