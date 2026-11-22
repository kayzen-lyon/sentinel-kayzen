import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { canManage, getRole, setRequireApproval } from "@/lib/orgs";
import { setIntegrations } from "@/lib/notify";
import { logAudit } from "@/lib/audit";
import { getActiveOrg } from "@/lib/activeorg";
import { parseRetentionDays, setEvidenceRetention } from "@/lib/retention";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });

  const orgId = (await getActiveOrg(session)).orgId;
  if (!canManage(await getRole(orgId, session.id)))
    return NextResponse.json({ error: "Droits insuffisants." }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    requireApproval?: boolean;
    slackUrl?: string;
    webhookUrl?: string;
    evidenceRetentionDays?: number | string | null;
  };

  // Durée de conservation des preuves/rapports : null = pas de purge (aucune valeur par défaut).
  if (body.evidenceRetentionDays !== undefined) {
    const parsed = parseRetentionDays(body.evidenceRetentionDays);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    await setEvidenceRetention(orgId, parsed.value);
    await logAudit({
      orgId,
      actorId: session.id,
      actorEmail: session.email,
      action: "team.evidence_retention",
      meta: { days: parsed.value },
    });
  }

  // Réglage des intégrations sortantes (si fourni)
  if (body.slackUrl !== undefined || body.webhookUrl !== undefined) {
    // undefined = conserver la valeur actuelle (l'interface n'envoie que les champs modifiés)
    const err = await setIntegrations(orgId, body.slackUrl, body.webhookUrl);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    await logAudit({
      orgId,
      actorId: session.id,
      actorEmail: session.email,
      action: "team.integrations",
    });
  }

  if (body.requireApproval !== undefined) {
    await setRequireApproval(orgId, Boolean(body.requireApproval));
    await logAudit({
      orgId,
      actorId: session.id,
      actorEmail: session.email,
      action: "team.require_approval",
      meta: { value: Boolean(body.requireApproval) },
    });
  }

  return NextResponse.json({ ok: true });
}
