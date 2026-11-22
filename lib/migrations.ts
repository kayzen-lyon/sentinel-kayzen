/**
 * Migrations du schéma, appliquées dans l'ordre par ensureSchema() (lib/db.ts).
 *
 * Règles :
 * - ne JAMAIS modifier une migration déjà déployée : en ajouter une nouvelle à la fin ;
 * - l'identifiant est enregistré dans schema_migrations après succès ;
 * - chaque migration tourne dans la même transaction, sous verrou consultatif
 *   (pas de DDL concurrent entre instances serverless).
 *
 * 001 reprend tel quel l'ancien bloc ensureSchema(), entièrement idempotent :
 * il s'applique sans effet sur une base déjà créée.
 */
export type Migration = { id: string; sql: string };

export const MIGRATIONS: Migration[] = [
  {
    id: "001_baseline",
    sql: `
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
    -- Gestionnaires de tickets (Jira / Linear)
    ALTER TABLE org_integrations ADD COLUMN IF NOT EXISTS jira_base_url text;
    ALTER TABLE org_integrations ADD COLUMN IF NOT EXISTS jira_email text;
    ALTER TABLE org_integrations ADD COLUMN IF NOT EXISTS jira_token text;
    ALTER TABLE org_integrations ADD COLUMN IF NOT EXISTS jira_project text;
    ALTER TABLE org_integrations ADD COLUMN IF NOT EXISTS linear_key text;
    ALTER TABLE org_integrations ADD COLUMN IF NOT EXISTS linear_team text;

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

    -- GitHub App managée : installations + contexte PR sur les jobs
    CREATE TABLE IF NOT EXISTS gh_installations (
      installation_id bigint PRIMARY KEY,
      account_login   text,
      org_id          uuid REFERENCES organizations(id) ON DELETE SET NULL,
      user_id         uuid REFERENCES users(id) ON DELETE SET NULL,
      created_at      timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS gh_installation_id bigint;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS gh_owner text;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS gh_repo text;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS gh_sha text;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS gh_pr integer;

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

    -- Rétractations reçues via la fonction en ligne (C. conso L. 221-21, D. 221-5).
    -- received_at est posé par l'horloge du serveur : c'est la preuve du délai.
    CREATE TABLE IF NOT EXISTS withdrawals (
      id          bigserial PRIMARY KEY,
      reference   text NOT NULL UNIQUE,
      name        text NOT NULL,
      contract_id text NOT NULL,
      email       text NOT NULL,
      user_id     uuid,
      ack_sent    boolean NOT NULL DEFAULT false,
      received_at timestamptz NOT NULL DEFAULT now()
    );
  `,
  },
  {
    id: "002_org_invitations",
    sql: `
    -- Invitations d'équipe pour des personnes sans compte (lien signé, expiration).
    -- Seul le hash du jeton est stocké ; le lien n'est montré qu'une fois.
    CREATE TABLE IF NOT EXISTS org_invitations (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      email       text NOT NULL,
      role        text NOT NULL,
      token_hash  text NOT NULL UNIQUE,
      invited_by  uuid REFERENCES users(id) ON DELETE SET NULL,
      created_at  timestamptz NOT NULL DEFAULT now(),
      expires_at  timestamptz NOT NULL,
      accepted_at timestamptz
    );
    CREATE INDEX IF NOT EXISTS org_invitations_org_idx ON org_invitations (org_id, created_at DESC);
  `,
  },
  {
    id: "003_auth_tokens_email_verification",
    sql: `
    -- Vérification d'e-mail. Les comptes existants sont considérés comme vérifiés
    -- (ils ont été créés avant l'obligation) ; seuls les nouveaux comptes doivent confirmer.
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
    UPDATE users SET email_verified_at = created_at WHERE email_verified_at IS NULL;

    -- Jetons à usage unique (réinitialisation de mot de passe, vérification d'e-mail).
    -- Seul le SHA-256 du jeton est stocké.
    CREATE TABLE IF NOT EXISTS auth_tokens (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind        text NOT NULL CHECK (kind IN ('reset', 'verify')),
      token_hash  text NOT NULL UNIQUE,
      created_at  timestamptz NOT NULL DEFAULT now(),
      expires_at  timestamptz NOT NULL,
      used_at     timestamptz
    );
    CREATE INDEX IF NOT EXISTS auth_tokens_user_idx ON auth_tokens (user_id, kind);
  `,
  },
  {
    id: "004_org_domains",
    sql: `
    -- Domaines vérifiés rattachés à une organisation (et non plus à un utilisateur) :
    -- tout membre autorisé de l'organisation peut s'en servir, dans CETTE organisation.
    ALTER TABLE verified_domains
      ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    -- Reprise : les domaines existants vont dans l'espace personnel de leur auteur.
    UPDATE verified_domains d SET org_id = o.id
      FROM organizations o
     WHERE d.org_id IS NULL AND o.owner_id = d.user_id AND o.personal = true;
    -- Unicité par organisation (deux organisations peuvent vérifier le même domaine).
    ALTER TABLE verified_domains DROP CONSTRAINT IF EXISTS verified_domains_user_id_domain_key;
    CREATE UNIQUE INDEX IF NOT EXISTS verified_domains_org_domain_uq
      ON verified_domains (org_id, domain);
  `,
  },
  {
    id: "005_plans_billing",
    sql: `
    -- Offres : free (par défaut, sans pentest) | platform | enterprise.
    -- Abonnement géré par Stripe ; le webhook tient ces colonnes à jour.
    ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';
    ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_plan_check;
    ALTER TABLE organizations ADD CONSTRAINT organizations_plan_check
      CHECK (plan IN ('free', 'platform', 'enterprise'));
    ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id text;
    ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
    ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_status text;
    ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_period_end timestamptz;
    CREATE UNIQUE INDEX IF NOT EXISTS organizations_stripe_customer_uq
      ON organizations (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

    -- Scans passifs rattachés à l'organisation qui les consomme (quota mensuel).
    ALTER TABLE scans ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS scans_org_created_idx ON scans (org_id, created_at DESC);
  `,
  },
  {
    id: "006_finding_triage",
    sql: `
    -- Grille de triage en 7 questions (réponses oui/non/non répondu) posée par l'analyste.
    ALTER TABLE job_findings ADD COLUMN IF NOT EXISTS triage jsonb;
  `,
  },
  {
    id: "007_scan_insights",
    sql: `
    -- Données enrichies du scan (certificat, DNS, e-mail, tiers, sous-scores…) : historique et dashboard.
    ALTER TABLE scans ADD COLUMN IF NOT EXISTS insights jsonb;
  `,
  },
];
