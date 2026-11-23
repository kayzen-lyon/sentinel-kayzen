/**
 * Référentiel statique du rapport de test d'intrusion : OWASP Top 10 2021, correspondance
 * CWE → catégorie OWASP, métriques CVSS v3.1, recommandations générales et glossaire.
 *
 * Données de référence publiques (owasp.org, cwe.mitre.org, first.org). Elles éclairent les
 * constats ; elles n'en créent jamais : une catégorie n'apparaît que si un constat la porte.
 */

export type CategorieOwasp = {
  code: string;
  libelle: string;
  url: string;
  /** Pourquoi la catégorie compte (introduction du chapitre). */
  enjeu: string;
  /** Recommandations générales (OWASP), affichées seulement si un constat relève de la catégorie. */
  recommandations: string[];
};

export const OWASP_2021: Record<string, CategorieOwasp> = {
  A01: {
    code: "A01:2021",
    libelle: "Contrôle d'accès défaillant",
    url: "https://owasp.org/Top10/A01_2021-Broken_Access_Control/",
    enjeu: "Le contrôle d'accès décide qui peut lire ou modifier quoi. Quand il fait défaut, un utilisateur ordinaire, voire un anonyme, atteint les données ou les fonctions d'autrui : c'est la première cause de fuites de données applicatives.",
    recommandations: [
      "Refuser par défaut : tout accès non explicitement autorisé est interdit, côté serveur.",
      "Vérifier à chaque requête que l'utilisateur possède l'objet demandé (identifiants non devinables ne suffisent pas).",
      "Centraliser les contrôles d'accès dans un composant unique, testé, et journaliser les refus.",
    ],
  },
  A02: {
    code: "A02:2021",
    libelle: "Défaillances cryptographiques",
    url: "https://owasp.org/Top10/A02_2021-Cryptographic_Failures/",
    enjeu: "La cryptographie protège les données en transit et au repos. Un chiffrement absent, faible ou mal configuré expose mots de passe, données personnelles et secrets à quiconque intercepte ou récupère les données.",
    recommandations: [
      "Chiffrer toutes les données en transit (TLS 1.2 minimum, HSTS) et les données sensibles au repos.",
      "Utiliser des algorithmes et bibliothèques reconnus ; proscrire MD5, SHA-1 et les chiffrements maison.",
      "Stocker les mots de passe avec une fonction de hachage adaptée (Argon2id, bcrypt, scrypt).",
    ],
  },
  A03: {
    code: "A03:2021",
    libelle: "Injection",
    url: "https://owasp.org/Top10/A03_2021-Injection/",
    enjeu: "Une injection survient quand une entrée de l'utilisateur est interprétée comme du code : requête SQL, commande système, script dans le navigateur. Elle permet de lire ou modifier la base, d'exécuter des commandes ou de détourner les sessions des utilisateurs.",
    recommandations: [
      "Utiliser des requêtes paramétrées ou un ORM ; ne jamais concaténer une entrée dans une requête ou une commande.",
      "Encoder les sorties selon leur contexte (HTML, attribut, JavaScript, URL) et appliquer une CSP stricte.",
      "Valider les entrées côté serveur par liste d'autorisation (type, longueur, format).",
    ],
  },
  A04: {
    code: "A04:2021",
    libelle: "Conception non sécurisée",
    url: "https://owasp.org/Top10/A04_2021-Insecure_Design/",
    enjeu: "Certaines failles ne viennent pas d'une erreur de code mais d'une conception qui n'a pas prévu l'abus : absence de limite, logique métier contournable, confiance excessive entre composants.",
    recommandations: [
      "Intégrer une modélisation des menaces aux évolutions fonctionnelles sensibles.",
      "Limiter les actions coûteuses ou sensibles (quotas, délais, confirmations).",
      "Séparer les responsabilités et les niveaux de confiance entre composants.",
    ],
  },
  A05: {
    code: "A05:2021",
    libelle: "Mauvaise configuration de sécurité",
    url: "https://owasp.org/Top10/A05_2021-Security_Misconfiguration/",
    enjeu: "Une configuration par défaut ou incomplète (en-têtes absents, messages d'erreur bavards, interfaces exposées) offre à l'attaquant des informations et des points d'entrée qu'aucune ligne de code n'a introduits.",
    recommandations: [
      "Durcir chaque environnement selon un modèle reproductible et automatisé (en-têtes de sécurité, services inutiles retirés).",
      "Désactiver les messages d'erreur détaillés, listings de répertoires et interfaces d'administration exposées.",
      "Contrôler la configuration à chaque déploiement (scan automatique dans la chaîne CI/CD).",
    ],
  },
  A06: {
    code: "A06:2021",
    libelle: "Composants vulnérables et obsolètes",
    url: "https://owasp.org/Top10/A06_2021-Vulnerable_and_Outdated_Components/",
    enjeu: "Les bibliothèques et composants tiers vieillissent : chaque version non corrigée embarque des vulnérabilités publiques, souvent exploitées par des outils automatiques dans les jours qui suivent leur publication.",
    recommandations: [
      "Tenir un inventaire des dépendances (SBOM) et surveiller les alertes CVE associées.",
      "Appliquer les correctifs de sécurité selon un délai défini par gravité.",
      "Retirer les dépendances et fonctionnalités inutilisées.",
    ],
  },
  A07: {
    code: "A07:2021",
    libelle: "Identification et authentification défaillantes",
    url: "https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/",
    enjeu: "L'authentification et la gestion de session garantissent que l'utilisateur est bien celui qu'il prétend être. Leurs faiblesses permettent la prise de contrôle de comptes, y compris administrateurs.",
    recommandations: [
      "Proposer l'authentification multifacteur, au minimum pour les comptes à privilèges.",
      "Limiter les tentatives de connexion et uniformiser les messages d'échec.",
      "Régénérer l'identifiant de session à la connexion et l'invalider à la déconnexion.",
    ],
  },
  A08: {
    code: "A08:2021",
    libelle: "Manque d'intégrité des données et du logiciel",
    url: "https://owasp.org/Top10/A08_2021-Software_and_Data_Integrity_Failures/",
    enjeu: "Le logiciel et ses données doivent provenir d'une source fiable et rester intègres : une mise à jour, une dépendance ou un objet sérialisé non vérifié peut introduire du code malveillant.",
    recommandations: [
      "Vérifier l'intégrité des mises à jour, dépendances et scripts tiers (signatures, Subresource Integrity).",
      "Ne jamais désérialiser des données non fiables sans contrôle de type strict.",
      "Protéger la chaîne CI/CD (revue de code, secrets isolés, droits minimaux).",
    ],
  },
  A09: {
    code: "A09:2021",
    libelle: "Carence de journalisation et de surveillance",
    url: "https://owasp.org/Top10/A09_2021-Security_Logging_and_Monitoring_Failures/",
    enjeu: "Sans journalisation ni surveillance, une attaque passe inaperçue : la fuite est découverte des mois plus tard, souvent par un tiers, et son ampleur reste impossible à établir.",
    recommandations: [
      "Journaliser les événements de sécurité (connexions, refus d'accès, erreurs de validation) sans données sensibles.",
      "Centraliser les journaux et définir des alertes sur les comportements anormaux.",
      "Disposer d'un plan de réponse à incident testé.",
    ],
  },
  A10: {
    code: "A10:2021",
    libelle: "Falsification de requête côté serveur (SSRF)",
    url: "https://owasp.org/Top10/A10_2021-Server-Side_Request_Forgery_%28SSRF%29/",
    enjeu: "Une falsification de requête côté serveur (SSRF) amène le serveur à interroger des adresses choisies par l'attaquant, y compris des services internes ou les métadonnées du fournisseur cloud.",
    recommandations: [
      "Valider et restreindre les destinations des requêtes sortantes par liste d'autorisation.",
      "Refuser les adresses internes, de bouclage et de métadonnées cloud, y compris après redirection.",
      "Isoler les services qui émettent des requêtes sortantes dans un réseau segmenté.",
    ],
  },
};

