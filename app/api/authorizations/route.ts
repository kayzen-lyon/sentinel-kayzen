import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { getActiveOrg } from "@/lib/activeorg";
import { canManage } from "@/lib/orgs";
import { logAudit } from "@/lib/audit";
import { checkRateLimit } from "@/lib/ratelimit";
import { parseAuthorizationInput } from "@/lib/authorizationScope";
import { createAuthorization, listAuthorizations, revokeAuthorization } from "@/lib/authorizations";

export const runtime = "nodejs";

/**
 * Autorisations écrites des clients pour l'organisation active.
 * Lecture : tout membre. Enregistrement et révocation : owner/admin (engagement juridique).
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ authorizations: [], canManage: false });
  const { orgId, role } = await getActiveOrg(session);
  const authorizations = await listAuthorizations(orgId);
  return NextResponse.json({ authorizations, canManage: canManage(role) });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });

  const { orgId, role } = await getActiveOrg(session);
  if (!canManage(role))
    return NextResponse.json(
      { error: "Seul un administrateur de l'organisation peut enregistrer une autorisation." },
      { status: 403 }
    );

  const rl = await checkRateLimit(`authz:${session.id}`, 30, 3600);
  if (!rl.allowed) return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  const parsed = parseAuthorizationInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const a = parsed.value;
  const id = await createAuthorization(orgId, { id: session.id, email: session.email }, a);
  await logAudit({
    orgId,
    actorId: session.id,
    actorEmail: session.email,
    action: "authorization.recorded",
    target: a.includeSubdomains ? `*.${a.host}` : a.host,
    meta: {
      authorizationId: id,
      startsAt: a.startsAt.toISOString(),
      endsAt: a.endsAt.toISOString(),
      signerName: a.signerName,
      signerTitle: a.signerTitle,
      acceptedAt: a.acceptedAt.toISOString(),
    },
  });
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });

  const { orgId, role } = await getActiveOrg(session);
  if (!canManage(role))
    return NextResponse.json(
      { error: "Seul un administrateur de l'organisation peut révoquer une autorisation." },
      { status: 403 }
    );

  const id = new URL(req.url).searchParams.get("id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id))
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  const host = await revokeAuthorization(orgId, id, session.id);
  if (!host)
    return NextResponse.json({ error: "Autorisation introuvable ou déjà révoquée." }, { status: 404 });
  await logAudit({
    orgId,
    actorId: session.id,
    actorEmail: session.email,
    action: "authorization.revoked",
    target: host,
    meta: { authorizationId: id },
  });
  return NextResponse.json({ ok: true });
}
