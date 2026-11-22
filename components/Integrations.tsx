import { HOME_SECTIONS } from "@/lib/homeSections";
const ITEMS = [
  {
    title: "GitHub App",
    body: "Chaque pull request scannée : statut de check et commentaire récapitulatif publiés directement sur la PR.",
    icon: "github",
  },
  {
    title: "Jira & Linear",
    body: "Transformez n'importe quelle vulnérabilité en ticket, dans le bon projet, en un clic.",
    icon: "ticket",
  },
  {
    title: "Slack & webhooks",
    body: "Notifications en temps réel et alertes de régression du score de sécurité sur vos canaux.",
    icon: "bell",
  },
  {
    title: "Serveur MCP & API",
    body: "Pilotez Sentinel depuis Claude, Cursor ou votre CI grâce au serveur MCP natif et aux clés API.",
    icon: "plug",
  },
  {
    title: "CI/CD",
    body: "Un workflow GitHub Actions généré pour vous : le build échoue si une vulnérabilité passe.",
    icon: "pipeline",
  },
  {
    title: "Scans planifiés",
    body: "Surveillance continue de vos cibles avec alerte automatique dès qu'une régression apparaît.",
    icon: "clock",
  },
];

export default function Integrations() {
  return (
    <section id={HOME_SECTIONS.integrations.id} className="border-t border-border py-24">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">L'écosystème</span>
          <h2
            className="mt-4 font-heading font-bold text-fg"
            data-size="4xl"
          >
            {HOME_SECTIONS.integrations.title}
          </h2>
          <p className="mt-4 text-lg text-muted">
            De la pull request au ticket, du canal Slack à votre IDE : la sécurité
            arrive là où vos équipes travaillent déjà.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((it) => (
            <div
              key={it.title}
              className="list-item flex items-start gap-4 rounded-2xl border border-border bg-card p-6 transition-colors hover:border-border-strong"
            >
              <span className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                <Icon name={it.icon} />
              </span>
              <div>
                <h3 className="font-heading text-base font-semibold text-fg">
                  {it.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  {it.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Icon({ name }: { name: string }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "github":
      return (
        <svg {...common}>
          <path d="M9 19c-4 1.4-4-2.2-5.5-2.8M18 21v-3.4c0-1 .1-1.4-.5-2 2.3-.3 4.5-1.2 4.5-5.1a4 4 0 0 0-1.1-2.8 3.7 3.7 0 0 0-.1-2.8s-.9-.3-3 1.1a10 10 0 0 0-5.6 0C9.1 2.8 8.2 3.1 8.2 3.1a3.7 3.7 0 0 0-.1 2.8A4 4 0 0 0 7 8.7c0 3.9 2.2 4.8 4.5 5.1-.6.6-.6 1.1-.5 2V21" />
        </svg>
      );
    case "ticket":
      return (
        <svg {...common}>
          <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" /><path d="M14 6v12" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
      );
    case "plug":
      return (
        <svg {...common}>
          <path d="M9 2v6M15 2v6M7 8h10v3a5 5 0 0 1-10 0V8ZM12 16v6" />
        </svg>
      );
    case "pipeline":
      return (
        <svg {...common}>
          <circle cx="5" cy="6" r="2.4" /><circle cx="5" cy="18" r="2.4" /><circle cx="19" cy="12" r="2.4" /><path d="M7 6h6a3 3 0 0 1 3 3v.5M7 18h6a3 3 0 0 0 3-3v-.5" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
        </svg>
      );
    default:
      return null;
  }
}
