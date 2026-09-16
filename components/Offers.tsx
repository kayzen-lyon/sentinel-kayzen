import Link from "next/link";

const MANAGED = [
  "Audit mené et interprété par les experts Kayzen",
  "Périmètre, règles d'engagement et priorités définis avec vous",
  "Rapport de pentest commenté + restitution",
  "Plan de remédiation priorisé et accompagnement des correctifs",
  "Idéal pour audits ponctuels, conformité et due diligence",
];

const PLATFORM = [
  "Connectez vos dépôts et domaines en autonomie",
  "Lancez des pentests IA à la demande, 24/7",
  "Intégration CI/CD : un scan à chaque pull request",
  "Autofix en pull requests prêtes à merger",
  "Idéal pour équipes produit en déploiement continu",
];

export default function Offers() {
  return (
    <section id="plateforme" className="border-t border-border py-24">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Deux façons de travailler avec nous</span>
          <h2
            className="mt-4 font-heading font-bold text-fg"
            style={{ fontSize: "var(--text-4xl)" }}
          >
            L'expertise d'une agence, la puissance d'une plateforme
          </h2>
          <p className="mt-4 text-lg text-muted">
            Faites piloter votre sécurité par Kayzen, ou prenez la main vous-même.
            La plupart de nos clients combinent les deux.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <article className="card p-8">
            <span className="eyebrow !text-safe-light">Audit managé</span>
            <h3 className="mt-3 font-heading text-2xl font-semibold text-fg">
              Sentinel piloté par Kayzen
            </h3>
            <p className="mt-3 text-muted">
              Nos experts exploitent Sentinel pour vous et transforment les
              résultats en décisions. Vous recevez un vrai pentest, pas une liste
              d'alertes brutes.
            </p>
            <ul className="mt-6 space-y-3">
              {MANAGED.map((i) => (
                <Item key={i} accent="safe">{i}</Item>
              ))}
            </ul>
            <a href="#contact" className="btn btn-primary mt-8 w-full sm:w-auto">
              Demander un audit
            </a>
          </article>

          <article className="card border-brand/40 bg-gradient-to-b from-brand/[0.06] to-transparent p-8">
            <span className="eyebrow">Plateforme self-service</span>
            <h3 className="mt-3 font-heading text-2xl font-semibold text-fg">
              Sentinel en autonomie
            </h3>
            <p className="mt-3 text-muted">
              Le pentest IA continu, intégré à votre workflow de dev. Branchez vos
              repos, définissez vos cibles et laissez les agents tourner à chaque
              livraison.
            </p>
            <ul className="mt-6 space-y-3">
              {PLATFORM.map((i) => (
                <Item key={i} accent="brand">{i}</Item>
              ))}
            </ul>
            <Link href="/signup" className="btn btn-ghost mt-8 w-full sm:w-auto">
              Scanner mon site maintenant
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}

function Item({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent: "safe" | "brand";
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full"
        style={{
          backgroundColor: `rgb(var(--${accent}) / 0.15)`,
          color: `rgb(var(--${accent === "brand" ? "brand-light" : "safe"}))`,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m5 12 4 4 10-10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-[0.95rem] leading-relaxed text-muted">{children}</span>
    </li>
  );
}
