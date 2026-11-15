import { ensureSchema, query } from "./db";

export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
};

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  await ensureSchema();
  const rows = await query<UserRow>(
    `SELECT id, email, password_hash, name FROM users WHERE email=$1`,
    [email.toLowerCase()]
  );
  return rows[0] ?? null;
}

export async function getUserById(id: string): Promise<UserRow | null> {
  await ensureSchema();
  const rows = await query<UserRow>(
    `SELECT id, email, password_hash, name FROM users WHERE id=$1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function updatePassword(
  userId: string,
  passwordHash: string
): Promise<void> {
  await ensureSchema();
  await query(`UPDATE users SET password_hash=$2 WHERE id=$1`, [userId, passwordHash]);
}

export async function createUser(
  email: string,
  passwordHash: string,
  name: string | null
): Promise<UserRow> {
  await ensureSchema();
  const rows = await query<UserRow>(
    `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3)
       RETURNING id, email, password_hash, name`,
    [email.toLowerCase(), passwordHash, name]
  );
  return rows[0];
}

/** L'adresse e-mail du compte a-t-elle été confirmée ? */
export async function isEmailVerified(userId: string): Promise<boolean> {
  await ensureSchema();
  const rows = await query<{ v: boolean }>(
    `SELECT email_verified_at IS NOT NULL AS v FROM users WHERE id=$1`,
    [userId]
  );
  return Boolean(rows[0]?.v);
}

export async function markEmailVerified(userId: string): Promise<void> {
  await ensureSchema();
  await query(
    `UPDATE users SET email_verified_at = COALESCE(email_verified_at, now()) WHERE id=$1`,
    [userId]
  );
}
