import { createHmac, timingSafeEqual } from "node:crypto";
import { ensureSchema, query } from "./db";
import { isPlanId, type PlanId } from "./plans";

/**
 * Stripe sans dépendance : appels REST (form-encoded) + vérification de signature
 * des webhooks. Variables :
 * - STRIPE_SECRET_KEY        : clé secrète (sk_live_… / sk_test_…)
 * - STRIPE_WEBHOOK_SECRET    : secret de l'endpoint webhook (whsec_…)
 * - STRIPE_PRICE_PLATFORM    : id du prix mensuel de l'offre Plateforme (price_…)
 * - STRIPE_PRICE_ENTERPRISE  : (optionnel) id d'un prix Entreprise
 * Un prix peut aussi porter la métadonnée `sentinel_plan` = platform | enterprise.
 */

const API = "https://api.stripe.com/v1";

export const billingConfigured = Boolean(
  process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_PLATFORM
);

type Params = Record<string, string | number | boolean | undefined | null>;

async function stripe<T>(method: "GET" | "POST", path: string, params: Params = {}): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe non configuré.");
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) body.append(k, String(v));
  const url = method === "GET" && body.toString() ? `${API}${path}?${body}` : `${API}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: method === "POST" ? body : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const data = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message || `Stripe a répondu ${res.status}.`);
  return data;
}

type Price = { id: string; metadata?: Record<string, string> };
export type Subscription = {
  id: string;
  customer: string;
  status: string;
  current_period_end?: number;
  metadata?: Record<string, string>;
  items: { data: { price: Price; current_period_end?: number }[] };
};

/** Offre correspondant au prix souscrit. */
export function planFromPrice(price: Price | undefined): PlanId {
  const meta = price?.metadata?.sentinel_plan;
  if (isPlanId(meta) && meta !== "free") return meta;
  if (price?.id && price.id === process.env.STRIPE_PRICE_ENTERPRISE) return "enterprise";
  return "platform"; // tout abonnement payant donne au moins l'offre Plateforme
}

/** Statuts qui conservent l'offre payante (past_due : délai de grâce pendant les relances). */
const PAID_STATUSES = new Set(["active", "trialing", "past_due"]);

export async function createCheckoutSession(opts: {
  orgId: string;
  email: string;
  customerId: string | null;
  origin: string;
}): Promise<string> {
  const s = await stripe<{ url: string }>("POST", "/checkout/sessions", {
    mode: "subscription",
    "line_items[0][price]": process.env.STRIPE_PRICE_PLATFORM,
    "line_items[0][quantity]": 1,
    client_reference_id: opts.orgId,
    "subscription_data[metadata][org_id]": opts.orgId,
    customer: opts.customerId ?? undefined,
    customer_email: opts.customerId ? undefined : opts.email,
    billing_address_collection: "required",
    "tax_id_collection[enabled]": true,
    allow_promotion_codes: true,
    locale: "fr",
    success_url: `${opts.origin}/dashboard/abonnement?paiement=ok`,
    cancel_url: `${opts.origin}/dashboard/abonnement?paiement=annule`,
  });
  return s.url;
}

export async function createPortalSession(customerId: string, origin: string): Promise<string> {
  const s = await stripe<{ url: string }>("POST", "/billing_portal/sessions", {
    customer: customerId,
    return_url: `${origin}/dashboard/abonnement`,
    locale: "fr",
  });
  return s.url;
}

export async function retrieveSubscription(id: string): Promise<Subscription> {
  return stripe<Subscription>("GET", `/subscriptions/${encodeURIComponent(id)}`);
}

/**
 * Vérifie l'en-tête `Stripe-Signature` (HMAC-SHA256 de `t.payload`, tolérance 5 min).
 * Comparaison en temps constant ; plusieurs signatures v1 possibles (rotation du secret).
 */
export function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string,
  nowSec = Math.floor(Date.now() / 1000)
): boolean {
  if (!header || !secret) return false;
  const parts = header.split(",").map((p) => p.trim().split("="));
  const t = parts.find(([k]) => k === "t")?.[1];
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || !sigs.length || !/^\d+$/.test(t)) return false;
  if (Math.abs(nowSec - Number(t)) > 300) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex"));
  return sigs.some((s) => {
    const b = Buffer.from(s || "");
    return b.length === expected.length && timingSafeEqual(b, expected);
  });
}

/** Applique l'état d'un abonnement à l'organisation (idempotent). */
export async function applySubscription(sub: Subscription, orgIdHint?: string | null): Promise<void> {
  await ensureSchema();
  const orgId = sub.metadata?.org_id || orgIdHint || null;
  const paid = PAID_STATUSES.has(sub.status);
  const plan: PlanId = paid ? planFromPrice(sub.items?.data?.[0]?.price) : "free";
  const periodEndSec = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end;
  const periodEnd = periodEndSec ? new Date(periodEndSec * 1000).toISOString() : null;
  await query(
    `UPDATE organizations
        SET plan = $3, plan_status = $4, plan_period_end = $5,
            stripe_customer_id = $2,
            stripe_subscription_id = CASE WHEN $6 THEN $7 ELSE NULL END
      WHERE ($1::uuid IS NOT NULL AND id = $1::uuid)
         OR ($1::uuid IS NULL AND stripe_customer_id = $2)`,
    [orgId, sub.customer, plan, sub.status, periodEnd, paid, sub.id]
  );
}
