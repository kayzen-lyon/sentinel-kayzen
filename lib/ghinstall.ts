import { ensureSchema, query } from "./db";

/** Association installation GitHub App ↔ organisation/utilisateur Sentinel. */

export type GhInstallRow = {
  installation_id: string;
  account_login: string | null;
  org_id: string | null;
  user_id: string | null;
  created_at: string;
  confirme_le: string | null;
};

export async function upsertInstallation(
  installationId: number,
  accountLogin: string | null,
  orgId: string | null,
  userId: string | null
): Promise<void> {
  await ensureSchema();
  await query(
    `INSERT INTO gh_installations (installation_id, account_login, org_id, user_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (installation_id) DO UPDATE
       SET account_login = COALESCE(EXCLUDED.account_login, gh_installations.account_login),
           org_id = COALESCE(EXCLUDED.org_id, gh_installations.org_id),
           user_id = COALESCE(EXCLUDED.user_id, gh_installations.user_id)`,
    [installationId, accountLogin, orgId, userId]
  );
}

/**
 * Relie une installation à un compte Sentinel de façon idempotente et NON usurpable.
 *
 * Le callback de fin d'installation reçoit `installation_id` en clair dans l'URL ; sans garde, un
 * utilisateur authentifié pourrait revendiquer l'installation d'un tiers (identifiants séquentiels)
 * et détourner ses scans de PR. On ne (re)lie donc que si l'installation n'est encore rattachée à
 * aucun utilisateur ; une installation déjà revendiquée par un autre compte n'est jamais réécrite.
 *
 * Retourne `true` si l'installation appartient à `userId` après l'opération.
 */
export async function linkInstallationToUser(
  installationId: number,
  orgId: string | null,
  userId: string
): Promise<boolean> {
  await ensureSchema();
  const rows = await query<{ user_id: string | null }>(
    `INSERT INTO gh_installations (installation_id, org_id, user_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (installation_id) DO UPDATE
       SET user_id = COALESCE(gh_installations.user_id, EXCLUDED.user_id),
           org_id  = CASE WHEN gh_installations.user_id IS NULL
                          THEN EXCLUDED.org_id ELSE gh_installations.org_id END
     RETURNING user_id`,
    [installationId, orgId, userId]
  );
  return rows[0]?.user_id === userId;
}

/** Confirmation, par le compte relié, qu'il peut faire analyser les dépôts de l'installation. */
export async function confirmerInstallation(
  installationId: number,
  userId: string
): Promise<GhInstallRow | null> {
  await ensureSchema();
  const rows = await query<GhInstallRow>(
    `UPDATE gh_installations SET confirme_le = COALESCE(confirme_le, now())
      WHERE installation_id = $1 AND user_id = $2 RETURNING *`,
    [installationId, userId]
  );
  return rows[0] ?? null;
}

export async function deleteInstallation(installationId: number): Promise<void> {
  await ensureSchema();
  await query(`DELETE FROM gh_installations WHERE installation_id = $1`, [installationId]);
}

export async function getInstallation(
  installationId: number
): Promise<GhInstallRow | null> {
  await ensureSchema();
  const rows = await query<GhInstallRow>(
    `SELECT * FROM gh_installations WHERE installation_id = $1`,
    [installationId]
  );
  return rows[0] ?? null;
}

export async function listInstallationsForUser(userId: string): Promise<GhInstallRow[]> {
  await ensureSchema();
  return query<GhInstallRow>(
    `SELECT * FROM gh_installations WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
}
