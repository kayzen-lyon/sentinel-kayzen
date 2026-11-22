import { isEncrypted, open, seal } from "./secretbox";
import { redactDeep, redactSecrets } from "./redact";

/**
 * Preuves d'exploitation des pentests : chiffrées au repos (lib/secretbox.ts, AES-256-GCM).
 *
 * - Écriture (ingestion du runner) : les champs de preuve du payload d'un finding et le
 *   rapport Markdown (`jobs.report_md`) sont chiffrés avant d'aller en base.
 * - Lecture authentifiée (membre de l'organisation, via getJob) : déchiffrement puis
 *   masquage des secrets (lib/redact.ts) avant envoi au navigateur.
 * - Exports (JSON, SARIF, CSV, JUnit, MCP, RGPD) : les preuves sont retirées, jamais exportées.
 *
 * Lecture tolérante : une valeur historique en clair (sans préfixe `enc:v1:`) est lue telle
 * quelle ; une valeur chiffrée devenue illisible (clé changée) est remplacée par un message.
 */

/** Champs du finding Strix qui portent la preuve (PoC, requêtes/réponses, analyse technique). */
export const PROOF_FIELDS = [
  "technical_analysis",
  "poc_description",
  "poc_script_code",
  "evidence",
  "request",
  "response",
  "http_request",
  "http_response",
] as const;

export const UNREADABLE_PROOF = "[preuve chiffrée illisible : clé de chiffrement modifiée]";

type Obj = Record<string, unknown>;

function asObject(payload: unknown): Obj | null {
  return payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as Obj) : null;
}

/** Chiffre les champs de preuve d'un payload (les valeurs non textuelles sont sérialisées). */
export function sealProofs(payload: unknown): unknown {
  const p = asObject(payload);
  if (!p) return payload;
  const out: Obj = { ...p };
  for (const k of PROOF_FIELDS) {
    const v = out[k];
    if (v === undefined || v === null || v === "") continue;
    out[k] = seal(typeof v === "string" ? v : JSON.stringify(v));
  }
  return out;
}

/** Déchiffre les champs de preuve (lecture tolérante des valeurs historiques en clair). */
export function openProofs(payload: unknown): unknown {
  const p = asObject(payload);
  if (!p) return payload;
  const out: Obj = { ...p };
  for (const k of PROOF_FIELDS) {
    const v = out[k];
    if (typeof v === "string" && isEncrypted(v)) out[k] = open(v) ?? UNREADABLE_PROOF;
  }
  return out;
}

/** Retire les champs de preuve (exports, liens, IA). */
export function stripProofs(payload: unknown): unknown {
  const p = asObject(payload);
  if (!p) return payload;
  const out: Obj = { ...p };
  for (const k of PROOF_FIELDS) delete out[k];
  return out;
}

/** Chiffre le rapport Markdown d'un pentest (null/"" → null). */
export function sealReport(value: string | null | undefined): string | null {
  return seal(value);
}

/** Déchiffre le rapport Markdown (en clair historique accepté, illisible → message). */
export function openReport(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!isEncrypted(value)) return value;
  return open(value) ?? UNREADABLE_PROOF;
}

type FindingLike = { title: string | null; payload: unknown };
type JobLike = { report_md: string | null; error: string | null; agents_graph?: unknown };

/** Finding pour un membre authentifié de l'organisation : preuves déchiffrées, secrets masqués. */
export function presentFinding<T extends FindingLike>(f: T): T {
  return { ...f, title: redactSecrets(f.title), payload: redactDeep(openProofs(f.payload)) };
}

/** Job pour un membre authentifié : rapport déchiffré, secrets masqués. */
export function presentJob<T extends JobLike>(job: T): T {
  return {
    ...job,
    report_md: redactSecrets(openReport(job.report_md)),
    error: redactSecrets(job.error),
    agents_graph: redactDeep(job.agents_graph),
  };
}

/** Finding pour un export : sans preuve, secrets masqués. */
export function exportFinding<T extends FindingLike>(f: T): T {
  return { ...f, title: redactSecrets(f.title), payload: redactDeep(stripProofs(f.payload)) };
}

/** Job pour un export : sans rapport (il peut citer les preuves), secrets masqués. */
export function exportJob<T extends JobLike>(job: T): T {
  return { ...job, report_md: null, error: redactSecrets(job.error), agents_graph: redactDeep(job.agents_graph) };
}
