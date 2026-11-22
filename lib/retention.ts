import { ensureSchema, query } from "./db";
import { PROOF_FIELDS } from "./proofs";

/**
 * Conservation des preuves et rapports de pentest, réglée par organisation
 * (`organizations.evidence_retention_days`).
 *
 * AUCUNE valeur par défaut : NULL = pas de purge. La durée est à fixer avec un juriste
 * (finalité, contrat client, prescription) ; Sentinel n'en impose aucune.
 *
 * Si elle est définie, la purge quotidienne (cron) efface, pour chaque pentest terminé depuis
 * plus de N jours : le rapport Markdown, le graphe d'agents et les champs de preuve des
 * findings. Les métadonnées (cible, dates, titres, gravité, statut) sont conservées pour
 * l'historique et les statistiques.
 */

export const MAX_RETENTION_DAYS = 3650;

/** Valide un réglage saisi : null/"" = pas de purge ; sinon un entier de jours, 1 à 3650. */
export function parseRetentionDays(
  v: unknown
): { ok: true; value: number | null } | { ok: false; error: string } {
  if (v === null || v === undefined || v === "") return { ok: true, value: null };
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.trim()) : NaN;
  if (!Number.isInteger(n) || n < 1 || n > MAX_RETENTION_DAYS)
    return {
      ok: false,
      error: `Durée de conservation invalide : un nombre entier de jours entre 1 et ${MAX_RETENTION_DAYS}, ou vide pour ne rien purger.`,
    };
  return { ok: true, value: n };
}

export async function setEvidenceRetention(orgId: string, days: number | null): Promise<void> {
  await ensureSchema();
  await query(`UPDATE organizations SET evidence_retention_days = $2 WHERE id = $1`, [orgId, days]);
}

/** Purge les preuves et rapports échus (organisations ayant fixé une durée). */
export async function purgeExpiredEvidence(): Promise<{ jobsPurged: number }> {
  await ensureSchema();
  const jobs = await query<{ id: string }>(
    `UPDATE jobs j
        SET report_md = NULL, agents_graph = NULL, evidence_purged_at = now()
       FROM organizations o
      WHERE j.org_id = o.id
        AND o.evidence_retention_days IS NOT NULL
        AND j.evidence_purged_at IS NULL
        AND j.status IN ('done', 'error', 'cancelled')
        AND COALESCE(j.completed_at, j.created_at) < now() - make_interval(days => o.evidence_retention_days)
      RETURNING j.id`
  );
  if (jobs.length)
    await query(
      `UPDATE job_findings SET payload = payload - $2::text[]
        WHERE job_id = ANY($1::uuid[]) AND payload IS NOT NULL`,
      [jobs.map((j) => j.id), [...PROOF_FIELDS]]
    );
  return { jobsPurged: jobs.length };
}
