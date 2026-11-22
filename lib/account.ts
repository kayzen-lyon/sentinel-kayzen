import { ensureSchema, query } from "./db";
import { stripProofs } from "./proofs";
import { redactDeep } from "./redact";

/**
 * Droits des personnes en libre-service (RGPD art. 15, 17 et 20) :
 * export de ses données et suppression de son compte depuis « Mon compte ».
 */

/** Tout ce que Sentinel détient sur ce compte, dans un format lisible par machine. */
export async function exportUserData(userId: string): Promise<Record<string, unknown>> {
  await ensureSchema();
  const [account, scans, jobs, findings, domains, memberships, schedules, apiKeys] = await Promise.all([
    query(`SELECT id, email, name, created_at, email_verified_at FROM users WHERE id = $1`, [userId]),
    query(
      `SELECT id, target_url, final_url, status, grade, score, deep, summary, findings, created_at, completed_at
         FROM scans WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    ),
    query(
      `SELECT id, target_url, mode, status, playbook, cost_usd, report_md, created_at, started_at, completed_at
         FROM jobs WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    ),
    query(
      `SELECT f.job_id, f.native_id, f.title, f.severity, f.cvss, f.status, f.payload, f.created_at
         FROM job_findings f JOIN jobs j ON j.id = f.job_id
        WHERE j.user_id = $1 ORDER BY f.created_at`,
      [userId]
    ),
    query(
      `SELECT domain, method, verified_at, created_at FROM verified_domains WHERE user_id = $1`,
      [userId]
    ),
    query(
      `SELECT o.name AS organization, m.role, m.created_at
         FROM org_members m JOIN organizations o ON o.id = m.org_id WHERE m.user_id = $1`,
      [userId]
    ),
    query(
      `SELECT target_url, frequency, enabled, last_run_at, last_score, created_at
         FROM scheduled_scans WHERE user_id = $1`,
      [userId]
    ),
    // Jamais le secret : seulement le nom et le préfixe de chaque clé.
    query(`SELECT name, token_prefix, last_used_at, created_at FROM api_keys WHERE user_id = $1`, [userId]),
  ]);
  return {
    exported_at: new Date().toISOString(),
    notice: "Export de vos données personnelles détenues par Sentinel by Kayzen.",
    account: account[0] ?? null,
    organizations: memberships,
    verified_domains: domains,
    scans,
    // Ni preuve d'exploitation ni rapport (qui les cite) dans un fichier exporté : ils restent
    // consultables dans le tableau de bord, après authentification.
    pentests: jobs.map((j) => ({ ...j, report_md: null })),
    pentest_findings: findings.map((f) => ({ ...f, payload: redactDeep(stripProofs(f.payload)) })),
    scheduled_scans: schedules,
    api_keys: apiKeys,
  };
}

/**
 * Supprime le compte et, par cascade, ses scans, pentests, domaines, clés API,
 * surveillances et son espace personnel. Les organisations d'AUTRES personnes dont
 * il était simple membre sont conservées (il en est seulement retiré).
 * Refusé s'il possède une organisation qui compte d'autres membres : il doit d'abord
 * les retirer, pour ne pas leur faire perdre leurs données sans prévenir.
 */
export async function deleteAccount(userId: string): Promise<string | null> {
  await ensureSchema();
  const shared = await query<{ n: number }>(
    `SELECT count(*)::int AS n
       FROM organizations o JOIN org_members m ON m.org_id = o.id
      WHERE o.owner_id = $1 AND m.user_id <> $1`,
    [userId]
  );
  if ((shared[0]?.n ?? 0) > 0)
    return "Votre organisation compte d'autres membres : retirez-les d'abord (onglet Équipe), puis supprimez votre compte.";
  await query(`DELETE FROM users WHERE id = $1`, [userId]);
  return null;
}
