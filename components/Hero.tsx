/* Premier écran : le texte à gauche, la nuée (mots du pentest) posée sur un pan bleu nuit
   coupé net en biais (styles .apv-hero-* dans globals.css). La nuée est figée si l'utilisateur
   limite les animations. Chiffres du bandeau : faits vérifiables (lib/accueil.ts). */
import Link from "next/link";
import { Nuee } from "@/components/Nuee";
import { CONFIANCE, H1_ACCUEIL } from "@/lib/accueil";

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
              {H1_ACCUEIL.debut}{" "}
              <span className="gradient-text">{H1_ACCUEIL.fin}</span>
            </h1>

            <p className="reveal mt-6 max-w-xl text-fg" data-size="lg" data-delay="120">
              Sentinel déploie des agents autonomes qui exécutent réellement votre
              application, exploitent les vulnérabilités et les prouvent par des{" "}
              <strong className="font-semibold">PoC concrets</strong>, relus avant de
              vous être remontés. Uniquement sur les domaines que vous nous autorisez par écrit à tester.
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
            <Nuee
              words={["PENTEST", "OWASP", "CVE"]}
              palette={{ skyTop: "#0d1621", skyLow: "#3a1a12", sun: "#e16d47", ink: "#f3bd49" }}
              anchor={{ x: 0.5, y: 0.5, width: 0.82 }}
              anchorMobile={{ x: 0.5, y: 0.5, width: 0.86 }}
              reeds={false}
              className="h-[320px] rounded-2xl sm:h-[400px] lg:h-[460px]"
            />
          </div>
        </div>
      </div>

      <div className="container-x">
        <dl className="band-dark apv-stats grid grid-cols-2 gap-6 px-6 py-8 md:grid-cols-4 md:px-10">
          {CONFIANCE.map(({ valeur: n, libelle: l }) => (
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
