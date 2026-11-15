import { ensureSchema, query } from "./db";

/**
 * Entretien quotidien (appelé par le cron) :
 * - purge des événements de rate-limit expirés (les fenêtres font au plus 1 h ;
 *   les buckets d'IP qui ne reviennent jamais n'étaient sinon jamais nettoyés) ;
 * - passage en erreur des pentests bloqués (le runner a un timeout de 60 min :
 *   au-delà de 3 h, un job queued/running ne recevra plus rien).
 */
export async function runMaintenance(): Promise<{ rateEventsPurged: number; jobsTimedOut: number }> {
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
  return { rateEventsPurged: purged.length, jobsTimedOut: stuck.length };
}
