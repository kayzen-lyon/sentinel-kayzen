/* Premier écran : le texte à gauche, l'animation d'audit (HeroMotion) posée sur un
   pan bleu nuit coupé net en biais (styles .apv-hero-* dans globals.css).
   Aucun dégradé, aucun halo. */
import Link from "next/link";
import HeroMotion from "@/components/HeroMotion";
import { ATTACK_CLASS_LABELS } from "@/lib/surface";

export default function Hero() {
  return (
    <section id="contenu" className="apv-hero">
      <div className="apv-hero-top">
        <div className="apv-hero-panel" aria-hidden="true" />
        <div className="container-x apv-hero-grid">
          <div>
            <p className="eyebrow reveal mb-5">Cybersécurité offensive · Groupe Kayzen</p>

            {/* Pas d'animation d'entrée sur le h1 : c'est l'élément LCP. */}
            <h1 className="leading-[1.06] text-fg" data-size="hero">
              Le pentest IA qui trouve vos failles{" "}
              <span className="gradient-text">avant les attaquants.</span>
            </h1>

            <p className="reveal mt-6 max-w-xl text-fg" data-size="lg" data-delay="120">
              Sentinel déploie des agents autonomes qui exécutent réellement votre
              application, exploitent les vulnérabilités et les prouvent par des{" "}
              <strong className="font-semibold">PoC concrets</strong>, soumis à une
              relecture contradictoire avant de vous être remontés. Chaque test
              d&apos;intrusion autonome est borné à une heure d&apos;exécution.
            </p>

            <div className="reveal mt-8 flex flex-col gap-3 sm:flex-row" data-delay="180">
              <Link href="/signup" className="btn btn-primary btn-lg w-full sm:w-auto">
                Scanner mon site gratuitement
                <IconArrow />
              </Link>
              <a href="#contact" className="btn btn-ghost btn-lg w-full sm:w-auto">
                Demander un audit managé
              </a>
            </div>

            <ul className="reveal mt-6 flex flex-wrap gap-2" data-delay="220">
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

          <div className="apv-hero-visual">
            <HeroMotion />
          </div>
        </div>
      </div>

      <div className="container-x">
        <dl className="band-dark apv-stats grid grid-cols-2 gap-6 px-6 py-8 md:grid-cols-4 md:px-10">
          {[
            [String(Object.keys(ATTACK_CLASS_LABELS).length), "classes d'attaque cartographiées"],
            ["OWASP", "Top 10 & WSTG en référence"],
            ["CVE", "corrélées via NVD, CISA KEV et EPSS"],
            ["2", "moteurs : IA (Strix) et open source"],
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
