import Image from "next/image";

const COLS = [
  {
    title: "Service",
    links: [
      { label: "Le service", href: "#service" },
      { label: "Plateforme", href: "#plateforme" },
      { label: "Couverture OWASP", href: "#couverture" },
      { label: "Tarifs", href: "#tarifs" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Groupe Kayzen",
    links: [
      { label: "Kayzen Web (agence)", href: "https://www.kayzen-lyon.com" },
      { label: "Nexus — SEO IA", href: "https://nexus.kayzen-lyon.com" },
      { label: "Konforme — Accessibilité", href: "https://konforme.kayzen-lyon.com" },
      { label: "Contact", href: "mailto:contact@kayzen-lyon.fr" },
    ],
  },
  {
    title: "Légal",
    links: [
      { label: "Mentions légales", href: "/mentions-legales" },
      { label: "Politique de confidentialité", href: "/confidentialite" },
      { label: "CGU", href: "/cgu" },
      { label: "CGV", href: "/cgv" },
      { label: "Accessibilité", href: "/accessibilite" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="band-dark border-t border-border">
      <div className="container-x py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <Image
                src="/logo-mark.png"
                alt="Sentinel by Kayzen"
                width={40}
                height={40}
                className="h-10 w-auto"
              />
              <span className="flex flex-col leading-none">
                <span className="font-heading text-lg font-semibold text-fg">Sentinel</span>
                <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-subtle">
                  by Kayzen
                </span>
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              Pentest IA autonome et cybersécurité offensive. Une entité du groupe
              Kayzen, agence web éco-responsable basée à Lyon.
            </p>
            <p className="mt-4 text-xs text-subtle">
              Propulsé par le moteur open-source Strix (licence Apache 2.0).
            </p>
          </div>

          {COLS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="font-heading text-sm font-semibold text-fg">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      target={l.href.startsWith("http") ? "_blank" : undefined}
                      rel={l.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="text-sm text-muted transition-colors hover:text-fg"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-xs text-subtle">
            © {new Date().getFullYear()} Sentinel by Kayzen — KAYZEN LYON. Tous droits réservés.{" "}
            <a
              href="https://internet.kayzen-lyon.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-fg underline decoration-brand/50 underline-offset-2 hover:text-brand-light"
            >
              Fièrement réalisé par Kayzen Web
            </a>
          </p>
          <p className="flex items-center gap-2 text-xs text-subtle">
            <span className="inline-block h-2 w-2 rounded-full bg-safe" />
            Web éco-responsable · Fait à Lyon
          </p>
        </div>
      </div>
    </footer>
  );
}