/** Correspondance CWE → catégorie, d'après les listes CWE de chaque catégorie OWASP Top 10 2021. */
const CWE_PAR_CATEGORIE: Record<string, number[]> = {
  A01: [22, 23, 35, 59, 200, 201, 219, 264, 275, 276, 284, 285, 352, 359, 377, 402, 425, 441, 497, 538, 540, 548, 552, 566, 601, 639, 651, 668, 706, 862, 863, 913, 922, 1275],
  A02: [259, 261, 296, 310, 319, 321, 322, 323, 324, 325, 326, 327, 328, 329, 330, 331, 335, 336, 337, 338, 340, 347, 523, 720, 757, 759, 760, 780, 818, 916],
  A03: [20, 74, 75, 77, 78, 79, 80, 83, 87, 88, 89, 90, 91, 93, 94, 95, 96, 97, 98, 99, 100, 113, 116, 138, 184, 470, 471, 564, 610, 643, 644, 652, 917],
  A04: [73, 183, 209, 213, 235, 256, 257, 266, 269, 280, 311, 312, 313, 316, 419, 430, 434, 444, 451, 472, 501, 522, 525, 539, 579, 598, 602, 642, 646, 650, 653, 656, 657, 799, 807, 840, 841, 927, 1021, 1173],
  A05: [2, 11, 13, 15, 16, 260, 315, 520, 526, 537, 541, 547, 611, 614, 756, 776, 942, 1004, 1032, 1174],
  A06: [937, 1035, 1104],
  A07: [255, 287, 288, 290, 294, 295, 297, 300, 302, 304, 306, 307, 346, 384, 521, 613, 620, 640, 798, 940, 1216],
  A08: [345, 353, 426, 494, 502, 565, 784, 829, 830, 915],
  A09: [117, 223, 532, 778],
  A10: [918],
};
const CATEGORIE_PAR_CWE = new Map<number, string>();
for (const [cat, cwes] of Object.entries(CWE_PAR_CATEGORIE)) for (const n of cwes) CATEGORIE_PAR_CWE.set(n, cat);

