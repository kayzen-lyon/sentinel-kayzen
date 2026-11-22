import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

/**
 * Preuves d'exploitation (PoC, requêtes et réponses HTTP, analyse technique) chiffrées au repos.
 *
 * Les constats du moteur de pentest sont séparés à l'ingestion : la partie descriptive reste
 * lisible (titre, gravité, description, remédiation) ; les preuves sont chiffrées en AES-256-GCM
 * dans le champ `_preuves`. Elles ne sortent que déchiffrées dans le rapport authentifié, jamais
 * dans les réponses d'API, les exports (Markdown, JSON, CSV, MCP pour IA) ni un lien.
 *
 * Clé : `PREUVES_KEY` (32 octets en base64). À défaut, dérivée de AUTH_SECRET par HKDF avec un
 * contexte distinct de celui des intégrations (lib/secretbox.ts). Définir PREUVES_KEY en
 * production rend la clé indépendante d'une rotation d'AUTH_SECRET.
 */

export const CHAMP_PREUVES = "_preuves";
const PREFIX = "enc:p1:";
const DEV_FALLBACK = "sentinel-dev-only-preuves-key";

/** Clés d'un constat qui constituent une preuve d'exploitation. */
const CLE_PREUVE =
  /^(poc|exploit|evidence|proof|preuve|request|response|http_?request|http_?response|technical_analysis|reproduction|steps_to_reproduce|curl|payloads|screenshot)/i;

export function estClePreuve(cle: string): boolean {
  return CLE_PREUVE.test(cle);
}

/** Sépare la partie descriptive et les preuves d'un constat (fonction pure). */
export function separerPreuves(payload: unknown): {
  publique: Record<string, unknown> | null;
  preuves: Record<string, unknown> | null;
} {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return { publique: null, preuves: null };
  const publique: Record<string, unknown> = {};
  const preuves: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload as Record<string, unknown>)) {
    if (k === CHAMP_PREUVES) continue;
    if (estClePreuve(k)) preuves[k] = v;
    else publique[k] = v;
  }
  return { publique, preuves: Object.keys(preuves).length ? preuves : null };
}

/** Retire les preuves (chiffrées ou non) d'un constat : forme des API et des exports. */
export function sansPreuves(payload: unknown): { payload: Record<string, unknown> | null; aPreuve: boolean } {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return { payload: null, aPreuve: false };
  const p = payload as Record<string, unknown>;
  const { publique, preuves } = separerPreuves(p);
  return { payload: publique, aPreuve: Boolean(preuves) || typeof p[CHAMP_PREUVES] === "string" };
}

function cle(): Buffer {
  const explicite = process.env.PREUVES_KEY;
  if (explicite) {
    const k = Buffer.from(explicite, "base64");
    if (k.length !== 32) throw new Error("PREUVES_KEY doit faire 32 octets (base64).");
    return k;
  }
  const base = process.env.AUTH_SECRET || "";
  if (process.env.NODE_ENV === "production" && base.length < 16)
    throw new Error("PREUVES_KEY ou AUTH_SECRET requis pour chiffrer les preuves.");
  return Buffer.from(hkdfSync("sha256", base || DEV_FALLBACK, "sentinel", "preuves-exploitation-v1", 32));
}

export function chiffrerPreuves(preuves: Record<string, unknown>): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", cle(), iv);
  const chiffre = Buffer.concat([c.update(JSON.stringify(preuves), "utf8"), c.final()]);
  return PREFIX + Buffer.concat([iv, c.getAuthTag(), chiffre]).toString("base64");
}

export function dechiffrerPreuves(valeur: string): Record<string, unknown> | null {
  if (!valeur.startsWith(PREFIX)) return null;
  const brut = Buffer.from(valeur.slice(PREFIX.length), "base64");
  const d = createDecipheriv("aes-256-gcm", cle(), brut.subarray(0, 12));
  d.setAuthTag(brut.subarray(12, 28));
  const clair = Buffer.concat([d.update(brut.subarray(28)), d.final()]).toString("utf8");
  return JSON.parse(clair) as Record<string, unknown>;
}

/** Constat prêt à stocker : partie descriptive + preuves chiffrées. */
export function scellerConstat(payload: unknown): Record<string, unknown> | null {
  const { publique, preuves } = separerPreuves(payload);
  if (!publique) return null;
  return preuves ? { ...publique, [CHAMP_PREUVES]: chiffrerPreuves(preuves) } : publique;
}

/** Preuves en clair d'un constat stocké (anciennes lignes non chiffrées comprises). */
export function ouvrirPreuves(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const p = payload as Record<string, unknown>;
  if (typeof p[CHAMP_PREUVES] === "string") {
    try {
      return dechiffrerPreuves(p[CHAMP_PREUVES] as string);
    } catch {
      return null; // clé changée : preuve illisible, jamais d'erreur bloquante pour le rapport
    }
  }
  return separerPreuves(p).preuves;
}
