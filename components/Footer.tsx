/* eslint-disable @next/next/no-img-element -- petit logo local ; next/image impose un style en ligne que la CSP interdit */
import Link from "next/link";
import { COMPANY, KAYZEN_APPS } from "@/lib/company";
import DigitalContactCard from "@/components/DigitalContactCard";

/**
 * Pied de page — même structure que kayzen-lyon.com, adaptée à Sentinel :
 * bloc marque + coordonnées + réseaux, trois colonnes de plan du site, applications
 * du groupe, « Nous trouver », bandeau légal (éditeur, hébergeur, domaine, SIRET).
 *
 * La carte Google n'est pas embarquée : un lien vers la fiche d'établissement suffit
 * et ne dépose aucun traceur (la CSP du site interdit d'ailleurs toute iframe).
 */

const COLS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Sentinel",
    links: [
      { label: "Le service", href: "/#service" },
      { label: "Plateforme", href: "/#plateforme" },
      { label: "Couverture OWASP", href: "/#couverture" },
      { label: "Tarifs", href: "/#tarifs" },
      { label: "FAQ", href: "/#faq" },
      { label: "Contact & devis", href: "/#contact" },
    ],
  },
  {
    title: "Plateforme",
    links: [
      { label: "Créer un compte", href: "/signup" },
      { label: "Connexion", href: "/login" },
      { label: "Console", href: "/dashboard" },
      { label: "Scanner un site", href: "/dashboard/scan" },
      { label: "Pentest autonome", href: "/dashboard/pentest" },
      { label: "Mot de passe oublié", href: "/mot-de-passe-oublie" },
    ],
  },
  {
    title: "Coulisses",
    links: [
      { label: "Accessibilité", href: "/accessibilite" },
      { label: "Mentions légales", href: "/mentions-legales" },
      { label: "Confidentialité", href: "/confidentialite" },
      { label: "CGV", href: "/cgv" },
      { label: "CGU", href: "/cgu" },
      // Libellé fixé par l'art. D. 221-5 du Code de la consommation : présent sur chaque page.
      { label: "Renoncer au contrat ici", href: "/retractation" },
    ],
  },
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 flex-none text-gold" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const colTitle = "mb-4 font-heading text-sm font-semibold uppercase tracking-widest text-gold";
const social =
  "flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white/75 transition-[transform,background-color,color] duration-300 hover:-translate-y-0.5 hover:bg-brand hover:text-white";

export default function Footer() {
  return (
    <footer className="spot-dark bg-navy-deep text-white">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link href="/" className="group mb-6 flex items-center gap-2.5">
              <img src="/logo-mark.png" decoding="async" alt="" width={48} height={48} className="h-12 w-auto transition-transform duration-500 group-hover:scale-105" />
              <span className="flex flex-col leading-none">
                <span className="font-heading text-xl font-bold uppercase tracking-tight text-white">Sentinel</span>{" "}
                <span className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-white/70">by Kayzen</span>
                <span className="sr-only"> — accueil</span>
              </span>
            </Link>
            <p className="mb-6 max-w-xs text-sm leading-relaxed text-white/70">
              Pentest IA autonome et cybersécurité offensive. Une marque de Kayzen, agence
              lyonnaise de création web, SEO et cybersécurité.
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-white/70">
                <Icon d="M4 6h16v12H4zM4 7l8 6 8-6" />
                <a href={`mailto:${COMPANY.email}`} className="transition-colors hover:text-white">{COMPANY.email}</a>
              </div>
              <div className="flex items-center gap-3 text-sm text-white/70">
                <Icon d="M5 4h4l2 5-2.500 1.500a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" />
                <a href={COMPANY.phoneHref} className="transition-colors hover:text-white">{COMPANY.phone}</a>
              </div>
              <div className="flex items-center gap-3 text-sm text-white/70">
                <Icon d="M12 21s7-6.200 7-11.500A7 7 0 005 9.500C5 14.800 12 21 12 21zM12 12a2.500 2.500 0 100-5 2.500 2.500 0 000 5z" />
                <span>{COMPANY.addressShort}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-white/70">
                <Icon d="M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2" />
                <span>{COMPANY.hours}</span>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <a href={COMPANY.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn de Kayzen (nouvel onglet)" className={social}>
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.200 24 24 23.227 24 22.271V1.729C24 .774 23.200 0 22.222 0h.003z" />
                </svg>
              </a>
              <a href={COMPANY.twitter} target="_blank" rel="noopener noreferrer" aria-label="X (Twitter) de Kayzen (nouvel onglet)" className={social}>
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                  <path d="M18.244 2.250h3.308l-7.227 8.260 8.502 11.240H16.170l-5.214-6.817L4.990 21.750H1.680l7.730-8.835L1.254 2.250H8.080l4.713 6.231zm-1.161 17.520h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>

          {COLS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className={colTitle}>{col.title}</p>
              <ul className="space-y-1">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="flex min-h-11 items-center text-sm text-white/80 transition-colors duration-150 hover:text-white">
                      <span className="link-grow">{l.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <nav aria-label="Applications du groupe Kayzen" className="mt-12 border-t border-white/10 pt-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-heading text-sm font-semibold uppercase tracking-widest text-gold">Groupe Kayzen</p>
              <p className="mt-1 text-xs text-white/65">Les autres applications conçues par Kayzen.</p>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-1">
              {KAYZEN_APPS.map((app) => (
                <li key={app.name}>
                  <a href={app.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-sm text-white/80 transition-colors hover:text-white">
                    <span className="link-grow">{app.name}</span>
                    <span className="sr-only"> (nouvel onglet)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="mt-12 grid grid-cols-1 gap-8 border-t border-white/10 pt-10 md:grid-cols-2">
          <div>
            <p className={colTitle}>Technologie</p>
            <p className="max-w-md text-sm leading-relaxed text-white/70">
              Propulsé par le moteur open-source Strix (licence Apache 2.0). Les scans passifs
              sont non intrusifs ; un pentest n&apos;est lancé que sur un domaine dont vous avez
              prouvé la propriété.
            </p>
          </div>
          <div>
            <p className={colTitle}>Nous trouver</p>
            <div className="flex flex-col gap-4 rounded-xl border border-white/15 bg-white/5 p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-snug text-white/80">
                {COMPANY.address}
                <br />
                <span className="text-xs text-white/60">{COMPANY.hours}</span>
              </p>
              <div className="band-dark flex flex-none items-center gap-2 !bg-transparent">
                <a
                  href={COMPANY.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center rounded-full border border-white/25 bg-white/10 px-4 font-heading text-xs font-semibold text-white transition-colors hover:bg-white/20"
                >
                  Voir sur Google Maps
                  <span className="sr-only"> (nouvel onglet)</span>
                </a>
                <DigitalContactCard />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-8">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div className="space-y-1 text-xs text-white/80">
              <p>
                © {new Date().getFullYear()} {COMPANY.legalName} — Sentinel by Kayzen
              </p>
              <p>Hébergement : {COMPANY.hosting}</p>
              <p>Nom de domaine : {COMPANY.registrar}</p>
            </div>
            <div className="space-y-1 text-xs text-white/80 md:text-right">
              <p>SIRET {COMPANY.siret} • SIREN {COMPANY.siren}</p>
              <p>APE {COMPANY.ape} • TVA non applicable (franchise en base)</p>
              <p>
                <a href={COMPANY.agency} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white">
                  Réalisé par Kayzen
                  <span className="sr-only"> (nouvel onglet)</span>
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
