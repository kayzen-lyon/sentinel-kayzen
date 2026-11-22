import { ensureSchema, query } from "./db";

/**
 * Organisations & RBAC. Chaque utilisateur possède une organisation « personnelle » créée à la
 * volée ; il peut y inviter des coéquipiers (comptes existants) avec un rôle. Les pentests
 * (jobs) sont des actifs d'organisation : tous les membres les voient ; seuls owner/admin/member
 * peuvent en lancer (viewer = lecture seule). Les scans passifs restent personnels.
 */

export type Role = "owner" | "admin" | "member" | "viewer";

export const ROLES: Role[] = ["owner", "admin", "member", "viewer"];
const LAUNCH_ROLES: Role[] = ["owner", "admin", "member"];
const MANAGE_ROLES: Role[] = ["owner", "admin"];

export type OrgRow = {
  id: string;
  name: string;
  owner_id: string;
  personal: boolean;
  require_approval: boolean;
  /** Conservation des preuves/rapports en jours ; null = pas de purge (lib/retention.ts). */
  evidence_retention_days: number | null;
  created_at: string;
};

export type MemberRow = {
  user_id: string;
  email: string;
  name: string | null;
  role: Role;
  created_at: string;
};

/** Retourne (en la créant si besoin) l'organisation personnelle de l'utilisateur. */
export async function ensurePersonalOrg(
  userId: string,
  label: string
): Promise<string> {
  await ensureSchema();
  const existing = await query<{ id: string }>(
    `SELECT id FROM organizations WHERE owner_id = $1 AND personal = true LIMIT 1`,
    [userId]
  );
  if (existing[0]) return existing[0].id;

  const rows = await query<{ id: string }>(
    `INSERT INTO organizations (name, owner_id, personal)
     VALUES ($1, $2, true) RETURNING id`,
    [`Espace de ${label}`, userId]
  );
  const orgId = rows[0].id;
  await query(
    `INSERT INTO org_members (org_id, user_id, role) VALUES ($1, $2, 'owner')
     ON CONFLICT (org_id, user_id) DO NOTHING`,
    [orgId, userId]
  );
  // Domaines vérifiés avant l'existence de cet espace (migration 004) : on les y rattache.
  await query(
    `UPDATE verified_domains SET org_id = $1 WHERE user_id = $2 AND org_id IS NULL`,
    [orgId, userId]
  );
  return orgId;
}

export async function getOrg(orgId: string): Promise<OrgRow | null> {
  await ensureSchema();
  const rows = await query<OrgRow>(`SELECT * FROM organizations WHERE id = $1`, [orgId]);
  return rows[0] ?? null;
}

export async function setRequireApproval(orgId: string, value: boolean): Promise<void> {
  await ensureSchema();
  await query(`UPDATE organizations SET require_approval = $2 WHERE id = $1`, [orgId, value]);
}

/** Ids de toutes les organisations dont l'utilisateur est membre. */
export async function userOrgIds(userId: string): Promise<string[]> {
  await ensureSchema();
  const rows = await query<{ org_id: string }>(
    `SELECT org_id FROM org_members WHERE user_id = $1`,
    [userId]
  );
  return rows.map((r) => r.org_id);
}

/** Rôle de l'utilisateur dans une organisation (null s'il n'est pas membre). */
export async function getRole(orgId: string, userId: string): Promise<Role | null> {
  await ensureSchema();
  const rows = await query<{ role: Role }>(
    `SELECT role FROM org_members WHERE org_id = $1 AND user_id = $2`,
    [orgId, userId]
  );
  return rows[0]?.role ?? null;
}

export function canLaunch(role: Role | null): boolean {
  return role != null && LAUNCH_ROLES.includes(role);
}
export function canManage(role: Role | null): boolean {
  return role != null && MANAGE_ROLES.includes(role);
}

export async function listMembers(orgId: string): Promise<MemberRow[]> {
  await ensureSchema();
  return query<MemberRow>(
    `SELECT m.user_id, u.email, u.name, m.role, m.created_at
     FROM org_members m JOIN users u ON u.id = m.user_id
     WHERE m.org_id = $1 ORDER BY m.created_at ASC`,
    [orgId]
  );
}

/** Ajoute un compte existant à l'organisation. Retourne un message d'erreur ou null. */
export async function addMemberByEmail(
  orgId: string,
  email: string,
  role: Role
): Promise<string | null> {
  await ensureSchema();
  if (!ROLES.includes(role) || role === "owner") return "Rôle invalide.";
  const users = await query<{ id: string }>(
    `SELECT id FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );
  if (!users[0]) return "Aucun compte Sentinel avec cet e-mail.";
  await query(
    `INSERT INTO org_members (org_id, user_id, role) VALUES ($1, $2, $3)
     ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
    [orgId, users[0].id, role]
  );
  return null;
}

export async function setMemberRole(
  orgId: string,
  userId: string,
  role: Role
): Promise<string | null> {
  await ensureSchema();
  if (!ROLES.includes(role)) return "Rôle invalide.";
  // On ne rétrograde pas le propriétaire.
  const org = await query<{ owner_id: string }>(
    `SELECT owner_id FROM organizations WHERE id = $1`,
    [orgId]
  );
  if (org[0]?.owner_id === userId) return "Le propriétaire ne peut pas changer de rôle.";
  await query(`UPDATE org_members SET role = $3 WHERE org_id = $1 AND user_id = $2`, [
    orgId,
    userId,
    role,
  ]);
  return null;
}

export async function removeMember(orgId: string, userId: string): Promise<string | null> {
  await ensureSchema();
  const org = await query<{ owner_id: string }>(
    `SELECT owner_id FROM organizations WHERE id = $1`,
    [orgId]
  );
  if (org[0]?.owner_id === userId) return "Le propriétaire ne peut pas être retiré.";
  await query(`DELETE FROM org_members WHERE org_id = $1 AND user_id = $2`, [orgId, userId]);
  return null;
}

export type UserOrg = { id: string; name: string; personal: boolean; role: Role };

/** Organisations dont l'utilisateur est membre (la personnelle en premier). */
export async function listUserOrgs(userId: string): Promise<UserOrg[]> {
  await ensureSchema();
  return query<UserOrg>(
    `SELECT o.id, o.name, (o.personal AND o.owner_id = $1) AS personal, m.role
       FROM org_members m JOIN organizations o ON o.id = m.org_id
      WHERE m.user_id = $1
      ORDER BY (o.personal AND o.owner_id = $1) DESC, o.name ASC`,
    [userId]
  );
}
