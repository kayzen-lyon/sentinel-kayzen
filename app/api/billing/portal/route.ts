import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured, query } from "@/lib/db";
import { canManage } from "@/lib/orgs";
import { getActiveOrg } from "@/lib/activeorg";
import { createPortalSession } from "@/lib/stripe";
import { publicOrigin } from "@/lib/origin";

export const runtime = "nodejs";

/** Portail client Stripe : moyen de paiement, factures, résiliation. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });

  const { orgId, role } = await getActiveOrg(session);
  if (!canManage(role))
    return NextResponse.json({ error: "Droits insuffisants." }, { status: 403 });

  const rows = await query<{ stripe_customer_id: string | null }>(
    `SELECT stripe_customer_id FROM organizations WHERE id = $1`,
    [orgId]
  );
  const customer = rows[0]?.stripe_customer_id;
  if (!customer)
    return NextResponse.json(
      { error: "Aucun abonnement Stripe pour cette organisation." },
      { status: 404 }
    );
  try {
    return NextResponse.json({ url: await createPortalSession(customer, publicOrigin(req)) });
  } catch {
    return NextResponse.json({ error: "Stripe est indisponible. Réessayez." }, { status: 502 });
  }
}
