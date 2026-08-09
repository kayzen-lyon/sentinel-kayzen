import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { canManage, ensurePersonalOrg, getRole } from "@/lib/orgs";
import { getTicketConfig, setTicketConfig } from "@/lib/tickets";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });

  const orgId = await ensurePersonalOrg(session.id, session.name || session.email);
  const [role, cfg] = await Promise.all([getRole(orgId, session.id), getTicketConfig(orgId)]);
  return NextResponse.json({
    canManage: canManage(role),
    jira: {
      configured: Boolean(cfg.jira_base_url && cfg.jira_token && cfg.jira_project),
      baseUrl: cfg.jira_base_url || "",
      email: cfg.jira_email || "",
      project: cfg.jira_project || "",
    },
    linear: {
      configured: Boolean(cfg.linear_key && cfg.linear_team),
      team: cfg.linear_team || "",
    },
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });

  const orgId = await ensurePersonalOrg(session.id, session.name || session.email);
  if (!canManage(await getRole(orgId, session.id)))
    return NextResponse.json({ error: "Droits insuffisants." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const err = await setTicketConfig(orgId, body);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  await logAudit({
    orgId,
    actorId: session.id,
    actorEmail: session.email,
    action: "tickets.configured",
  });
  return NextResponse.json({ ok: true });
}
