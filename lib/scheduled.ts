import { ensureSchema, query } from "./db";
import { validateTargetUrl } from "./ssrf";
import { isHostVerified } from "./domains";
import { canLaunch, getRole } from "./orgs";
import { runScan } from "./scanner";
import { createScanRecord, completeScan, failScan } from "./scans";
import { notifyOrg } from "./notify";
import { logAudit } from "./audit";

/** Surveillance planifiée : scans passifs récurrents + alerte en cas de régression de score. */

export type Frequency = "daily" | "weekly";
const REGRESSION_THRESHOLD = 10; // points de score

export type ScheduledRow = {
  id: string;
  user_id: string;
  org_id: string | null;
  target_url: string;
  frequency: Frequency;
  enabled: boolean;
  last_run_at: string | null;
  last_score: number | null;
  created_at: string;
};

export async function listSchedules(userId: string): Promise<ScheduledRow[]> {
  await ensureSchema();
  return query<ScheduledRow>(
    `SELECT * FROM scheduled_scans WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
}

export async function createSchedule(
  userId: string,
  orgId: string | null,
  targetUrl: string,
  frequency: Frequency
): Promise<string> {
  await ensureSchema();
  const rows = await query<{ id: string }>(
    `INSERT INTO scheduled_scans (user_id, org_id, target_url, frequency)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [userId, orgId, targetUrl, frequency]
  );
  return rows[0].id;
}

export async function deleteSchedule(id: string, userId: string): Promise<void> {
  await ensureSchema();
  await query(`DELETE FROM scheduled_scans WHERE id = $1 AND user_id = $2`, [id, userId]);
}

const INTERVAL_SQL: Record<Frequency, string> = {
  daily: "1 day",
  weekly: "7 days",
};

/** Sélectionne les surveillances dues (jamais lancées ou dont l'intervalle est écoulé). */
async function dueSchedules(): Promise<ScheduledRow[]> {
  await ensureSchema();
  return query<ScheduledRow>(
    `SELECT * FROM scheduled_scans
     WHERE enabled = true
       AND (
         last_run_at IS NULL
         OR (frequency = 'daily'  AND last_run_at < now() - interval '1 day')
         OR (frequency = 'weekly' AND last_run_at < now() - interval '7 days')
       )
     ORDER BY last_run_at NULLS FIRST
     LIMIT 50`
  );
}

/**
 * Exécute toutes les surveillances dues. Chaque cible est re-validée (anti-SSRF), scannée en
 * passif (approfondi si le domaine est vérifié), historisée, et comparée au score précédent :
 * une baisse ≥ seuil déclenche une alerte (notification + audit).
 */
export async function runDueScheduledScans(): Promise<{ ran: number; alerts: number }> {
  const due = await dueSchedules();
  let ran = 0;
  let alerts = 0;

  for (const s of due) {
    const check = await validateTargetUrl(s.target_url);
    if (!check.ok) {
      await query(`UPDATE scheduled_scans SET last_run_at = now() WHERE id = $1`, [s.id]);
      continue;
    }

    // Approfondi seulement si le domaine est vérifié dans l'organisation de la surveillance
    // ET que son auteur y a toujours un rôle autorisé à lancer (sinon : passif simple).
    const role = s.org_id ? await getRole(s.org_id, s.user_id).catch(() => null) : null;
    const deep =
      canLaunch(role) && (await isHostVerified(s.org_id, check.url.hostname).catch(() => false));
    const scanId = await createScanRecord(s.user_id, check.url.toString(), deep).catch(
      () => null
    );

    try {
      const result = await runScan(check.url, { deep });
      if (scanId) await completeScan(scanId, result).catch(() => {});

      const prev = s.last_score;
      const now = result.score;
      if (prev != null && now <= prev - REGRESSION_THRESHOLD) {
        alerts++;
        const host = check.url.hostname;
        await notifyOrg(s.org_id, {
          event: "scan.regression",
          text:
            `Sentinel — régression de sécurité sur ${host} : score ${prev} → ${now} ` +
            `(note ${result.grade}).`,
          data: { target: check.url.toString(), previousScore: prev, score: now, scanId },
        });
        await logAudit({
          orgId: s.org_id,
          actorId: s.user_id,
          action: "scan.regression",
          target: host,
          meta: { previousScore: prev, score: now },
        });
      }

      await query(
        `UPDATE scheduled_scans SET last_run_at = now(), last_score = $2 WHERE id = $1`,
        [s.id, now]
      );
      ran++;
    } catch (e) {
      if (scanId)
        await failScan(scanId, e instanceof Error ? e.message : "échec").catch(() => {});
      await query(`UPDATE scheduled_scans SET last_run_at = now() WHERE id = $1`, [s.id]);
    }
  }

  return { ran, alerts };
}
