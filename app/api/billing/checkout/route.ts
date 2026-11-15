import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured, query } from "@/lib/db";
import { canManage } from "@/lib/orgs";
import { getActiveOrg } from "@/lib/activeorg";
import { checkRateLimit } from "@/lib/ratelimit";
import { getOrgPlan } from "@/lib/plans";
import { billingConfigured, createCheckoutSession } from "@/lib/stripe";
import { publicOrigin } from "@/lib/origin";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

/** Ouvre une session Stripe Checkout pour abonner l'organisation active à l'offre Plateforme. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  if (!billingConfigured)
    return NextResponse.json(
      { error: "Le paiement en ligne n'est pas encore activé. Contactez-nous pour souscrire." },
      { status: 503 }
    );

  const { orgId, role } = await getActiveOrg(session);
  if (!canManage(role))
    return NextResponse.json(
      { error: "Seul un propriétaire ou un admin peut souscrire." },
      { status: 403 }
    );

  const rl = await checkRateLimit(`checkout:${session.id}`, 10, 3600);
  if (!rl.allowed) return NextResponse.json({ error: "Trop de tentatives." }, { status: 429 });

  const plan = await getOrgPlan(orgId);
  if (plan.plan !== "free" && !plan.exempt)
    return NextResponse.json(
      { error: "Cette organisation a déjà un abonnement : utilisez « Gérer l'abonnement »." },
      { status: 409 }
    );

  const rows = await query<{ stripe_customer_id: string | null }>(
    `SELECT stripe_customer_id FROM organizations WHERE id = $1`,
    [orgId]
  );
  try {
    const url = await createCheckoutSession({
      orgId,
      email: session.email,
      customerId: rows[0]?.stripe_customer_id ?? null,
      origin: publicOrigin(req),
    });
    await logAudit({
      orgId,
      actorId: session.id,
      actorEmail: session.email,
      action: "billing.checkout",
    });
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "Stripe est indisponible. Réessayez." }, { status: 502 });
  }
}
