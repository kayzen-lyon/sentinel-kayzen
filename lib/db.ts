import { Pool } from "pg";
import { MIGRATIONS } from "./migrations";

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
      // TLS vérifié dès que le certificat CA du fournisseur est fourni
      // (DATABASE_CA_CERT, contenu PEM). Sans lui, comportement historique conservé
      // pour ne pas couper la prod.
      ssl: connectionString.includes("localhost")
        ? undefined
        : process.env.DATABASE_CA_CERT
          ? { ca: process.env.DATABASE_CA_CERT, rejectUnauthorized: true }
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

let schemaPromise: Promise<void> | null = null;

/**
 * Applique les migrations manquantes (lib/migrations.ts), une seule fois par instance.
 * Verrou consultatif + transaction : deux démarrages à froid simultanés ne lancent
 * pas le DDL en parallèle, et une migration en échec ne laisse rien à moitié appliqué.
 */
export async function ensureSchema(): Promise<void> {
  if (!dbConfigured) return;
  schemaPromise ??= runMigrations().catch((e) => {
    schemaPromise = null; // nouvel essai au prochain appel
    throw e;
  });
  return schemaPromise;
}

async function runMigrations(): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('sentinel_schema_migrations'))");
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         id         text PRIMARY KEY,
         applied_at timestamptz NOT NULL DEFAULT now()
       )`
    );
    const done = new Set(
      (await client.query<{ id: string }>("SELECT id FROM schema_migrations")).rows.map((r) => r.id)
    );
    for (const m of MIGRATIONS) {
      if (done.has(m.id)) continue;
      await client.query(m.sql);
      await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [m.id]);
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