/** Numéro d'une CWE écrite « CWE-79 », « cwe 79 » ou « 79 » ; null sinon. */
export function numeroCwe(v: string | null | undefined): number | null {
  const m = /cwe[-\s]?(\d{1,5})\b/i.exec(v || "") ?? /^\s*(\d{1,5})\s*$/.exec(v || "");
  return m ? Number(m[1]) : null;
}

/**
 * Catégorie OWASP d'un constat : celle déclarée (« A03 », « A03:2021 – Injection ») sinon celle
 * déduite de la CWE. null si rien ne permet de la déterminer (jamais devinée).
 */
export function categorieOwasp(owasp: string | null | undefined, cwe: string | null | undefined): CategorieOwasp | null {
  const declaree = /\bA(0[1-9]|10)\b/i.exec(owasp || "");
  if (declaree) return OWASP_2021[`A${declaree[1]}`] ?? null;
  const n = numeroCwe(cwe);
  const cat = n !== null ? CATEGORIE_PAR_CWE.get(n) : undefined;
  return cat ? OWASP_2021[cat] : null;
}

export function urlCwe(cwe: string | null | undefined): string | null {
  const n = numeroCwe(cwe);
  return n !== null ? `https://cwe.mitre.org/data/definitions/${n}.html` : null;
}

export function urlCve(cve: string | null | undefined): string | null {
  const m = /CVE-\d{4}-\d{4,}/i.exec(cve || "");
  return m ? `https://nvd.nist.gov/vuln/detail/${m[0].toUpperCase()}` : null;
}

