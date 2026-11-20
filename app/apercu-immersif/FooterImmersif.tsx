/* Ouverture et signature du pied de page. Dans l'aperçu, elles encadrent le vrai
   <Footer /> sans le modifier ; à l'intégration, elles entreraient dedans.
   Coordonnées : COMPANY (lib/company.ts). Libellés des boutons : ceux du premier écran. */
import Link from "next/link";
import { COMPANY } from "@/lib/company";

export function FooterOuverture() {
  return (
    <div className="border-b border-white/10 bg-navy-deep text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-14 md:py-20 lg:grid-cols-[1.7fr_1fr] lg:items-end">
        <div className="min-w-0">
          <a href={`mailto:${COMPANY.email}`} className="apv-foot-mail">
            {COMPANY.email}
          </a>
          <a href={COMPANY.phoneHref} className="apv-foot-phone">
            {COMPANY.phone}
          </a>
        </div>
        <div className="band-dark flex flex-col items-start gap-3 !bg-transparent lg:items-end">
          <Link href="/signup" className="btn btn-primary btn-lg">
            Scanner mon site gratuitement
          </Link>
          <Link href="/#contact" className="btn btn-ghost btn-lg">
            Demander un audit managé
          </Link>
          <p className="text-sm text-white/70">{COMPANY.hours}</p>
        </div>
      </div>
    </div>
  );
}

/** Nom de la marque en filigrane. Décoratif : le nom est déjà lu dans le pied de page. */
export function FooterFiligrane() {
  return (
    <div aria-hidden="true" className="apv-foot-mark">
      <p>SENTINEL</p>
    </div>
  );
}
