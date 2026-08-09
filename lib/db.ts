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

    CREATE TABLE IF NOT EXISTS cve_cache (
      cache_key  text PRIMARY KEY,
      refs       jsonb NOT NULL,
      fetched_at timestamptz NOT NULL DEFAULT now()
    );

    -- Pentest autonome (moteur Strix, exécuté par un runner GitHub Actions éphémère)
    CREATE TABLE IF NOT EXISTS jobs (
      id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_url   text NOT NULL,
      mode         text NOT NULL DEFAULT 'standard',
      status       text NOT NULL DEFAULT 'queued',
      run_name     text,
      cost_usd     double precision,
      report_md    text,
      error        text,
      created_at   timestamptz NOT NULL DEFAULT now(),
      started_at   timestamptz,
      completed_at timestamptz
    );

    CREATE INDEX IF NOT EXISTS jobs_user_created_idx
      ON jobs (user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS job_findings (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id     uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      native_id  text NOT NULL,
      title      text,
      severity   text,
      cvss       double precision,
      payload    jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (job_id, native_id)
    );

    CREATE INDEX IF NOT EXISTS job_findings_job_idx
      ON job_findings (job_id, created_at);

    -- Gouvernance : organisations, membres/rôles, journal d'audit
    CREATE TABLE IF NOT EXISTS organizations (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name       text NOT NULL,
      owner_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      personal   boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS org_members (
      org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role       text NOT NULL DEFAULT 'member',
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (org_id, user_id)
    );

    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS org_id uuid
      REFERENCES organizations(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS jobs_org_created_idx ON jobs (org_id, created_at DESC);

    -- Graphe multi-agents Strix (attack-chain), poussé par le runner
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS agents_graph jsonb;
    -- Approbation human-in-the-loop avant run offensif
    ALTER TABLE organizations ADD COLUMN IF NOT EXISTS require_approval boolean NOT NULL DEFAULT false;
    -- Playbook (instruction passée au moteur Strix) et son identifiant
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS playbook text;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS instruction text;

    -- Intégrations sortantes par organisation (notifications)
    CREATE TABLE IF NOT EXISTS org_integrations (
      org_id      uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
      slack_url   text,
      webhook_url text,
      updated_at  timestamptz NOT NULL DEFAULT now()
    );

    -- Surveillance planifiée (scans passifs récurrents + alertes de régression)
    CREATE TABLE IF NOT EXISTS scheduled_scans (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      org_id      uuid REFERENCES organizations(id) ON DELETE SET NULL,
      target_url  text NOT NULL,
      frequency   text NOT NULL DEFAULT 'daily',
      enabled     boolean NOT NULL DEFAULT true,
      last_run_at timestamptz,
      last_score  int,
      created_at  timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS scheduled_scans_user_idx ON scheduled_scans (user_id);

    -- Clés API (accès programmatique / serveur MCP)
    CREATE TABLE IF NOT EXISTS api_keys (
      id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name         text,
      token_prefix text NOT NULL,
      token_hash   text NOT NULL UNIQUE,
      last_used_at timestamptz,
      created_at   timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS api_keys_user_idx ON api_keys (user_id);

    ALTER TABLE job_findings ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open';

    CREATE TABLE IF NOT EXISTS audit_log (
      id          bigserial PRIMARY KEY,
      org_id      uuid,
      actor_id    uuid,
      actor_email text,
      action      text NOT NULL,
      target      text,
      meta        jsonb,
      created_at  timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS audit_log_org_idx ON audit_log (org_id, created_at DESC);
  `);
  schemaReady = true;
}
