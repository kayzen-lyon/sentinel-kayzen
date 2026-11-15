import { ensureSchema, query } from "./db";

/**
 * Offres et quotas mensuels, par organisation.
 * `null` = illimité (les limites anti-abus de lib/ratelimit restent actives).
 * Mois civil à l'heure de Paris.
 */

export type PlanId = "free" | "platform" | "enterprise";

export type Limits = {
  passiveScans: number | null; // scans passifs / mois
  domains: number | null; // domaines (vérifiés ou en attente)
  pentests: number | null; // pentests autonomes / mois
  members: number | null; // membres + invitations en attente
  schedules: number | null; // surveillances planifiées actives
  aiBudgetUsd: number | null; // coût IA cumulé des pentests / mois
};

export const PLANS: Record<PlanId, { label: string; limits: Limits }> = {
  free: {
    label: "Gratuit",
    limits: { passiveScans: 30, domains: 1, pentests: 0, members: 2, schedules: 1, aiBudgetUsd: 0 },
  },
  platform: {
    label: "Plateforme",
    limits: {
      passiveScans: null,
      domains: 10,
      pentests: 20,
      members: 10,
      schedules: 20,
      aiBudgetUsd: 30,
    },
  },
  enterprise: {
    label: "Entreprise",
    limits: {
      passiveScans: null,
      domains: null,
      pentests: null,
      members: null,
      schedules: null,
      aiBudgetUsd: null,
    },
  },
};

export type Usage = {
  passiveScans: number;
  domains: number;
  pentests: number;
  members: number;
  schedules: number;
  aiBudgetUsd: number;
};

export type OrgPlan = {
  plan: PlanId;
  status: string | null;
  periodEnd: string | null;
  exempt: boolean; // offert via BILLING_EXEMPT_EMAILS
  hasCustomer: boolean;
};

function exemptEmails(): string[] {
  return (process.env.BILLING_EXEMPT_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlanId(v: unknown): v is PlanId {
  return v === "free" || v === "platform" || v === "enterprise";
}

export async function getOrgPlan(orgId: string): Promise<OrgPlan> {
  await ensureSchema();
  const rows = await query<{
    plan: string;
    plan_status: string | null;
    plan_period_end: string | null;
    stripe_customer_id: string | null;
    owner_email: string;
  }>(
    `SELECT o.plan, o.plan_status, o.plan_period_end, o.stripe_customer_id, u.email AS owner_email
       FROM organizations o JOIN users u ON u.id = o.owner_id
      WHERE o.id = $1`,
    [orgId]
  );
  const r = rows[0];
  const exempt = Boolean(r && exemptEmails().includes(r.owner_email.toLowerCase()));
  return {
    plan: exempt ? "enterprise" : isPlanId(r?.plan) ? r.plan : "free",
    status: r?.plan_status ?? null,
    periodEnd: r?.plan_period_end ?? null,
    exempt,
    hasCustomer: Boolean(r?.stripe_customer_id),
  };
}

const MONTH = `date_trunc('month', now() AT TIME ZONE 'Europe/Paris') AT TIME ZONE 'Europe/Paris'`;

export async function getUsage(orgId: string): Promise<Usage> {
  await ensureSchema();
  const rows = await query<{
    scans: number;
    domains: number;
    pentests: number;
    members: number;
    schedules: number;
    cost: string | null;
  }>(
    `SELECT
       (SELECT count(*)::int FROM scans WHERE org_id = $1 AND created_at >= ${MONTH}) AS scans,
       (SELECT count(*)::int FROM verified_domains WHERE org_id = $1) AS domains,
       (SELECT count(*)::int FROM jobs WHERE org_id = $1 AND status <> 'cancelled'
           AND created_at >= ${MONTH}) AS pentests,
       (SELECT count(*)::int FROM org_members WHERE org_id = $1)
         + (SELECT count(*)::int FROM org_invitations
              WHERE org_id = $1 AND accepted_at IS NULL AND expires_at > now()) AS members,
       (SELECT count(*)::int FROM scheduled_scans WHERE org_id = $1 AND enabled) AS schedules,
       (SELECT COALESCE(sum(cost_usd), 0) FROM jobs WHERE org_id = $1
           AND created_at >= ${MONTH}) AS cost`,
    [orgId]
  );
  const r = rows[0];
  return {
    passiveScans: r?.scans ?? 0,
    domains: r?.domains ?? 0,
    pentests: r?.pentests ?? 0,
    members: r?.members ?? 0,
    schedules: r?.schedules ?? 0,
    aiBudgetUsd: Number(r?.cost ?? 0),
  };
}

export type QuotaKind = "passiveScans" | "domains" | "pentests" | "members" | "schedules";

const NOUN: Record<QuotaKind, string> = {
  passiveScans: "scans passifs ce mois-ci",
  domains: "domaines",
  pentests: "pentests ce mois-ci",
  members: "membres (invitations comprises)",
  schedules: "surveillances actives",
};

/** Vérifie la limite de l'offre ; message d'erreur prêt à afficher, ou null si autorisé. */
export function quotaError(plan: PlanId, kind: QuotaKind, usage: Usage): string | null {
  const limit = PLANS[plan].limits[kind];
  if (limit === null) return null;
  if (kind === "pentests" && limit === 0)
    return (
      "Le pentest autonome est inclus dans l'offre Plateforme. Passez à l'offre supérieure " +
      "depuis l'onglet Abonnement de la console."
    );
  if (usage[kind] < limit) return null;
  return (
    `Limite de l'offre ${PLANS[plan].label} atteinte : ${limit} ${NOUN[kind]}. ` +
    "Passez à l'offre supérieure depuis l'onglet Abonnement de la console."
  );
}

/** Budget IA mensuel : bloque un nouveau pentest une fois le plafond atteint. */
export function budgetError(plan: PlanId, usage: Usage): string | null {
  const limit = PLANS[plan].limits.aiBudgetUsd;
  if (limit === null || limit === 0) return null; // 0 : déjà couvert par pentests = 0
  if (usage.aiBudgetUsd < limit) return null;
  return `Budget IA mensuel de l'offre ${PLANS[plan].label} atteint (${limit} $). Il se renouvelle le 1er du mois.`;
}

/**
 * Les limites ne sont appliquées que si le paiement en ligne est configuré (ou forcé par
 * ENFORCE_QUOTAS=1) : tant que personne ne peut souscrire, bloquer les pentests du plan
 * gratuit rendrait le produit inutilisable pour tout le monde.
 */
export function quotasEnforced(): boolean {
  return (
    process.env.ENFORCE_QUOTAS === "1" ||
    Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_PLATFORM)
  );
}

/** Raccourci pour les routes : plan + usage + contrôle en un appel. */
export async function checkQuota(orgId: string, kind: QuotaKind): Promise<string | null> {
  if (!quotasEnforced()) return null;
  const [{ plan }, usage] = await Promise.all([getOrgPlan(orgId), getUsage(orgId)]);
  const err = quotaError(plan, kind, usage);
  if (err) return err;
  return kind === "pentests" ? budgetError(plan, usage) : null;
}
