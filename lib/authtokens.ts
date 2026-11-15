import { createHash, randomBytes } from "node:crypto";
import { ensureSchema, query } from "./db";

/**
 * Jetons à usage unique envoyés par e-mail :
 * - `reset`  : réinitialisation du mot de passe (30 min) ;
 * - `verify` : confirmation de l'adresse e-mail (48 h).
 * Seul le SHA-256 est stocké ; émettre un nouveau jeton invalide les précédents du même type.
 */

export type TokenKind = "reset" | "verify";

export const TOKEN_TTL_MINUTES: Record<TokenKind, number> = { reset: 30, verify: 48 * 60 };

export function hashAuthToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function issueAuthToken(userId: string, kind: TokenKind): Promise<string> {
  await ensureSchema();
  const token = randomBytes(32).toString("base64url");
  await query(`DELETE FROM auth_tokens WHERE user_id = $1 AND kind = $2 AND used_at IS NULL`, [
    userId,
    kind,
  ]);
  await query(
    `INSERT INTO auth_tokens (user_id, kind, token_hash, expires_at)
     VALUES ($1, $2, $3, now() + ($4 || ' minutes')::interval)`,
    [userId, kind, hashAuthToken(token), String(TOKEN_TTL_MINUTES[kind])]
  );
  return token;
}

/**
 * Consomme le jeton de façon atomique (un seul usage, même en cas de double clic)
 * et renvoie l'id de l'utilisateur, ou null s'il est invalide / expiré / déjà utilisé.
 */
export async function consumeAuthToken(token: string, kind: TokenKind): Promise<string | null> {
  if (!token || token.length > 200) return null;
  await ensureSchema();
  const rows = await query<{ user_id: string }>(
    `UPDATE auth_tokens SET used_at = now()
      WHERE token_hash = $1 AND kind = $2 AND used_at IS NULL AND expires_at > now()
      RETURNING user_id`,
    [hashAuthToken(token), kind]
  );
  return rows[0]?.user_id ?? null;
}

/** Le jeton est-il encore utilisable ? (affichage du formulaire, sans le consommer) */
export async function peekAuthToken(token: string, kind: TokenKind): Promise<boolean> {
  if (!token || token.length > 200) return false;
  await ensureSchema();
  const rows = await query<{ n: number }>(
    `SELECT count(*)::int AS n FROM auth_tokens
      WHERE token_hash = $1 AND kind = $2 AND used_at IS NULL AND expires_at > now()`,
    [hashAuthToken(token), kind]
  );
  return (rows[0]?.n ?? 0) > 0;
}
