import Link from "next/link";
import HeroMotion from "@/components/HeroMotion";

export default function Hero() {
  return (
    <section id="contenu" className="relative overflow-hidden pt-20">
      <div className="container-x py-16 sm:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div>
            <p className="eyebrow reveal mb-5">Cybersécurité offensive · Groupe Kayzen</p>

            {/* Pas d'animation d'entrée sur le h1 : c'est l'élément LCP, il doit être visible tout de suite. */}
            <h1
              className="leading-[1.06] text-fg"
              data-size="hero"
            >
              Des hackers IA qui trouvent vos failles{" "}
              <span className="gradient-text">avant les vrais.</span>
            </h1>

            <p
              className="reveal mt-6 max-w-xl text-fg"
              data-size="lg" data-delay="120"
            >
              Sentinel déploie des agents autonomes qui exécutent réellement votre
              application, exploitent les vulnérabilités et les prouvent par des{" "}
              <strong className="font-semibold">PoC concrets</strong> — pas
              de faux positifs. Un pentest complet en heures, pas en semaines.
            </p>

            <div
              className="reveal mt-8 flex flex-col gap-3 sm:flex-row"
              data-delay="180"
            >
              <Link href="/signup" className="btn btn-primary btn-lg w-full sm:w-auto">
                Scanner mon site gratuitement
                <IconArrow />
              </Link>
              <a href="#contact" className="btn btn-ghost btn-lg w-full sm:w-auto">
                Demander un audit managé
              </a>
            </div>

            <ul
              className="reveal mt-6 flex flex-wrap gap-2"
              data-delay="220"
            >
              {["Moteur open-source Strix", "PoC validés", "Rapports prêts pour la conformité"].map(
                (t) => (
                  <li key={t} className="chip">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
                    {t}
                  </li>
                )
              )}
            </ul>
          </div>

          <HeroMotion />
        </div>

        <dl className="band-dark stat-band mt-16 grid grid-cols-2 gap-6 px-6 py-8 md:grid-cols-4 md:px-10">
          {[
            ["100+", "vecteurs testés"],
            ["OWASP", "Top 10 & au-delà"],
            ["0", "faux positif — chaque faille prouvée"],
            ["24/7", "surveillance continue"],
          ].map(([n, l]) => (
            <div key={l} className="text-center">
              <dt className="font-heading text-3xl font-extrabold text-gold md:text-4xl">{n}</dt>
              <dd className="mt-1 text-sm text-muted">{l}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function IconArrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
