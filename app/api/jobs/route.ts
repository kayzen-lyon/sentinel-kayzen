import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { validateTargetUrl } from "@/lib/ssrf";
import { isHostVerified } from "@/lib/domains";
import { checkRateLimit } from "@/lib/ratelimit";
import { createJob, listJobs, updateJobSystem, type JobMode } from "@/lib/jobs";
import { appBaseUrl, dispatchStrixRun, githubConfigured } from "@/lib/github";
import { canManage, ensurePersonalOrg, getOrg, getRole } from "@/lib/orgs";
import { logAudit } from "@/lib/audit";
import { getPlaybook } from "@/lib/playbooks";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ jobs: [] });
  const jobs = await listJobs(session.id);
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

  let body: { url?: string; mode?: string; playbook?: string };
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

  // VERROU LÉGAL : un run offensif exige la vérification de propriété du domaine.
  const verified = await isHostVerified(session.id, check.url.hostname).catch(() => false);
  if (!verified)
    return NextResponse.json(
      {
        error:
          "Domaine non vérifié. Le pentest autonome n'est autorisé que sur un domaine dont " +
          "vous avez prouvé la propriété (onglet Domaines).",
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
  const orgId = await ensurePersonalOrg(session.id, session.name || session.email).catch(
    () => null
  );

  // Approbation human-in-the-loop : si l'organisation l'exige et que le demandeur n'est pas
  // gestionnaire (owner/admin), le run attend une validation avant d'être déclenché.
  const org = orgId ? await getOrg(orgId).catch(() => null) : null;
  const role = orgId ? await getRole(orgId, session.id).catch(() => null) : null;
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
    await dispatchStrixRun({
      jobId,
      target: check.url.toString(),
      mode,
      ingestUrl: `${appBaseUrl(req)}/api/jobs/ingest`,
      instruction: instruction ?? undefined,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Échec du déclenchement du runner.";
    await updateJobSystem(jobId, { status: "error", error: msg }).catch(() => {});
    return NextResponse.json({ jobId, error: msg }, { status: 502 });
  }

  return NextResponse.json({ jobId });
}