// ---------- CVSS v3.1 ----------

export type MetriqueCvss = { cle: string; abrev: string; libelle: string; valeurs: Record<string, string>; aide: string };

export const METRIQUES_CVSS: MetriqueCvss[] = [
  { cle: "attack_vector", abrev: "AV", libelle: "Vecteur d'attaque", valeurs: { N: "Réseau", A: "Réseau adjacent", L: "Local", P: "Physique" }, aide: "D'où l'attaquant doit agir : plus il est éloigné, plus le risque est élevé." },
  { cle: "attack_complexity", abrev: "AC", libelle: "Complexité de l'attaque", valeurs: { L: "Faible", H: "Élevée" }, aide: "Conditions hors du contrôle de l'attaquant nécessaires à l'exploitation." },
  { cle: "privileges_required", abrev: "PR", libelle: "Privilèges requis", valeurs: { N: "Aucun", L: "Faibles", H: "Élevés" }, aide: "Niveau de droits dont l'attaquant doit disposer avant l'attaque." },
  { cle: "user_interaction", abrev: "UI", libelle: "Interaction utilisateur", valeurs: { N: "Aucune", R: "Requise" }, aide: "Une victime doit-elle agir (cliquer, ouvrir) pour que l'attaque réussisse." },
  { cle: "scope", abrev: "S", libelle: "Portée", valeurs: { U: "Inchangée", C: "Modifiée" }, aide: "L'exploitation atteint-elle des composants au-delà de celui qui est vulnérable." },
  { cle: "confidentiality", abrev: "C", libelle: "Impact sur la confidentialité", valeurs: { N: "Aucun", L: "Faible", H: "Élevé" }, aide: "Divulgation d'informations." },
  { cle: "integrity", abrev: "I", libelle: "Impact sur l'intégrité", valeurs: { N: "Aucun", L: "Faible", H: "Élevé" }, aide: "Modification non autorisée de données." },
  { cle: "availability", abrev: "A", libelle: "Impact sur la disponibilité", valeurs: { N: "Aucun", L: "Faible", H: "Élevé" }, aide: "Interruption ou dégradation du service." },
];

/** Vecteur CVSS:3.1/… et métriques lisibles, à partir du détail fourni par le moteur ; null si incomplet. */
export function lireCvss(
  detail: unknown
): { vecteur: string; metriques: { libelle: string; valeur: string }[] } | null {
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) return null;
  const d = detail as Record<string, unknown>;
  const parties: string[] = [];
  const metriques: { libelle: string; valeur: string }[] = [];
  for (const m of METRIQUES_CVSS) {
    const brut = d[m.cle] ?? d[m.abrev];
    const v = typeof brut === "string" ? brut.trim().toUpperCase() : "";
    if (!(v in m.valeurs)) return null;
    parties.push(`${m.abrev}:${v}`);
    metriques.push({ libelle: m.libelle, valeur: m.valeurs[v] });
  }
  return { vecteur: `CVSS:3.1/${parties.join("/")}`, metriques };
}

/** Échelle qualitative officielle CVSS v3.1 (FIRST). */
export const ECHELLE_CVSS = [
  { gravite: "Critique", plage: "9,0 – 10,0" },
  { gravite: "Élevée", plage: "7,0 – 8,9" },
  { gravite: "Moyenne", plage: "4,0 – 6,9" },
  { gravite: "Faible", plage: "0,1 – 3,9" },
  { gravite: "Information", plage: "0,0 (aucun impact direct)" },
];

// ---------- Glossaire ----------

