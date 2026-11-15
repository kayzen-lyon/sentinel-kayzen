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
    <section id="couverture" className="border-t border-border py-24">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">La couverture</span>
          <h2
            className="mt-4 font-heading font-bold text-fg"
            data-size="4xl"
          >
            L'OWASP Top 10 — et bien au-delà
          </h2>
          <p className="mt-4 text-lg text-muted">
            Sentinel identifie, valide et exploite un large spectre de
            vulnérabilités, avec scoring CVSS et classification OWASP.
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
      </div>
    </section>
  );
}
