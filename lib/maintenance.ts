import { ensureSchema, query } from "./db";
import { isEncrypted, seal } from "./secretbox";
import { masquerProfond } from "./masquage";
import { CHAMP_PREUVES, scellerConstat, separerPreuves } from "./preuves";
import { purgerRapportsExpires } from "./rapports";

/**
 * Entretien quotidien (appelé par le cron) :
 * - purge des événements de rate-limit expirés (les fenêtres font au plus 1 h ;
 *   les buckets d'IP qui ne reviennent jamais n'étaient sinon jamais nettoyés) ;
 * - passage en erreur des pentests bloqués (le runner a un timeout de 60 min :
 *   au-delà de 3 h, un job queued/running ne recevra plus rien).
 */
export async function runMaintenance(): Promise<{
  rateEventsPurged: number;
  jobsTimedOut: number;
  secretsResealed: number;
  preuvesScellees: number;
  rapportsPurges: number;
}> {
  await ensureSchema();
  const purged = await query<{ id: string }>(
    `DELETE FROM rate_events WHERE created_at < now() - interval '1 day' RETURNING id`
  );
  const stuck = await query<{ id: string }>(
    `UPDATE jobs
        SET status = 'error',
            error = COALESCE(error, 'Délai dépassé : aucun résultat reçu du moteur.'),
            completed_at = now()
      WHERE status IN ('queued', 'running')
        AND COALESCE(started_at, created_at) < now() - interval '3 hours'
      RETURNING id`
  );
  // Durées annoncées dans la politique de confidentialité : journal d'audit 12 mois,
  // jetons à usage unique et invitations expirés depuis plus de 30 jours.
  await query(`DELETE FROM audit_log WHERE created_at < now() - interval '12 months'`);
  await query(`DELETE FROM auth_tokens WHERE expires_at < now() - interval '30 days'`);
  await query(`DELETE FROM org_invitations WHERE expires_at < now() - interval '30 days'`);

  const resealed = await resealLegacySecrets();
  const preuves = await scellerPreuvesAnciennes();
  // Rapports : purgés seulement si RAPPORTS_CONSERVATION_JOURS est défini (sinon expire_le reste NULL).
  const rapports = await purgerRapportsExpires();
  return { rateEventsPurged: purged.length, jobsTimedOut: stuck.length, secretsResealed: resealed, preuvesScellees: preuves, rapportsPurges: rapports };
}

/** Chiffre (et masque) les preuves d'exploitation stockées en clair avant lib/preuves.ts. */
async function scellerPreuvesAnciennes(): Promise<number> {
  const rows = await query<{ id: string; payload: unknown }>(
    `SELECT id, payload FROM job_findings
      WHERE jsonb_typeof(payload) = 'object' AND NOT (payload ? '${CHAMP_PREUVES}') LIMIT 500`
  );
  let n = 0;
  for (const r of rows) {
    if (!separerPreuves(r.payload).preuves) continue;
    await query(`UPDATE job_findings SET payload = $2 WHERE id = $1`, [
      r.id,
      JSON.stringify(scellerConstat(masquerProfond(r.payload))),
    ]);
    n++;
  }
  return n;
}

type SecretRow = {
  org_id: string;
  slack_url: string | null;
  webhook_url: string | null;
  jira_token: string | null;
  linear_key: string | null;
};

/** Chiffre les secrets d'intégration enregistrés en clair avant l'introduction de secretbox. */
async function resealLegacySecrets(): Promise<number> {
  const rows = await query<SecretRow>(
    `SELECT org_id, slack_url, webhook_url, jira_token, linear_key FROM org_integrations`
  );
  let n = 0;
  for (const r of rows) {
    const cols = [r.slack_url, r.webhook_url, r.jira_token, r.linear_key];
    if (cols.every((v) => !v || isEncrypted(v))) continue;
    await query(
      `UPDATE org_integrations
          SET slack_url = $2, webhook_url = $3, jira_token = $4, linear_key = $5
        WHERE org_id = $1`,
      [r.org_id, ...cols.map((v) => seal(v))]
    );
    n++;
  }
  return n;
}
