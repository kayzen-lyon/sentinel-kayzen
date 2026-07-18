const FEATURES = [
  {
    title: "Orchestration multi-agents",
    body: "Un graphe d'agents IA spécialisés — reconnaissance, exploitation, post-exploitation — qui collaborent et enchaînent les vulnérabilités comme une vraie équipe red-team.",
    icon: "graph",
  },
  {
    title: "Validation par PoC réels",
    body: "Chaque faille est exploitée pour de vrai et livrée avec une preuve de concept reproductible. Zéro faux positif : ce que Sentinel remonte est exploitable.",
    icon: "check",
  },
  {
    title: "Proxy d'interception HTTP",
    body: "Manipulation et analyse complètes des requêtes/réponses via Caido pour tester XSS, CSRF, contournements d'authentification et logique métier.",
    icon: "proxy",
  },
  {
    title: "Sandbox d'exploitation",
    body: "Un environnement Python isolé pour écrire et valider des exploits sur mesure, exécuter du code et automatiser la post-exploitation en toute sûreté.",
    icon: "terminal",
  },
  {
    title: "Recon & OSINT automatisés",
    body: "Cartographie de la surface d'attaque, énumération de sous-domaines et fingerprinting pour ne laisser aucun point d'entrée dans l'ombre.",
    icon: "radar",
  },
  {
    title: "Autofix & rapports conformité",
    body: "Correctifs générés en pull requests prêtes à merger et rapports de pentest exploitables pour vos audits et vos exigences réglementaires.",
    icon: "doc",
  },
];

export default function Features() {
  return (
    <section id="service" className="border-t border-border py-24">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">La boîte à outils</span>
          <h2
            className="mt-4 font-heading font-bold text-fg"
            style={{ fontSize: "var(--text-4xl)" }}
          >
            L'arsenal complet d'un pentester, piloté par l'IA
          </h2>
          <p className="mt-4 text-lg text-muted">
            Sentinel s'appuie sur le moteur open-source Strix : les mêmes outils
            que les experts en sécurité offensive, disponibles en continu.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} className="card p-7">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand-light">
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
    case "graph":
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="2.4" /><circle cx="18" cy="7" r="2.4" /><circle cx="12" cy="18" r="2.4" />
          <path d="M8 7.5 10.5 16M15.7 8.4 13.2 16M8.3 6.4 15.6 6.8" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="M12 2 4 5v6c0 4.5 3.2 8.7 8 10.6 4.8-1.9 8-6.1 8-10.6V5l-8-3Z" />
          <path d="m8.7 12 2.3 2.3 4.4-4.5" />
        </svg>
      );
    case "proxy":
      return (
        <svg {...common}>
          <path d="M4 8h16M4 16h16" /><circle cx="9" cy="8" r="1.6" fill="currentColor" stroke="none" /><circle cx="15" cy="16" r="1.6" fill="currentColor" stroke="none" />
        </svg>
      );
    case "terminal":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" /><path d="m7 9 3 3-3 3M13 15h4" />
        </svg>
      );
    case "radar":
      return (
        <svg {...common}>
          <path d="M12 12 19 5M12 21a9 9 0 1 1 8.5-6" /><circle cx="12" cy="12" r="3.4" />
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