export const GLOSSAIRE: { terme: string; definition: string }[] = [
  { terme: "CVSS", definition: "Common Vulnerability Scoring System (FIRST) : note de 0 à 10 de la gravité technique d'une vulnérabilité, calculée à partir de son vecteur." },
  { terme: "CWE", definition: "Common Weakness Enumeration (MITRE) : catalogue des types de faiblesses logicielles (ex. CWE-79, injection de script)." },
  { terme: "CVE", definition: "Common Vulnerabilities and Exposures : identifiant public d'une vulnérabilité précise d'un produit (ex. CVE-2021-44228)." },
  { terme: "OWASP Top 10", definition: "Classement de référence des dix grandes catégories de risques des applications web, publié par l'OWASP Foundation." },
  { terme: "Preuve de concept (PoC)", definition: "Démonstration minimale et contrôlée qu'une vulnérabilité est exploitable, sans en tirer d'avantage." },
  { terme: "Périmètre", definition: "Ensemble des hôtes et applications que le client a autorisés par écrit à tester, sur une période donnée." },
  { terme: "Faux positif", definition: "Alerte d'un outil qui, après vérification, ne correspond pas à une vulnérabilité réelle ; exclu du rapport." },
  { terme: "Remédiation", definition: "Correction ou mesure compensatoire qui supprime ou réduit le risque d'une vulnérabilité." },
  { terme: "Contre-test", definition: "Nouveau test, après correction, qui vérifie que la vulnérabilité n'est plus exploitable." },
  { terme: "XSS", definition: "Cross-Site Scripting : injection de script exécuté dans le navigateur d'une victime." },
  { terme: "Injection SQL", definition: "Insertion de code dans une requête à la base de données via une entrée non contrôlée." },
  { terme: "IDOR", definition: "Insecure Direct Object Reference : accès à l'objet d'un autre utilisateur en modifiant un identifiant." },
  { terme: "SSRF", definition: "Server-Side Request Forgery : le serveur est amené à émettre une requête vers une destination choisie par l'attaquant." },
  { terme: "CSP", definition: "Content Security Policy : en-tête HTTP qui restreint les ressources qu'une page peut charger et exécuter." },
  { terme: "HSTS", definition: "HTTP Strict Transport Security : en-tête qui impose au navigateur de toujours utiliser HTTPS." },
  { terme: "TLS", definition: "Transport Layer Security : protocole qui chiffre les échanges entre le navigateur et le serveur." },
];

// ---------- Sujets de configuration (catégories du scanner Sentinel) ----------

export type SujetConfiguration = { titre: string; enjeu: string; recommandations: string[] };

