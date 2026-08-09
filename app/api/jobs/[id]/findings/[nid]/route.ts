import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { getJob, setFindingStatus, type FindingStatus } from "@/lib/jobs";
import { logAudit } from "@/lib/audit";

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

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
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
