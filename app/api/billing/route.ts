import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { canManage } from "@/lib/orgs";
import { getActiveOrg } from "@/lib/activeorg";
import { getOrgPlan, getUsage, PLANS, quotasEnforced } from "@/lib/plans";
import { billingConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

/** Offre, limites et consommation de l'organisation active. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });

  const { orgId, role } = await getActiveOrg(session);
  const [plan, usage] = await Promise.all([getOrgPlan(orgId), getUsage(orgId)]);
  return NextResponse.json({
    plan: plan.plan,
    label: PLANS[plan.plan].label,
    status: plan.status,
    periodEnd: plan.periodEnd,
    exempt: plan.exempt,
    hasCustomer: plan.hasCustomer,
    limits: PLANS[plan.plan].limits,
    usage,
    canManage: canManage(role),
    billingConfigured,
    enforced: quotasEnforced(),
  });
}
