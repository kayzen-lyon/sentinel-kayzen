/**
 * Déclenchement du runner Strix via l'API GitHub `repository_dispatch`.
 *
 * Le moteur Strix tourne dans un workflow GitHub Actions éphémère (gratuit), pas sur une
 * infra locale. Cette fonction envoie l'événement qui démarre le workflow ; le runner récupère
 * la charge utile (`client_payload`), exécute Strix, et repousse les findings vers l'API
 * d'ingestion (`/api/jobs/ingest`).
 *
 * Variables d'environnement (Vercel) :
 *  - GITHUB_DISPATCH_TOKEN : PAT (scope `repo`) autorisé sur le dépôt runner.
 *  - GITHUB_RUNNER_REPO    : "owner/repo" du dépôt qui héberge le workflow.
 *  - APP_BASE_URL          : URL publique de Sentinel (pour construire l'URL d'ingestion).
 */

export const githubConfigured = Boolean(
  process.env.GITHUB_DISPATCH_TOKEN && process.env.GITHUB_RUNNER_REPO
);

/** Moteur d'exécution : Strix (agents IA) ou la suite OSS déterministe (Nuclei + testssl.sh). */
export type ScanEngine = "strix" | "oss";

export type DispatchPayload = {
  jobId: string;
  target: string;
  mode: string;
  ingestUrl: string;
  instruction?: string;
  engine?: ScanEngine;
};

export async function dispatchWorkerRun(payload: DispatchPayload): Promise<void> {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  const repo = process.env.GITHUB_RUNNER_REPO;
  if (!token || !repo) throw new Error("Runner GitHub non configuré.");

  // Chaque moteur écoute son propre event_type de repository_dispatch.
  const eventType = payload.engine === "oss" ? "oss-scan" : "strix-scan";

  const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
    method: "POST",
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      "content-type": "application/json",
      "user-agent": "SentinelByKayzen",
    },
    body: JSON.stringify({
      event_type: eventType,
      client_payload: payload,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Échec du déclenchement GitHub (${res.status}): ${body.slice(0, 200)}`);
  }
}

/** URL publique de l'app (pour construire l'URL d'ingestion transmise au runner). */
export function appBaseUrl(req: Request): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}