/** Clé = catégorie émise par le scanner (lib/scanner.ts, lib/insights/*). */
export const SUJETS_CONFIGURATION: Record<string, SujetConfiguration> = {
  "En-têtes": {
    titre: "En-têtes de sécurité HTTP",
    enjeu: "Les en-têtes de sécurité indiquent au navigateur comment protéger l'utilisateur : bloquer les scripts injectés (CSP), imposer HTTPS (HSTS), empêcher l'affichage du site dans un cadre piégé. Ils coûtent quelques lignes de configuration et neutralisent des familles entières d'attaques.",
    recommandations: [
      "Définir une Content-Security-Policy stricte (script-src sans 'unsafe-inline', object-src 'none', frame-ancestors).",
      "Activer HSTS avec une durée d'au moins six mois, puis includeSubDomains une fois tous les sous-domaines en HTTPS.",
      "Ajouter X-Content-Type-Options: nosniff, Referrer-Policy et Permissions-Policy adaptés au site.",
    ],
  },
  TLS: {
    titre: "Chiffrement TLS et certificat",
    enjeu: "TLS chiffre les échanges entre le navigateur et le serveur. Un certificat expiré ou mal émis, ou des versions et suites obsolètes, exposent les échanges à l'interception et dégradent la confiance des visiteurs.",
    recommandations: [
      "N'accepter que TLS 1.2 et 1.3, avec des suites de chiffrement modernes à confidentialité persistante.",
      "Automatiser le renouvellement des certificats et surveiller leur date d'expiration.",
      "Publier un enregistrement CAA pour restreindre les autorités autorisées à émettre des certificats.",
    ],
  },
  Transport: {
    titre: "Transport et redirections HTTPS",
    enjeu: "Chaque page doit être servie en HTTPS, et toute adresse HTTP doit rediriger immédiatement vers sa version chiffrée. Une seule ressource en clair suffit à exposer la session ou le contenu à une modification en transit.",
    recommandations: [
      "Rediriger en 301 toute requête HTTP vers HTTPS, sur l'apex comme sur les sous-domaines.",
      "Supprimer le contenu mixte (scripts, images, formulaires chargés en HTTP).",
      "Combiner la redirection avec HSTS pour supprimer la première requête en clair.",
    ],
  },
  Exposition: {
    titre: "Fichiers et interfaces exposés",
    enjeu: "Des fichiers oubliés sur le serveur (sauvegardes, dépôts Git, fichiers de configuration, consoles d'administration) livrent à un attaquant du code source, des secrets ou un accès direct, sans aucune exploitation.",
    recommandations: [
      "Retirer du serveur web les sauvegardes, archives, dépôts et fichiers d'environnement.",
      "Restreindre les consoles d'administration par réseau ou authentification forte.",
      "Ajouter un contrôle automatique de ces chemins dans la chaîne de déploiement.",
    ],
  },
  Divulgation: {
    titre: "Divulgation d'informations techniques",
    enjeu: "Bannières de serveur, versions de logiciels et messages d'erreur détaillés guident l'attaquant vers les vulnérabilités connues des composants utilisés.",
    recommandations: [
      "Masquer les versions dans les en-têtes Server, X-Powered-By et les pages d'erreur.",
      "Renvoyer des pages d'erreur génériques en production ; journaliser le détail côté serveur.",
      "Tenir à jour les composants dont la version a pu être identifiée.",
    ],
  },
  DNS: {
    titre: "Configuration DNS",
    enjeu: "Le DNS oriente tout le trafic du domaine. Une zone mal tenue (sous-domaine pointant vers un service abandonné, absence de DNSSEC) permet la prise de contrôle de sous-domaines ou l'usurpation du site.",
    recommandations: [
      "Supprimer les enregistrements qui pointent vers des services résiliés (risque de prise de contrôle de sous-domaine).",
      "Activer DNSSEC si le registraire le permet.",
      "Publier un enregistrement CAA et vérifier régulièrement l'inventaire des sous-domaines.",
    ],
  },
  "E-mail": {
    titre: "Authentification des e-mails (SPF, DKIM, DMARC)",
    enjeu: "SPF, DKIM et DMARC empêchent d'envoyer des courriels au nom du domaine. Sans eux, l'hameçonnage usurpant l'identité de l'entreprise auprès de ses clients et fournisseurs est trivial.",
    recommandations: [
      "Publier un SPF terminant par -all ou ~all, sous la limite de 10 recherches DNS.",
      "Signer les envois avec DKIM (clé de 2048 bits).",
      "Passer DMARC de p=none à quarantine puis reject après analyse des rapports (rua).",
    ],
  },
  Cookies: {
    titre: "Cookies et session",
    enjeu: "Les cookies portent la session de l'utilisateur. Sans les attributs Secure, HttpOnly et SameSite, ils peuvent être volés par un script injecté, interceptés en clair ou envoyés lors de requêtes forgées depuis un autre site.",
    recommandations: [
      "Marquer les cookies de session Secure, HttpOnly et SameSite=Lax (ou Strict).",
      "Limiter leur portée (Path, Domain) et leur durée de vie.",
      "Utiliser le préfixe __Host- pour les cookies de session.",
    ],
  },
  Reconnaissance: {
    titre: "Surface d'attaque visible",
    enjeu: "Ce qu'un attaquant découvre sans effort (sous-domaines, technologies, points d'entrée) détermine où il frappera en premier. Réduire et connaître cette surface est la base de toute défense.",
    recommandations: [
      "Tenir un inventaire des actifs exposés et retirer ceux qui ne servent plus.",
      "Ne publier dans robots.txt, le sitemap et le code client aucun chemin sensible.",
      "Surveiller l'apparition de nouveaux sous-domaines et services.",
    ],
  },
  Contenu: {
    titre: "Contenu et scripts tiers",
    enjeu: "Chaque script chargé depuis un tiers s'exécute avec les mêmes droits que le site. Une bibliothèque compromise ou obsolète devient une porte d'entrée pour tous les visiteurs.",
    recommandations: [
      "Ajouter l'intégrité (Subresource Integrity) aux scripts et feuilles de style tiers.",
      "Mettre à jour les bibliothèques JavaScript signalées comme vulnérables.",
      "Réduire le nombre de domaines tiers autorisés et les inscrire dans la CSP.",
    ],
  },
  "Bonnes pratiques": {
    titre: "Bonnes pratiques de sécurité",
    enjeu: "Ces contrôles ne correspondent pas à une faille directe mais facilitent la gestion des incidents et la confiance : point de contact sécurité, politiques publiées, hygiène générale.",
    recommandations: [
      "Publier un fichier /.well-known/security.txt avec un contact et une date d'expiration.",
      "Documenter la procédure de signalement de vulnérabilités.",
      "Réévaluer ces points à chaque évolution majeure du site.",
    ],
  },
  Confidentialité: {
    titre: "Confidentialité et traceurs",
    enjeu: "Les traceurs et services tiers chargés sans consentement exposent l'entreprise à des sanctions (RGPD, directive ePrivacy) et transmettent des données de navigation à des tiers.",
    recommandations: [
      "Ne déposer aucun traceur non essentiel avant le consentement explicite.",
      "Lister les services tiers et leurs finalités dans la politique de confidentialité.",
      "Vérifier régulièrement les requêtes émises au chargement des pages.",
    ],
  },
  CVE: {
    titre: "Vulnérabilités publiques connues (CVE)",
    enjeu: "Une CVE est une vulnérabilité publiée pour une version précise d'un logiciel. Les attaquants l'exploitent à grande échelle dès sa publication : le délai de correction est décisif.",
    recommandations: [
      "Mettre à jour en priorité les composants affectés par une CVE exploitée activement (catalogue CISA KEV).",
      "Suivre les avis de sécurité des éditeurs des composants exposés.",
      "Définir un délai maximal de correction par gravité.",
    ],
  },
};

