const ENTITIES = [
  {
    name: "Kayzen Web",
    role: "Agence de création de sites internet",
    href: "https://www.kayzen-lyon.com",
    color: "brand",
  },
  {
    name: "Nexus",
    role: "SEO & visibilité à l'ère de l'IA (GEO · AEO · LLMO)",
    href: "https://nexus.kayzen-lyon.com",
    color: "violet",
  },
  {
    name: "Konforme",
    role: "Mise en conformité accessibilité (EAA)",
    href: "https://konforme.kayzen-lyon.com",
    color: "safe",
  },
  {
    name: "Sentinel",
    role: "Pentest IA & cybersécurité offensive",
    href: "#",
    color: "brand-light",
    current: true,
  },
];

export default function Group() {
  return (
    <section className="border-t border-border py-24">
      <div className="container-x">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="eyebrow">L'écosystème Kayzen</span>
            <h2
              className="mt-4 font-heading font-bold text-fg"
              style={{ fontSize: "var(--text-4xl)" }}
            >
              Une nouvelle brique du groupe Kayzen
            </h2>
            <p className="mt-4 text-lg text-muted">
              Sentinel rejoint Nexus et Konforme aux côtés de{" "}
              <strong className="font-semibold text-fg">Kayzen Web</strong> :
              même exigence, même équipe lyonnaise. Vos sites sont créés,
              référencés, rendus accessibles — et désormais protégés.
            </p>

            <div className="mt-8 flex items-start gap-4 rounded-2xl border border-safe/25 bg-safe/[0.06] p-5">
              <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-safe/15 text-safe-light">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 3s6 2 6 8-4 9-6 10c-2-1-6-4-6-10s6-8 6-8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                  <path d="M12 8v6M9 11h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              </span>
              <p className="text-sm leading-relaxed text-muted">
                <strong className="font-semibold text-fg">Un seul interlocuteur.</strong>{" "}
                Design, SEO, accessibilité et sécurité par une même équipe : une
                continuité rare, de la création de votre site à sa protection.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {ENTITIES.map((e) => (
              <a
                key={e.name}
                href={e.href}
                target={e.href.startsWith("http") ? "_blank" : undefined}
                rel={e.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className={`card block p-6 ${e.current ? "border-brand/50" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: `rgb(var(--${e.color}))` }}
                  />
                  {e.current && (
                    <span className="rounded-full bg-brand/15 px-2.5 py-0.5 text-[0.7rem] font-semibold text-brand-light">
                      Vous êtes ici
                    </span>
                  )}
                </div>
                <h3 className="mt-4 font-heading text-lg font-semibold text-fg">
                  {e.name}
                </h3>
                <p className="mt-1 text-sm text-muted">{e.role}</p>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
