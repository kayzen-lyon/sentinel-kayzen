import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { checkRateLimit } from "@/lib/ratelimit";
import {
  addMemberByEmail,
  canManage,
  ensurePersonalOrg,
  getOrg,
  getRole,
  listMembers,
  removeMember,
  setMemberRole,
  type Role,
} from "@/lib/orgs";
import { listAudit, logAudit } from "@/lib/audit";
import { getIntegrations } from "@/lib/notify";

export const runtime = "nodejs";

async function activeOrg(session: {
  id: string;
  email: string;
  name?: string | null;
}) {
  return ensurePersonalOrg(session.id, session.name || session.email);
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });

  const orgId = await activeOrg(session);
  const [members, audit, role, org, integ] = await Promise.all([
    listMembers(orgId),
    listAudit(orgId, 100),
    getRole(orgId, session.id),
    getOrg(orgId),
    getIntegrations(orgId),
  ]);
  return NextResponse.json({
    orgId,
    role,
    members,
    audit,
    requireApproval: Boolean(org?.require_approval),
    slackUrl: integ.slack_url || "",
    webhookUrl: integ.webhook_url || "",
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });

  const orgId = await activeOrg(session);
  if (!canManage(await getRole(orgId, session.id)))
    return NextResponse.json({ error: "Droits insuffisants." }, { status: 403 });

  const rl = await checkRateLimit(`team:${session.id}`, 20, 3600);
  if (!rl.allowed)
    return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as { email?: string; role?: Role };
  if (!body.email) return NextResponse.json({ error: "E-mail requis." }, { status: 400 });
  const err = await addMemberByEmail(orgId, body.email, body.role || "member");
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  await logAudit({
    orgId,
    actorId: session.id,
    actorEmail: session.email,
    action: "team.add_member",
    target: body.email,
    meta: { role: body.role || "member" },
  });
  return NextResponse.json({ ok: true, members: await listMembers(orgId) });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });

  const orgId = await activeOrg(session);
  if (!canManage(await getRole(orgId, session.id)))
    return NextResponse.json({ error: "Droits insuffisants." }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { userId?: string; role?: Role };
  if (!body.userId || !body.role)
    return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });
  const err = await setMemberRole(orgId, body.userId, body.role);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  await logAudit({
    orgId,
    actorId: session.id,
    actorEmail: session.email,
    action: "team.set_role",
    target: body.userId,
    meta: { role: body.role },
  });
  return NextResponse.json({ ok: true, members: await listMembers(orgId) });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });

  const orgId = await activeOrg(session);
  if (!canManage(await getRole(orgId, session.id)))
    return NextResponse.json({ error: "Droits insuffisants." }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { userId?: string };
  if (!body.userId) return NextResponse.json({ error: "userId requis." }, { status: 400 });
  const err = await removeMember(orgId, body.userId);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  await logAudit({
    orgId,
    actorId: session.id,
    actorEmail: session.email,
    action: "team.remove_member",
    target: body.userId,
  });
  return NextResponse.json({ ok: true, members: await listMembers(orgId) });
}