/** Sujet de configuration d'une catégorie du scanner ; titre par défaut si la catégorie est inconnue. */
export function sujetConfiguration(categorie: string | undefined): SujetConfiguration & { cle: string } {
  const cle = categorie?.trim() || "Autres contrôles";
  return {
    cle,
    ...(SUJETS_CONFIGURATION[cle] ?? {
      titre: cle,
      enjeu: "Contrôles de configuration regroupés par le scanner sous cette catégorie.",
      recommandations: [],
    }),
  };
}

// ---------- Score de sécurité ----------

/** Points retirés par vulnérabilité ouverte, selon sa gravité (documenté en annexe). */
export const PENALITE: Record<"critical" | "high" | "medium" | "low" | "info", number> = {
  critical: 25,
  high: 12,
  medium: 5,
  low: 2,
  info: 0,
};

export const ECHELLE_NOTE: { lettre: string; min: number; sens: string }[] = [
  { lettre: "A", min: 90, sens: "Posture solide : aucune faiblesse majeure ouverte." },
  { lettre: "B", min: 75, sens: "Posture correcte : quelques corrections à planifier." },
  { lettre: "C", min: 60, sens: "Posture moyenne : corrections nécessaires à court terme." },
  { lettre: "D", min: 40, sens: "Posture insuffisante : risques élevés à traiter rapidement." },
  { lettre: "E", min: 20, sens: "Posture faible : plusieurs risques élevés ou critiques." },
  { lettre: "F", min: 0, sens: "Posture critique : exposition majeure, action immédiate." },
];
