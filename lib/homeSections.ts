/**
 * Titres H2 des sections de l'accueil, dans l'ordre d'affichage. Chaque composant de section
 * lit son `id` et son `title` ici : la table des matières « Sur cette page » (components/OnThisPage)
 * est donc générée depuis les vrais H2, sans copie à maintenir. Module pur.
 */
export const HOME_SECTIONS = {
  constat: { id: "constat", title: "La sécurité applicative ne suit plus la vitesse du code" },
  moteurs: { id: "moteurs", title: "Deux moteurs de pentest, un même pipeline" },
  service: { id: "service", title: "L'arsenal complet d'un pentester, opérationnel en continu" },
  deroule: { id: "deroule", title: "Du domaine au rapport de test d'intrusion, en quatre étapes" },
  integrations: { id: "integrations", title: "Sentinel s'intègre dans votre chaîne, pas l'inverse" },
  plateforme: { id: "plateforme", title: "L'expertise d'une agence, la puissance d'une plateforme" },
  couverture: { id: "couverture", title: "L'OWASP Top 10 — et bien au-delà" },
  tarifs: { id: "tarifs", title: "Un tarif pour chaque maturité sécurité" },
  groupe: { id: "groupe", title: "Une nouvelle brique du groupe Kayzen" },
  faq: { id: "faq", title: "Tout ce que vous devez savoir" },
  contact: { id: "contact", title: "Découvrez ce qu'un attaquant verrait sur votre application" },
} as const;
