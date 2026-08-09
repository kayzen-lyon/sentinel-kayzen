import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { verifyDomain } from "@/lib/domains";
import { checkRateLimit } from "@/lib/ratelimit";
import { ensurePersonalOrg } from "@/lib/orgs";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured)
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });

  const rl = await checkRateLimit(`verify:${session.id}`, 30, 3600);
  if (!rl.allowed)
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez plus tard." },
      { status: 429 }
    );

  let body: { domain?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const result = await verifyDomain(session.id, body.domain || "");
  if (result.verified) {
    const orgId = await ensurePersonalOrg(session.id, session.name || session.email).catch(
      () => null
    );
    await logAudit({
      orgId,
      actorId: session.id,
      actorEmail: session.email,
      action: "domain.verified",
      target: body.domain || null,
    });
  }
  return NextResponse.json(result, { status: result.verified ? 200 : 400 });
}
