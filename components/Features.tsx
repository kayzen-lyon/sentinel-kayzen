const FEATURES = [
  {
    title: "Validation par PoC réels",
    body: "Chaque faille est exploitée pour de vrai et livrée avec une preuve de concept reproductible, un score CVSS et sa classification OWASP. Zéro faux positif : ce que Sentinel remonte est exploitable.",
    icon: "check",
    accent: "safe",
  },
  {
    title: "Playbooks spécialisés",
    body: "Des scénarios prêts à l'emploi pour les surfaces modernes : API GraphQL, supply-chain, sécurité des LLM et environnements cloud-native. L'expertise d'un red-team, encapsulée.",
    icon: "target",
    accent: "brand",
  },
  {
    title: "Recon, CVE & exposition",
    body: "Énumération de sous-domaines (crt.sh), fingerprinting, corrélation CVE en continu (NVD) et détection d'expositions (.env, .git, secrets). Aucun point d'entrée laissé dans l'ombre.",
    icon: "radar",
    accent: "brand",
  },
  {
    title: "Gouvernance & collaboration",
    body: "Organisations, rôles (RBAC), journal d'audit, approbation humaine avant chaque run offensif et suivi du statut de chaque vulnérabilité. Pensé pour les équipes, pas pour un poste isolé.",
    icon: "shield",
    accent: "secondary",
  },
  {
    title: "Pilotage par API & MCP",
    body: "Un serveur MCP natif et des clés API : déclenchez un scan, listez vos findings ou lancez un pentest directement depuis Claude, Cursor ou votre CI. La sécurité offensive as-code.",
    icon: "terminal",
    accent: "secondary",
  },
  {
    title: "Exports & rapports conformité",
    body: "Rapport de pentest imprimable (PDF), envoi e-mail automatique et exports SARIF / CSV / JSON pour brancher vos findings dans GitHub, vos SIEM ou vos audits réglementaires.",
    icon: "doc",
    accent: "safe",
  },
];

export default function Features() {
  return (
    <section id="service" className="border-t border-border py-24">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">La plateforme</span>
          <h2
            className="mt-4 font-heading font-bold text-fg"
            style={{ fontSize: "var(--text-4xl)" }}
          >
            L'arsenal complet d'un pentester, opérationnel en continu
          </h2>
          <p className="mt-4 text-lg text-muted">
            Au-delà du scan : validation, spécialisation, gouvernance et
            intégration. Tout ce qu'il faut pour industrialiser votre sécurité
            offensive.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article
              key={f.title}
              className="card group p-7 transition-transform hover:-translate-y-1"
            >
              <span
                className="inline-flex h-12 w-12 items-center justify-center rounded-xl transition-colors"
                style={{
                  backgroundColor: `rgb(var(--${f.accent}) / 0.12)`,
                  color: `rgb(var(--${f.accent}))`,
                }}
              >
                <Icon name={f.icon} />
              </span>
              <h3 className="mt-5 font-heading text-lg font-semibold text-fg">
                {f.title}
              </h3>
              <p className="mt-2.5 text-[0.95rem] leading-relaxed text-muted">
                {f.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Icon({ name }: { name: string }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "check":
      return (
        <svg {...common}>
          <path d="M12 2 4 5v6c0 4.5 3.2 8.7 8 10.6 4.8-1.9 8-6.1 8-10.6V5l-8-3Z" />
          <path d="m8.7 12 2.3 2.3 4.4-4.5" />
        </svg>
      );
    case "target":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "radar":
      return (
        <svg {...common}>
          <path d="M12 12 19 5M12 21a9 9 0 1 1 8.5-6" /><circle cx="12" cy="12" r="3.4" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 2 4 5v6c0 4.5 3.2 8.7 8 10.6 4.8-1.9 8-6.1 8-10.6V5l-8-3Z" />
          <circle cx="12" cy="10" r="2.2" /><path d="M8.5 16c.7-2 2-3 3.5-3s2.8 1 3.5 3" />
        </svg>
      );
    case "terminal":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" /><path d="m7 9 3 3-3 3M13 15h4" />
        </svg>
      );
    case "doc":
      return (
        <svg {...common}>
          <path d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M14 3v4h4M9 13h6M9 17h4" />
        </svg>
      );
    default:
      return null;
  }
}
