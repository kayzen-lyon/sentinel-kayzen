import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { approveJob, getJob, updateJobSystem } from "@/lib/jobs";
import { canManage, getRole } from "@/lib/orgs";
import { appBaseUrl, dispatchWorkerRun, choisirMoteur, githubConfigured } from "@/lib/github";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });

  const { id } = await params;
  const job = await getJob(id, session.id);
  if (!job) return NextResponse.json({ error: "Job introuvable." }, { status: 404 });
  if (job.status !== "pending_approval")
    return NextResponse.json({ error: "Ce pentest n'est pas en attente." }, { status: 409 });

  // Seuls owner/admin de l'organisation du job peuvent approuver.
  const role = job.org_id ? await getRole(job.org_id, session.id) : null;
  if (!canManage(role))
    return NextResponse.json({ error: "Droits insuffisants." }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { decision?: string };
  const decision = body.decision === "reject" ? "reject" : "approve";

  if (decision === "reject") {
    await updateJobSystem(id, { status: "cancelled" });
    await logAudit({
      orgId: job.org_id,
      actorId: session.id,
      actorEmail: session.email,
      action: "pentest.rejected",
      target: id,
    });
    return NextResponse.json({ ok: true, status: "cancelled" });
  }

  await approveJob(id);
  await logAudit({
    orgId: job.org_id,
    actorId: session.id,
    actorEmail: session.email,
    action: "pentest.approved",
    target: id,
  });

  if (githubConfigured) {
    try {
      await dispatchWorkerRun({
        jobId: id,
        target: job.target_url,
        mode: job.mode,
        ingestUrl: `${appBaseUrl(req)}/api/jobs/ingest`,
        instruction: job.instruction ?? undefined,
        engine: choisirMoteur(job.engine),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Échec du déclenchement du runner.";
      await updateJobSystem(id, { status: "error", error: msg }).catch(() => {});
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }
  return NextResponse.json({ ok: true, status: "queued" });
}
