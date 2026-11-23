/**
 * Contenus de référencement de l'accueil (page commerciale) et aides pures de structure.
 * Contraintes vérifiées par tests/accueil.test.ts : mot-clé « pentest » ou « test d'intrusion »
 * dans le title (60 caractères au plus), la meta description (120 à 160) et le H1.
 * Signaux de confiance : uniquement des faits vérifiables dans le code ou les mentions légales.
 */

export const TITRE_ACCUEIL = "Pentest IA et test d’intrusion automatisé | Sentinel";
export const DESCRIPTION_ACCUEIL =
  "Pentest par IA : des agents testent votre application, prouvent chaque faille par un PoC et livrent un rapport de test d’intrusion daté.";
export const H1_ACCUEIL = { debut: "Le pentest IA qui trouve vos failles", fin: "avant les vrais hackers." };

/** « En bref » : l'essentiel de la page en quatre phrases factuelles. */
export const EN_BREF = [
  "Sentinel est une plateforme de test d’intrusion (pentest) par IA, conçue à Lyon par Tarek BELHADJ (Kayzen Web).",
  "Le scanner gratuit vérifie la configuration publique d’un site ; le pentest autonome exploite les failles et les prouve par un PoC, sur un domaine vérifié.",
  "Aucun test actif ne démarre sans autorisation écrite du client (document, périmètre et dates) vérifiée par le serveur.",
  "Le rapport de test d’intrusion est daté, réservé aux membres du compte, avec preuves chiffrées et secrets masqués.",
];

/**
 * Signaux de confiance. Décompte des contrôles : identifiants de contrôle distincts du scanner
 * (lib/scanner.ts, exposure.ts, deepchecks.ts, recon.ts, insights/, jssurface.ts) au 23/11/2026,
 * arrondi à la dizaine inférieure.
 */
export const CONFIANCE: { valeur: string; libelle: string }[] = [
  { valeur: "70+", libelle: "contrôles automatisés dans le scanner" },
  { valeur: "OWASP", libelle: "constats rattachés au Top 10 2021 et aux CWE" },
  { valeur: "CVE", libelle: "versions croisées avec les bases NVD et OSV" },
  { valeur: "1×/jour", libelle: "surveillance de la surface d’attaque" },
];

export type Titre = { id: string | null; texte: string };

/** Identifiant d'ancre lisible à partir d'un titre (« Les offres » → « les-offres »). */
export function ancre(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Entrées de « Sur cette page » : un lien par H2, ancres uniques. */
export function sommaire(titres: Titre[]): { id: string; texte: string }[] {
  const vus = new Set<string>();
  const out: { id: string; texte: string }[] = [];
  for (const t of titres) {
    const texte = t.texte.replace(/\s+/g, " ").trim();
    if (!texte) continue;
    let id = t.id || ancre(texte) || "section";
    let n = 2;
    while (vus.has(id)) id = `${t.id || ancre(texte)}-${n++}`;
    vus.add(id);
    out.push({ id, texte });
  }
  return out;
}
