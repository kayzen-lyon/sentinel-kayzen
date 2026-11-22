/* « En bref » + « Sur cette page » en tête de l'accueil. La table des matières est générée
   depuis HOME_SECTIONS (lib/homeSections.ts), la source des H2 rendus par chaque section. */
import { HOME_SECTIONS } from "@/lib/homeSections";

export default function OnThisPage() {
  return (
    <section aria-labelledby="en-bref" className="border-t border-border py-16">
      <div className="container-x grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div>
          <h2 id="en-bref" className="font-heading text-2xl font-bold text-fg">
            En bref
          </h2>
          <div className="mt-4 max-w-2xl space-y-3 text-muted">
            <p>
              Sentinel by Kayzen est une plateforme de <strong className="font-semibold text-fg">test d&apos;intrusion
              (pentest) automatisé</strong> : des agents IA, bâtis sur le moteur open source Strix, tentent
              d&apos;exploiter les failles de votre application et joignent une preuve de concept à chaque
              vulnérabilité remontée.
            </p>
            <p>
              Le scan passif, gratuit, contrôle en moins d&apos;une minute le transport et le TLS, les en-têtes,
              le DNS et l&apos;exposition d&apos;un site ; le pentest autonome, inclus dans l&apos;offre Plateforme,
              ne se lance que sur un domaine dont vous avez prouvé la propriété.
            </p>
            <p>
              Les constats sont rattachés à l&apos;OWASP Top 10, et les composants détectés sont corrélés aux CVE
              de la base NVD.
            </p>
            <p>
              Sentinel est conçu par <strong className="font-semibold text-fg">Tarek BELHADJ, Kayzen (EI)</strong>,
              à Lyon, qui mène aussi des audits managés.
            </p>
          </div>
        </div>

        <nav aria-labelledby="sur-cette-page" className="rounded-2xl border border-border bg-card p-6">
          <h2 id="sur-cette-page" className="font-heading text-lg font-semibold text-fg">
            Sur cette page
          </h2>
          <ol className="mt-4 space-y-2 text-sm">
            {Object.values(HOME_SECTIONS).map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-brand underline underline-offset-2 hover:text-fg">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </section>
  );
}
