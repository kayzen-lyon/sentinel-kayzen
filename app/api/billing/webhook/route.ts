import { NextResponse } from "next/server";
import { dbConfigured } from "@/lib/db";
import {
  applySubscription,
  retrieveSubscription,
  verifyStripeSignature,
  type Subscription,
} from "@/lib/stripe";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

type StripeEvent = { type: string; data: { object: Record<string, unknown> } };

/**
 * Webhook Stripe (signature vérifiée sur le corps brut). Tient l'offre de l'organisation
 * à jour : souscription, changement, impayé, résiliation. Idempotent : chaque évènement
 * réapplique l'état courant de l'abonnement, un rejeu ne change rien.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
  if (!secret || !dbConfigured)
    return NextResponse.json({ error: "Webhook non configuré." }, { status: 503 });

  const payload = await req.text();
  if (!verifyStripeSignature(payload, req.headers.get("stripe-signature"), secret))
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }
  const obj = event.data?.object ?? {};

  try {
    if (event.type === "checkout.session.completed") {
      const subId = typeof obj.subscription === "string" ? obj.subscription : null;
      const orgId = typeof obj.client_reference_id === "string" ? obj.client_reference_id : null;
      if (subId) {
        // État relu chez Stripe : source de vérité, insensible à l'ordre des évènements.
        await applySubscription(await retrieveSubscription(subId), orgId);
        await logAudit({ orgId, action: "billing.subscribed", target: subId });
      }
    } else if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const id = typeof obj.id === "string" ? obj.id : null;
      if (id) {
        const sub =
          event.type === "customer.subscription.deleted"
            ? (obj as unknown as Subscription)
            : await retrieveSubscription(id);
        await applySubscription(sub);
        await logAudit({
          orgId: sub.metadata?.org_id ?? null,
          action: "billing.subscription_" + event.type.split(".").pop(),
          target: id,
          meta: { status: sub.status },
        });
      }
    }
  } catch {
    // 500 → Stripe réessaie automatiquement.
    return NextResponse.json({ error: "Traitement échoué." }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
