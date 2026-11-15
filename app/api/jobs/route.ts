import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { validateTargetUrl } from "@/lib/ssrf";
import { isHostVerified } from "@/lib/domains";
import { checkRateLimit } from "@/lib/ratelimit";
import { createJob, listJobs, updateJobSystem, type JobMode } from "@/lib/jobs";
import { appBaseUrl, dispatchWorkerRun, githubConfigured, type ScanEngine } from "@/lib/github";
import { canLaunch, canManage, getOrg } from "@/lib/orgs";
import { getActiveOrg } from "@/lib/activeorg";
import { logAudit } from "@/lib/audit";
import { getPlaybook } from "@/lib/playbooks";
import { pentestEmailBlock } from "@/lib/emailgate";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ jobs: [] });
  const { orgId } = await getActiveOrg(session);
  const jobs = await listJobs(session.id, orgId);
  return NextResponse.json({ jobs });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  if (!dbConfigured)
    return NextResponse.json(
      { error: "Base de données requise pour le pentest autonome." },
      { status: 503 }
    );

  let body: { url?: string; mode?: string; playbook?: string; engine?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  // Pentest offensif : quota plus strict (2 lancements / heure).
  const rl = await checkRateLimit(`job:${session.id}`, 2, 3600);
  if (!rl.allowed)
    return NextResponse.json(
      { error: `Limite de lancements atteinte. Réessayez dans ${rl.retryAfter ?? 60}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } }
    );

  const check = await validateTargetUrl(body.url || "");
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 400 });

  // Adresse e-mail confirmée exigée avant toute action offensive.
  const emailBlock = await pentestEmailBlock(session.id);
  if (emailBlock) return NextResponse.json({ error: emailBlock }, { status: 403 });

  // Le pentest est lancé DANS l'organisation active : son rôle, ses domaines vérifiés
  // et sa politique d'approbation s'appliquent.
  const { orgId, role } = await getActiveOrg(session);
  if (!canLaunch(role))
    return NextResponse.json(
      { error: "Votre rôle (Lecteur) ne permet pas de lancer un pentest dans cette organisation." },
      { status: 403 }
    );

  // VERROU LÉGAL : un run offensif exige la vérification de propriété du domaine
  // dans cette organisation.
  const verified = await isHostVerified(orgId, check.url.hostname).catch(() => false);
  if (!verified)
    return NextResponse.json(
      {
        error:
          "Domaine non vérifié dans cette organisation. Le pentest autonome n'est autorisé que " +
          "sur un domaine dont la propriété a été prouvée (onglet Domaines).",
      },
      { status: 403 }
    );

  const playbook = getPlaybook(body.playbook);
  const mode: JobMode = playbook
    ? playbook.mode
    : body.mode === "deep"
      ? "deep"
      : "standard";
  const instruction = playbook?.instruction ?? null;
  const engine: ScanEngine = body.engine === "oss" ? "oss" : "strix";

  // Approbation human-in-the-loop : si l'organisation l'exige et que le demandeur n'est pas
  // gestionnaire (owner/admin), le run attend une validation avant d'être déclenché.
  const org = await getOrg(orgId).catch(() => null);
  const needsApproval = Boolean(org?.require_approval) && !canManage(role);

  const jobId = await createJob(
    session.id,
    check.url.toString(),
    mode,
    orgId,
    needsApproval ? "pending_approval" : "queued",
    playbook?.id ?? null,
    instruction
  );
  await logAudit({
    orgId,
    actorId: session.id,
    actorEmail: session.email,
    action: needsApproval ? "pentest.pending" : "pentest.launch",
    target: check.url.hostname,
    meta: { mode, jobId },
  });

  if (needsApproval) {
    return NextResponse.json({
      jobId,
      pendingApproval: true,
      message:
        "Pentest en attente d'approbation par un administrateur de l'organisation avant exécution.",
    });
  }

  if (!githubConfigured) {
    // Pas de runner configuré : le job reste en file (mode démonstration / audit managé).
    return NextResponse.json({
      jobId,
      queuedOnly: true,
      message:
        "Job enregistré. Runner Strix non configuré : l'exécution sera lancée par l'équipe " +
        "(audit managé) ou après configuration du runner GitHub Actions.",
    });
  }

  try {
    await dispatchWorkerRun({
      jobId,
      target: check.url.toString(),
      mode,
      ingestUrl: `${appBaseUrl(req)}/api/jobs/ingest`,
      instruction: instruction ?? undefined,
      engine,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Échec du déclenchement du runner.";
    await updateJobSystem(jobId, { status: "error", error: msg }).catch(() => {});
    return NextResponse.json({ jobId, error: msg }, { status: 502 });
  }

  return NextResponse.json({ jobId });
}
