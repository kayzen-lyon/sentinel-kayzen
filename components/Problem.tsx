import { HOME_SECTIONS } from "@/lib/homeSections";
const CARDS = [
  {
    tag: "Le rythme a changé",
    title: "Vous livrez en continu, les audits arrivent trop tard",
    body: "CI/CD, déploiements quotidiens, dépendances qui bougent : entre deux pentests annuels, des failles passent en production sans être vues.",
    accent: "risk",
  },
  {
    tag: "Le scan ne suffit plus",
    title: "Les scanners statiques noient vos équipes de faux positifs",
    body: "Des alertes non exploitables, sans contexte métier. Vos développeurs perdent confiance et finissent par tout ignorer.",
    accent: "warn",
  },
  {
    tag: "Le pentest manuel ne scale pas",
    title: "Un pentest classique coûte cher et prend des semaines",
    body: "Facturé à la journée, difficile à planifier, jamais reproductible. Impossible de tester chaque release avec des experts humains.",
    accent: "violet",
  },
];

export default function Problem() {
  return (
    <section id={HOME_SECTIONS.constat.id} className="border-t border-border py-24">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Le constat</span>
          <h2
            className="mt-4 font-heading font-bold text-fg"
            data-size="4xl"
          >
            {HOME_SECTIONS.constat.title}
          </h2>
          <p className="mt-4 text-lg text-muted">
            La surface d'attaque change à chaque livraison. Sentinel teste au
            même rythme que vous déployez.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {CARDS.map((c) => (
            <article key={c.title} className="card p-7">
              <span
                className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                data-tint="soft" data-tone={c.accent}
              >
                {c.tag}
              </span>
              <h3 className="mt-4 font-heading text-xl font-semibold text-fg">
                {c.title}
              </h3>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">
                {c.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
