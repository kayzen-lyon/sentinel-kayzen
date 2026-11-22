import { ARCHIVE_PROBES, TEXT_PROBES } from "./exposure";
import { SENSITIVE, TAKEOVER } from "./insights/deep";
import { LIB_RULES } from "./insights/http";
import { SECRET_PATTERNS } from "./jssurface";
import { ATTACK_CLASS_LABELS } from "./surface";
import { TRIAGE_QUESTIONS } from "./triage";
import { WAF_SIGNATURES } from "./wafdetect";

/**
 * Signaux de confiance de la vitrine : chaque chiffre est COMPTÉ dans les listes réellement
 * exécutées par le scanner, jamais saisi à la main. Ajouter une sonde la fait apparaître ici.
 * Serveur uniquement (les modules sources importent node:dns / node:net).
 */

const sensitivePaths = new Set([...TEXT_PROBES, ...ARCHIVE_PROBES, ...SENSITIVE].map((p) => p.path)).size;

export const TRUST_CHECKS: { count: number; label: string; scope: string }[] = [
  {
    count: sensitivePaths,
    label: "fichiers et consoles sensibles sondés (.git, .env, sauvegardes SQL, consoles de debug…)",
    scope: "Scan approfondi",
  },
  {
    count: SECRET_PATTERNS.length,
    label: "motifs de secrets recherchés dans le JavaScript livré (AWS, Stripe, GitHub, clés privées…)",
    scope: "Scan approfondi",
  },
  {
    count: Object.keys(ATTACK_CLASS_LABELS).length,
    label: "classes d'attaque associées aux points d'entrée de la carte de surface",
    scope: "Scan approfondi",
  },
  {
    count: TAKEOVER.length,
    label: "services vérifiés pour la prise de contrôle de sous-domaine",
    scope: "Scan approfondi",
  },
  {
    count: LIB_RULES.length,
    label: "bibliothèques JavaScript comparées à leur première version sans faille publique connue",
    scope: "Scan passif",
  },
  {
    count: WAF_SIGNATURES.length,
    label: "signatures de WAF et de CDN reconnues",
    scope: "Scan passif",
  },
  {
    count: TRIAGE_QUESTIONS.length,
    label: "questions de triage avant de confirmer une vulnérabilité du pentest",
    scope: "Pentest autonome",
  },
];

/** Référentiels et sources réellement interrogés ou cités par le code. */
export const TRUST_REFERENCES: { name: string; use: string }[] = [
  { name: "OWASP Top 10 (2021) et WSTG", use: "classification et test de référence associés aux contrôles" }, // lib/insights/scoring.ts
  { name: "CWE", use: "identifiant de faiblesse joint aux constats" }, // lib/insights/scoring.ts
  { name: "CVE via NVD 2.0", use: "corrélation des versions détectées" }, // lib/cve.ts
  { name: "CISA KEV et FIRST EPSS", use: "priorisation des CVE exploitées ou probables" }, // lib/cve.ts
];
