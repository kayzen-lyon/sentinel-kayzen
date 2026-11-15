import { createHash, randomBytes } from "node:crypto";
import { ensureSchema, query } from "./db";
import { ROLES, type Role } from "./orgs";

/**
 * Invitations d'équipe pour des personnes qui n'ont pas encore de compte.
 * - jeton aléatoire de 32 octets, seul son SHA-256 est stocké ;
 * - valable 7 jours, à usage unique ;
 * - lié à l'adresse invitée : il faut être connecté avec CET e-mail pour accepter
 *   (un lien transféré ne fait pas entrer quelqu'un d'autre).
 */

export const INVITE_TTL_DAYS = 7;

export type InvitationRow = {
  id: string;
  org_id: string;
  email: string;
  role: Role;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
};

export type InvitationLookup = InvitationRow & { org_name: string };

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Crée (ou remplace) l'invitation en attente pour cet e-mail. Retourne le jeton en clair. */
export async function createInvitation(
  orgId: string,
  email: string,
  role: Role,
  invitedBy: string
): Promise<{ token?: string; error?: string }> {
  if (!ROLES.includes(role) || role === "owner") return { error: "Rôle invalide." };
  await ensureSchema();
  const normalized = email.trim().toLowerCase();
  const token = randomBytes(32).toString("base64url");
  await query(
    `DELETE FROM org_invitations WHERE org_id = $1 AND email = $2 AND accepted_at IS NULL`,
    [orgId, normalized]
  );
  await query(
    `INSERT INTO org_invitations (org_id, email, role, token_hash, invited_by, expires_at)
     VALUES ($1, $2, $3, $4, $5, now() + ($6 || ' days')::interval)`,
    [orgId, normalized, role, hashInviteToken(token), invitedBy, String(INVITE_TTL_DAYS)]
  );
  return { token };
}

export async function listPendingInvitations(orgId: string): Promise<InvitationRow[]> {
  await ensureSchema();
  return query<InvitationRow>(
    `SELECT id, org_id, email, role, created_at, expires_at, accepted_at
       FROM org_invitations
      WHERE org_id = $1 AND accepted_at IS NULL AND expires_at > now()
      ORDER BY created_at DESC`,
    [orgId]
  );
}

export async function revokeInvitation(orgId: string, id: string): Promise<void> {
  await ensureSchema();
  await query(
    `DELETE FROM org_invitations WHERE org_id = $1 AND id = $2 AND accepted_at IS NULL`,
    [orgId, id]
  );
}

/** Invitation valide (non expirée, non utilisée) correspondant au jeton, ou null. */
export async function findInvitation(token: string): Promise<InvitationLookup | null> {
  if (!token || token.length > 200) return null;
  await ensureSchema();
  const rows = await query<InvitationLookup>(
    `SELECT i.id, i.org_id, i.email, i.role, i.created_at, i.expires_at, i.accepted_at,
            o.name AS org_name
       FROM org_invitations i JOIN organizations o ON o.id = i.org_id
      WHERE i.token_hash = $1 AND i.accepted_at IS NULL AND i.expires_at > now()`,
    [hashInviteToken(token)]
  );
  return rows[0] ?? null;
}

/**
 * Accepte l'invitation pour l'utilisateur connecté. Marquage atomique
 * (UPDATE … WHERE accepted_at IS NULL) : un même lien ne sert qu'une fois.
 */
export async function acceptInvitation(
  token: string,
  user: { id: string; email: string }
): Promise<{ orgId?: string; error?: string }> {
  const inv = await findInvitation(token);
  if (!inv) return { error: "Invitation invalide, expirée ou déjà utilisée." };
  if (inv.email !== user.email.trim().toLowerCase())
    return { error: `Cette invitation est destinée à ${inv.email}. Connectez-vous avec ce compte.` };
  const claimed = await query<{ id: string }>(
    `UPDATE org_invitations SET accepted_at = now()
      WHERE id = $1 AND accepted_at IS NULL RETURNING id`,
    [inv.id]
  );
  if (!claimed[0]) return { error: "Invitation déjà utilisée." };
  await query(
    `INSERT INTO org_members (org_id, user_id, role) VALUES ($1, $2, $3)
     ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
    [inv.org_id, user.id, inv.role]
  );
  return { orgId: inv.org_id };
}
