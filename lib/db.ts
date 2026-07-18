import { Pool } from "pg";

// Connection string : Neon, Vercel Postgres ou Supabase — indifféremment.
const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  "";

export const dbConfigured = Boolean(connectionString);

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!dbConfigured) {
    throw new Error(
      "Base de données non configurée. Définissez DATABASE_URL (Neon, Vercel Postgres ou Supabase)."
    );
  }
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 3,
      ssl: connectionString.includes("localhost")
        ? undefined
        : { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await getPool().query(text, params);
  return res.rows as T[];
}

let schemaReady = false;

/** Crée les tables si besoin (idempotent). Appelé avant toute opération. */
export async function ensureSchema(): Promise<void> {
  if (schemaReady || !dbConfigured) return;
  await getPool().query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS users (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email         text UNIQUE NOT NULL,
      password_hash text NOT NULL,
      name          text,
      created_at    timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS scans (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_url  text NOT NULL,
      final_url   text,
      status      text NOT NULL DEFAULT 'pending',
      grade       text,
      score       int,
      summary     jsonb,
      findings    jsonb,
      error       text,
      created_at  timestamptz NOT NULL DEFAULT now(),
      completed_at timestamptz
    );

    CREATE INDEX IF NOT EXISTS scans_user_created_idx
      ON scans (user_id, created_at DESC);

    ALTER TABLE scans ADD COLUMN IF NOT EXISTS deep boolean NOT NULL DEFAULT false;

    CREATE TABLE IF NOT EXISTS verified_domains (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      domain      text NOT NULL,
      token       text NOT NULL,
      method      text,
      verified_at timestamptz,
      created_at  timestamptz NOT NULL DEFAULT now(),
      UNIQUE (user_id, domain)
    );

    CREATE TABLE IF NOT EXISTS rate_events (
      id         bigserial PRIMARY KEY,
      bucket     text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS rate_events_bucket_idx
      ON rate_events (bucket, created_at DESC);
  `);
  schemaReady = true;
}
