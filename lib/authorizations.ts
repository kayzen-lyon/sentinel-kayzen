import { ensureSchema, query } from "./db";
import { authorizationCovers, type AuthorizationInput } from "./authorizationScope";

/**
 * Autorisations écrites des clients (art. 323-1 s. du Code pénal : un test d'intrusion sans
 * accord du responsable du système est une intrusion). Rattachées à une ORGANISATION, comme
 * les domaines vérifiés. La vérification de propriété du domaine (lib/domains.ts) reste
 * exigée en plus : l'une prouve le contrôle technique, l'autre l'accord écrit du client.
 */

export type PentestAuthorizationRow = {
  id: string;
  org_id: string;
  host: string;
  include_subdomains: boolean;
  starts_at: string;
  ends_at: string;
  signer_name: string;
  signer_title: string;
  accepted_at: string;
  recorded_by: string | null;
  recorded_by_email: string | null;
  created_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
};

export async function listAuthorizations(orgId: string): Promise<PentestAuthorizationRow[]> {
  await ensureSchema();
  return query<PentestAuthorizationRow>(
    `SELECT * FROM pentest_authorizations WHERE org_id = $1 ORDER BY created_at DESC LIMIT 200`,
    [orgId]
  );
}

export async function createAuthorization(
  orgId: string,
  user: { id: string; email: string },
  a: AuthorizationInput
): Promise<string> {
  await ensureSchema();
  const rows = await query<{ id: string }>(
    `INSERT INTO pentest_authorizations
       (org_id, host, include_subdomains, starts_at, ends_at, signer_name, signer_title,
        accepted_at, recorded_by, recorded_by_email)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [
      orgId,
      a.host,
      a.includeSubdomains,
      a.startsAt.toISOString(),
      a.endsAt.toISOString(),
      a.signerName,
      a.signerTitle,
      a.acceptedAt.toISOString(),
      user.id,
      user.email,
    ]
  );
  return rows[0].id;
}

/** Révoque (sans supprimer) une autorisation de l'organisation ; renvoie l'hôte, ou null. */
export async function revokeAuthorization(
  orgId: string,
  id: string,
  userId: string
): Promise<string | null> {
  await ensureSchema();
  const rows = await query<{ host: string }>(
    `UPDATE pentest_authorizations SET revoked_at = now(), revoked_by = $3
      WHERE org_id = $1 AND id = $2 AND revoked_at IS NULL
      RETURNING host`,
    [orgId, id, userId]
  );
  return rows[0]?.host ?? null;
}

/** Autorisation en cours de validité couvrant `host` dans l'organisation, ou null. */
export async function findCoveringAuthorization(
  orgId: string | null,
  host: string
): Promise<PentestAuthorizationRow | null> {
  if (!orgId) return null;
  await ensureSchema();
  const rows = await query<PentestAuthorizationRow>(
    `SELECT * FROM pentest_authorizations
      WHERE org_id = $1 AND revoked_at IS NULL AND starts_at <= now() AND ends_at > now()`,
    [orgId]
  );
  const now = new Date();
  return rows.find((a) => authorizationCovers(a, host, now)) ?? null;
}
