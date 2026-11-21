import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { getJob, setFindingStatus, setFindingTriage, type FindingStatus } from "@/lib/jobs";
import { parseTriage } from "@/lib/triage";
import { logAudit } from "@/lib/audit";
import { canLaunch, getRole } from "@/lib/orgs";

export const runtime = "nodejs";

const VALID: FindingStatus[] = ["open", "fixed", "accepted", "false_positive"];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; nid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });

  const { id, nid } = await params;
  const job = await getJob(id, session.id);
  if (!job) return NextResponse.json({ error: "Job introuvable." }, { status: 404 });
  // Trier les vulnérabilités est une action d'écriture : pas pour un Lecteur.
  if (job.org_id && !canLaunch(await getRole(job.org_id, session.id).catch(() => null)))
    return NextResponse.json({ error: "Droits insuffisants (Lecteur)." }, { status: 403 });

  let body: { status?: string; triage?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  // Grille de triage (7 questions) : enregistrée seule, sans changer le statut.
  if (body.triage !== undefined) {
    const answers = parseTriage(body.triage);
    if (!answers) return NextResponse.json({ error: "Grille de triage invalide." }, { status: 400 });
    await setFindingTriage(id, nid, answers);
    await logAudit({
      orgId: job.org_id,
      actorId: session.id,
      actorEmail: session.email,
      action: "finding.triage",
      target: nid,
      meta: { jobId: id },
    });
    if (body.status === undefined) return NextResponse.json({ ok: true });
  }

  const status = body.status as FindingStatus;
  if (!VALID.includes(status))
    return NextResponse.json({ error: "Statut invalide." }, { status: 400 });

  await setFindingStatus(id, nid, status);
  await logAudit({
    orgId: job.org_id,
    actorId: session.id,
    actorEmail: session.email,
    action: "finding.status",
    target: nid,
    meta: { jobId: id, status },
  });
  return NextResponse.json({ ok: true });
}
