import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { checkRateLimit } from "@/lib/ratelimit";
import {
  addMemberByEmail,
  canManage,
  getOrg,
  getRole,
  listMembers,
  removeMember,
  setMemberRole,
  type Role,
} from "@/lib/orgs";
import { listAudit, logAudit } from "@/lib/audit";
import { getIntegrations } from "@/lib/notify";
import { hint } from "@/lib/secretbox";
import { findUserByEmail } from "@/lib/users";
import { validateEmail } from "@/lib/password";
import {
  createInvitation,
  INVITE_TTL_DAYS,
  listPendingInvitations,
  revokeInvitation,
} from "@/lib/invitations";
import { invitationEmail, sendEmail } from "@/lib/email";
import { publicOrigin } from "@/lib/origin";
import { getActiveOrg } from "@/lib/activeorg";

const ROLE_FR: Record<string, string> = { admin: "Admin", member: "Membre", viewer: "Lecteur" };

export const runtime = "nodejs";

async function activeOrg(session: {
  id: string;
  email: string;
  name?: string | null;
}) {
  return (await getActiveOrg(session)).orgId;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });

  const orgId = await activeOrg(session);
  const [members, audit, role, org, integ, invitations] = await Promise.all([
    listMembers(orgId),
    listAudit(orgId, 100),
    getRole(orgId, session.id),
    getOrg(orgId),
    getIntegrations(orgId),
    listPendingInvitations(orgId),
  ]);
  return NextResponse.json({
    orgId,
    role,
    members,
    invitations,
    audit,
    requireApproval: Boolean(org?.require_approval),
    // Jamais l'URL complète (elle vaut un secret) : seulement un aperçu.
    slackHint: hint(integ.slack_url),
    webhookHint: hint(integ.webhook_url),
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
  const email = (body.email || "").trim().toLowerCase();
  if (!validateEmail(email))
    return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
  const role = body.role || "member";

  // Pas encore de compte → invitation par lien (e-mail si Resend est configuré).
  if (!(await findUserByEmail(email))) {
    const inv = await createInvitation(orgId, email, role, session.id);
    if (inv.error || !inv.token)
      return NextResponse.json({ error: inv.error || "Échec." }, { status: 400 });
    const inviteUrl = `${publicOrigin(req)}/invitation/${inv.token}`;
    const org = await getOrg(orgId);
    const emailSent = await sendEmail(
      email,
      "Invitation à rejoindre une équipe sur Sentinel",
      invitationEmail({
        orgName: org?.name || "Sentinel",
        inviterEmail: session.email,
        role: ROLE_FR[role] || role,
        url: inviteUrl,
        days: INVITE_TTL_DAYS,
      })
    );
    await logAudit({
      orgId,
      actorId: session.id,
      actorEmail: session.email,
      action: "team.invite",
      target: email,
      meta: { role, emailSent },
    });
    // Le lien n'est renvoyé qu'ici, une seule fois (seul son hash est stocké).
    return NextResponse.json({
      ok: true,
      invited: true,
      inviteUrl,
      emailSent,
      invitations: await listPendingInvitations(orgId),
    });
  }

  const err = await addMemberByEmail(orgId, email, role);
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

  const body = (await req.json().catch(() => ({}))) as { userId?: string; invitationId?: string };

  if (body.invitationId) {
    await revokeInvitation(orgId, body.invitationId);
    await logAudit({
      orgId,
      actorId: session.id,
      actorEmail: session.email,
      action: "team.invite_revoked",
      target: body.invitationId,
    });
    return NextResponse.json({ ok: true, invitations: await listPendingInvitations(orgId) });
  }

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
