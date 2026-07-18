const STEPS = [
  {
    n: "01",
    title: "Connectez votre cible",
    body: "Un dépôt GitHub, une API, une application déployée ou un simple domaine. En white-box, grey-box ou black-box — vous fixez le périmètre et les règles d'engagement.",
  },
  {
    n: "02",
    title: "Les agents attaquent",
    body: "Sentinel cartographie la surface d'attaque, lance une équipe d'agents en parallèle et enchaîne les vulnérabilités exactement comme le ferait un attaquant réel.",
  },
  {
    n: "03",
    title: "Chaque faille est prouvée",
    body: "Pas d'alerte spéculative : chaque vulnérabilité est exploitée et accompagnée d'un PoC reproductible, d'un score CVSS et de sa classification OWASP.",
  },
  {
    n: "04",
    title: "Corrigez et rejouez",
    body: "Recevez des correctifs en pull requests et un rapport de conformité. Rebranchez Sentinel sur votre CI/CD pour bloquer les failles à chaque release.",
  },
];

export default function HowItWorks() {
  return (
    <section className="border-t border-border py-24">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Le déroulé</span>
          <h2
            className="mt-4 font-heading font-bold text-fg"
            style={{ fontSize: "var(--text-4xl)" }}
          >
            Opérationnel en moins de 10 minutes
          </h2>
        </div>

        <ol className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n} className="card relative p-7">
              <span className="font-heading text-4xl font-bold text-brand/25">
                {s.n}
              </span>
              <h3 className="mt-3 font-heading text-lg font-semibold text-fg">
                {s.title}
              </h3>
              <p className="mt-2.5 text-[0.95rem] leading-relaxed text-muted">
                {s.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
