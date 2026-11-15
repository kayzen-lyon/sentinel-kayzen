import { NextResponse } from "next/server";
import { dbConfigured } from "@/lib/db";
import { verifyWebhookSignature, postCommitStatus } from "@/lib/githubApp";
import {
  deleteInstallation,
  getInstallation,
  upsertInstallation,
} from "@/lib/ghinstall";
import { createGithubJob } from "@/lib/jobs";
import { checkQuota } from "@/lib/plans";
import { appBaseUrl, dispatchWorkerRun, githubConfigured } from "@/lib/github";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

const PR_ACTIONS = new Set(["opened", "synchronize", "reopened"]);

export async function POST(req: Request) {
  if (!dbConfigured)
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });

  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-hub-signature-256")))
    return NextResponse.json({ error: "Signature invalide." }, { status: 401 });

  const event = req.headers.get("x-github-event") || "";
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
  }

  // Installation / désinstallation de l'app
  if (event === "installation") {
    const action = payload.action as string;
    const inst = payload.installation as { id: number; account?: { login?: string } };
    if (action === "deleted") {
      await deleteInstallation(inst.id);
    } else {
      await upsertInstallation(inst.id, inst.account?.login ?? null, null, null);
    }
    return NextResponse.json({ ok: true });
  }

  // Pull request → statut de check + scan Strix
  if (event === "pull_request") {
    const action = payload.action as string;
    if (!PR_ACTIONS.has(action)) return NextResponse.json({ ok: true, ignored: action });

    const inst = payload.installation as { id: number } | undefined;
    const repo = payload.repository as {
      name: string;
      html_url: string;
      owner: { login: string };
    };
    const pr = payload.pull_request as { number: number; head: { sha: string } };
    if (!inst || !repo || !pr) return NextResponse.json({ ok: true });

    const link = await getInstallation(inst.id);
    if (!link?.user_id) {
      // Installation non reliée à un compte Sentinel : on ne peut pas scoper le scan.
      await postCommitStatus(
        inst.id,
        repo.owner.login,
        repo.name,
        pr.head.sha,
        "error",
        "Installez et reliez Sentinel à votre compte pour activer le scan.",
      );
      return NextResponse.json({ ok: true, unlinked: true });
    }

    // Offre : pas de pentest sur PR si le plan ou le quota de l'organisation ne le permet pas.
    const quota = link.org_id
      ? await checkQuota(link.org_id, "pentests").catch(() => null)
      : "Aucune organisation liée.";
    if (quota) {
      await postCommitStatus(
        inst.id,
        repo.owner.login,
        repo.name,
        pr.head.sha,
        "error",
        "Pentest Sentinel non lancé : offre ou quota."
      ).catch(() => {});
      return NextResponse.json({ ok: true, skipped: "quota" });
    }

    await postCommitStatus(
      inst.id,
      repo.owner.login,
      repo.name,
      pr.head.sha,
      "pending",
      "Pentest Sentinel en cours…"
    );

    const jobId = await createGithubJob(link.user_id, link.org_id, repo.html_url, {
      installationId: inst.id,
      owner: repo.owner.login,
      repo: repo.name,
      sha: pr.head.sha,
      pr: pr.number,
    });

    await logAudit({
      orgId: link.org_id,
      actorId: link.user_id,
      action: "pentest.launch",
      target: `${repo.owner.login}/${repo.name}#${pr.number}`,
      meta: { jobId, via: "github-app" },
    });

    if (githubConfigured) {
      await dispatchWorkerRun({
        jobId,
        target: repo.html_url,
        mode: "standard",
        ingestUrl: `${appBaseUrl(req)}/api/jobs/ingest`,
        instruction:
          `Analyse de sécurité de la pull request #${pr.number} du dépôt ` +
          `${repo.owner.login}/${repo.name}. Concentre-toi sur les vulnérabilités introduites.`,
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, jobId });
  }

  return NextResponse.json({ ok: true, ignored: event });
}
