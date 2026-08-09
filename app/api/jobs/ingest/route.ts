import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { dbConfigured } from "@/lib/db";
import {
  getJobSystem,
  listFindings,
  updateJobSystem,
  upsertFindingsSystem,
  type IngestFinding,
  type JobStatus,
} from "@/lib/jobs";
import { notifyOrg } from "@/lib/notify";
import { getUserById } from "@/lib/users";
import { pentestReportEmail, sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 30;

function secretOk(provided: string | null): boolean {
  const expected = process.env.WORKER_INGEST_SECRET || "";
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

type IngestBody = {
  jobId?: string;
  status?: JobStatus;
  runName?: string;
  costUsd?: number;
  reportMd?: string;
  error?: string;
  findings?: IngestFinding[];
  agentsGraph?: unknown;
};

/**
 * Point d'ingestion des findings poussés par le runner Strix (GitHub Actions).
 * Authentifié par le secret partagé `WORKER_INGEST_SECRET` (en-tête x-worker-secret).
 */
export async function POST(req: Request) {
  if (!secretOk(req.headers.get("x-worker-secret")))
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  if (!dbConfigured)
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });

  let body: IngestBody;
  try {
    body = (await req.json()) as IngestBody;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  if (!body.jobId)
    return NextResponse.json({ error: "jobId requis." }, { status: 400 });

  const job = await getJobSystem(body.jobId);
  if (!job) return NextResponse.json({ error: "Job introuvable." }, { status: 404 });

  let inserted = 0;
  if (Array.isArray(body.findings) && body.findings.length)
    inserted = await upsertFindingsSystem(body.jobId, body.findings);

  const wasTerminal = job.status === "done" || job.status === "error" || job.status === "cancelled";

  await updateJobSystem(body.jobId, {
    status: body.status,
    runName: body.runName,
    costUsd: body.costUsd,
    reportMd: body.reportMd,
    error: body.error,
    agentsGraph: body.agentsGraph,
  });

  // Notification (Slack/webhook) une seule fois, à la transition vers un état terminal.
  const nowTerminal =
    body.status === "done" || body.status === "error" || body.status === "cancelled";
  if (!wasTerminal && nowTerminal) {
    const findings = await listFindings(body.jobId);
    const host = (() => {
      try {
        return new URL(job.target_url).host;
      } catch {
        return job.target_url;
      }
    })();
    await notifyOrg(job.org_id, {
      event: "pentest.completed",
      text:
        `Sentinel — pentest ${body.status === "done" ? "terminé" : body.status} sur ${host} : ` +
        `${findings.length} vulnérabilité(s) trouvée(s).`,
      data: {
        jobId: body.jobId,
        target: job.target_url,
        status: body.status,
        findings: findings.length,
      },
    });

    // Rapport par e-mail au demandeur (best-effort, seulement si Resend configuré)
    const user = await getUserById(job.user_id).catch(() => null);
    if (user?.email) {
      await sendEmail(
        user.email,
        `Sentinel — pentest ${host} : ${findings.length} vulnérabilité(s)`,
        pentestReportEmail({
          host,
          status: String(body.status),
          findings: findings.map((f) => ({
            title: f.title,
            severity: f.severity,
            cvss: f.cvss,
          })),
          reportMd: body.reportMd ?? null,
        })
      );
    }
  }

  return NextResponse.json({ ok: true, inserted });
}
