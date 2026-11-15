/**
 * Coordonnées de l'éditeur — source unique, alignée sur kayzen-lyon.com
 * (src/lib/constants.ts). `address` = locaux (visite, carte, fiche Google) ;
 * le siège social ne figure que dans les documents juridiques (/mentions-legales).
 */
export const COMPANY = {
  name: "KAYZEN",
  product: "Sentinel",
  legalName: "KAYZEN EI",
  site: "https://sentinel.kayzen-lyon.com",
  agency: "https://www.kayzen-lyon.com",
  email: "contact@kayzen-lyon.fr",
  phone: "04 87 77 68 61",
  phoneHref: "tel:+33487776861",
  address: "6 Rue de Bourgogne, 69009 Lyon",
  addressShort: "Lyon 9e, Auvergne-Rhône-Alpes",
  hours: "Lun — Ven, 9h — 19h",
  // Fiche d'établissement Google (CID stable), comme sur kayzen-lyon.com.
  mapsUrl: "https://maps.google.com/?cid=13733496944041442777",
  reviewsUrl: "https://maps.google.com/?cid=13733496944041442777",
  linkedin: "https://www.linkedin.com/in/kayzen-lyon/",
  twitter: "https://x.com/KayzenLyon",
  siret: "493 857 262 00098",
  siren: "493 857 262",
  ape: "62.01Z",
  hosting: "Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis",
  registrar: "IONOS SARL, 7 place de la Gare, 57200 Sarreguemines, France",
} as const;

/** Applications du groupe (pied de page), mêmes liens que kayzen-lyon.com. */
export const KAYZEN_APPS = [
  { name: "Kayzen Web (agence)", href: "https://www.kayzen-lyon.com" },
  { name: "Nexus", href: "https://nexus.kayzen-lyon.com/" },
  { name: "Konforme", href: "https://konforme.kayzen-lyon.com/" },
  { name: "Konsent", href: "https://konsent.kayzen-lyon.com/#scan" },
  { name: "Sésame", href: "https://sesame.kayzen-lyon.com/" },
  { name: "Sésame Éclair", href: "https://eclair.kayzen-lyon.com/" },
  { name: "Kayzen VPN", href: "https://vpn.kayzen-lyon.com/" },
] as const;
