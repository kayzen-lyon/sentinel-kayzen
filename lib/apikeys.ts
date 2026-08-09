import { randomBytes, createHash } from "node:crypto";
import { ensureSchema, query } from "./db";

/** Clés API pour l'accès programmatique (serveur MCP). Le secret n'est montré qu'à la création. */

export type ApiKeyRow = {
  id: string;
  name: string | null;
  token_prefix: string;
  last_used_at: string | null;
  created_at: string;
};

const PREFIX = "sntl_";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function listApiKeys(userId: string): Promise<ApiKeyRow[]> {
  await ensureSchema();
  return query<ApiKeyRow>(
    `SELECT id, name, token_prefix, last_used_at, created_at
     FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
}

/** Crée une clé et renvoie le secret complet (non stocké en clair). */
export async function createApiKey(
  userId: string,
  name: string | null
): Promise<{ id: string; token: string; prefix: string }> {
  await ensureSchema();
  const token = PREFIX + randomBytes(24).toString("base64url");
  const prefix = token.slice(0, PREFIX.length + 6);
  const rows = await query<{ id: string }>(
    `INSERT INTO api_keys (user_id, name, token_prefix, token_hash)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [userId, name, prefix, hashToken(token)]
  );
  return { id: rows[0].id, token, prefix };
}

export async function revokeApiKey(id: string, userId: string): Promise<void> {
  await ensureSchema();
  await query(`DELETE FROM api_keys WHERE id = $1 AND user_id = $2`, [id, userId]);
}

/** Vérifie un token présenté et renvoie l'id utilisateur (ou null). Met à jour last_used_at. */
export async function verifyApiKey(token: string): Promise<string | null> {
  if (!token || !token.startsWith(PREFIX)) return null;
  await ensureSchema();
  const rows = await query<{ id: string; user_id: string }>(
    `SELECT id, user_id FROM api_keys WHERE token_hash = $1`,
    [hashToken(token)]
  );
  if (!rows[0]) return null;
  query(`UPDATE api_keys SET last_used_at = now() WHERE id = $1`, [rows[0].id]).catch(
    () => {}
  );
  return rows[0].user_id;
}
