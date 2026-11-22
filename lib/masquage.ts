/**
 * Masquage des secrets trouvés pendant les tests (clés d'API, jetons, mots de passe, clés privées).
 *
 * Appliqué à l'ingestion des résultats du moteur de pentest (constats, rapport brut) puis de
 * nouveau à l'affichage et dans chaque export : un secret du client ne doit apparaître dans
 * aucun rapport ni aucun journal. On garde quelques caractères de tête pour que le client
 * reconnaisse le secret concerné et puisse le révoquer.
 *
 * Fonctions pures, testées dans tests/garde-fous.test.ts.
 */

export const MASQUE = "•••• [secret masqué]";

/** Conserve le préfixe (au plus 4 caractères) et masque le reste. */
function garder(prefixe: string): string {
  return `${prefixe.slice(0, 4)}${MASQUE}`;
}

type Regle = { motif: RegExp; remplacer: (m: string, ...g: string[]) => string };

const REGLES: Regle[] = [
  // Blocs de clé privée (PEM, OpenSSH…) : masqués en entier.
  {
    motif: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    remplacer: () => `-----BEGIN PRIVATE KEY----- ${MASQUE} -----END PRIVATE KEY-----`,
  },
  // Jetons à préfixe connu.
  { motif: /\bAKIA[0-9A-Z]{16}\b/g, remplacer: garder }, // AWS
  { motif: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/g, remplacer: garder }, // GitHub
  { motif: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g, remplacer: garder },
  { motif: /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{10,}\b/g, remplacer: garder }, // Stripe
  { motif: /\bxox[abposr]-[A-Za-z0-9-]{10,}\b/g, remplacer: garder }, // Slack
  { motif: /\bAIza[0-9A-Za-z_-]{30,}\b/g, remplacer: garder }, // Google
  { motif: /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}\b/g, remplacer: garder }, // OpenAI, Anthropic
  { motif: /\bglpat-[A-Za-z0-9_-]{20}\b/g, remplacer: garder }, // GitLab
  // JWT (trois segments base64url, le premier commence par eyJ).
  { motif: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, remplacer: garder },
  // En-têtes d'authentification.
  {
    motif: /\b(Authorization\s*:\s*(?:Bearer|Basic|Token)\s+)([^\s"',;]+)/gi,
    remplacer: (_m, tete: string, valeur: string) => `${tete}${garder(valeur)}`,
  },
  // Identifiants dans une URL : https://utilisateur:motdepasse@hôte
  {
    motif: /\b([a-z][a-z0-9+.-]*:\/\/[^\s:/@]+:)([^\s@/]+)(@)/gi,
    remplacer: (_m, debut: string, _mdp: string, fin: string) => `${debut}${MASQUE}${fin}`,
  },
  // Affectations clé = valeur (code, configuration, paramètres d'URL, JSON).
  {
    motif:
      /\b((?:api[_-]?key|apikey|secret|client[_-]?secret|access[_-]?token|refresh[_-]?token|auth[_-]?token|token|password|passwd|pwd|mot[_-]?de[_-]?passe|private[_-]?key)["']?\s*[:=]\s*["']?)([^\s"'&,;}<]{4,})/gi,
    remplacer: (_m, tete: string, valeur: string) => `${tete}${garder(valeur)}`,
  },
];

/** Masque les secrets reconnus dans un texte. Idempotent : un texte déjà masqué ne change plus. */
export function masquerSecrets(texte: string): string {
  let out = texte;
  for (const r of REGLES)
    out = out.replace(r.motif, (m: string, ...args: unknown[]) => {
      // args = groupes capturés…, position, texte complet
      const pos = args[args.length - 2] as number;
      const tout = args[args.length - 1] as string;
      const dejaMasque =
        m.includes(MASQUE) || (m.endsWith("••••") && tout.startsWith(MASQUE.slice(4), pos + m.length));
      if (dejaMasque) return m;
      return r.remplacer(m, ...(args.slice(0, -2) as string[]));
    });
  return out;
}

/** Masque récursivement toutes les chaînes d'une valeur JSON (objets, tableaux). */
export function masquerProfond<T>(valeur: T): T {
  if (typeof valeur === "string") return masquerSecrets(valeur) as T;
  if (Array.isArray(valeur)) return valeur.map((v) => masquerProfond(v)) as T;
  if (valeur && typeof valeur === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(valeur as Record<string, unknown>)) out[k] = masquerProfond(v);
    return out as T;
  }
  return valeur;
}
