import { ensureSchema, query } from "./db";

/** Association installation GitHub App ↔ organisation/utilisateur Sentinel. */

export type GhInstallRow = {
  installation_id: string;
  account_login: string | null;
  org_id: string | null;
  user_id: string | null;
  created_at: string;
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
