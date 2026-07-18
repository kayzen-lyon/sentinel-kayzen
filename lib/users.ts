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
