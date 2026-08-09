import { createHmac, createSign, timingSafeEqual } from "node:crypto";

/**
 * GitHub App managée : Sentinel héberge UNE app GitHub que les clients installent sur leurs
 * dépôts. À chaque pull request, un scan Strix est déclenché et le résultat est publié comme
 * statut de commit + commentaire sur la PR.
 *
 * Secrets (Vercel) :
 *  - GITHUB_APP_ID
 *  - GITHUB_APP_PRIVATE_KEY  (PEM ; les \n littéraux sont convertis en sauts de ligne)
 *  - GITHUB_WEBHOOK_SECRET
 *  - GITHUB_APP_SLUG         (pour le lien d'installation, optionnel)
 */

export const githubAppConfigured = Boolean(
  process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY
);

const API = "https://api.github.com";
const UA = "SentinelByKayzen";

function privateKey(): string {
  return (process.env.GITHUB_APP_PRIVATE_KEY || "").replace(/\\n/g, "\n");
}

/** Vérifie la signature HMAC-SHA256 d'un webhook GitHub (en-tête X-Hub-Signature-256). */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

/** JWT RS256 signé avec la clé privée de l'app (valable 10 min). */
export function appJwt(): string {
  const appId = process.env.GITHUB_APP_ID;
  if (!appId) throw new Error("GITHUB_APP_ID manquant.");
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({ iat: now - 60, exp: now + 540, iss: appId }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  signer.end();
  const sig = signer.sign(privateKey()).toString("base64url");
  return `${header}.${payload}.${sig}`;
}

/** Échange le JWT d'app contre un jeton d'accès d'installation. */
export async function installationToken(installationId: number): Promise<string | null> {
  try {
    const r = await fetch(`${API}/app/installations/${installationId}/access_tokens`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${appJwt()}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        "user-agent": UA,
      },
    });
    if (!r.ok) return null;
    const data = (await r.json()) as { token?: string };
    return data.token ?? null;
  } catch {
    return null;
  }
}

async function ghPost(
  token: string,
  path: string,
  body: unknown
): Promise<boolean> {
  try {
    const r = await fetch(`${API}${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        "content-type": "application/json",
        "user-agent": UA,
      },
      body: JSON.stringify(body),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export type CommitState = "pending" | "success" | "failure" | "error";

/** Publie un statut de commit (check simple) sur un SHA. */
export async function postCommitStatus(
  installationId: number,
  owner: string,
  repo: string,
  sha: string,
  state: CommitState,
  description: string,
  targetUrl?: string
): Promise<boolean> {
  const token = await installationToken(installationId);
  if (!token) return false;
  return ghPost(token, `/repos/${owner}/${repo}/statuses/${sha}`, {
    state,
    description: description.slice(0, 140),
    context: "sentinel/pentest",
    target_url: targetUrl,
  });
}

/** Publie un commentaire sur une pull request. */
export async function postPrComment(
  installationId: number,
  owner: string,
  repo: string,
  prNumber: number,
  body: string
): Promise<boolean> {
  const token = await installationToken(installationId);
  if (!token) return false;
  return ghPost(token, `/repos/${owner}/${repo}/issues/${prNumber}/comments`, { body });
}

/** URL d'installation de l'app (page publique GitHub). */
export function appInstallUrl(): string | null {
  const slug = process.env.GITHUB_APP_SLUG;
  return slug ? `https://github.com/apps/${slug}/installations/new` : null;
}
