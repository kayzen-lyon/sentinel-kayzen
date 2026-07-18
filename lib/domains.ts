import crypto from "node:crypto";
import { resolveTxt } from "node:dns/promises";
import { ensureSchema, query } from "./db";

export type DomainRow = {
  id: string;
  domain: string;
  token: string;
  method: string | null;
  verified_at: string | null;
  created_at: string;
};

/** Normalise en domaine enregistrable simplifié (deux derniers labels). */
export function normalizeDomain(input: string): string | null {
  let host = input.trim().toLowerCase();
  try {
    if (/^https?:\/\//.test(host)) host = new URL(host).hostname;
  } catch {
    /* ignore */
  }
  host = host.replace(/^www\./, "").replace(/\/.*$/, "").replace(/:\d+$/, "");
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)) return null;
  return host;
}

/** Domaine enregistrable (2 labels) pour la comparaison. */
export function registrableDomain(host: string): string {
  return host.replace(/^www\./, "").split(".").slice(-2).join(".");
}

export async function listDomains(userId: string): Promise<DomainRow[]> {
  await ensureSchema();
  return query<DomainRow>(
    `SELECT id, domain, token, method, verified_at, created_at
       FROM verified_domains WHERE user_id=$1 ORDER BY created_at DESC`,
    [userId]
  );
}

export async function requestVerification(
  userId: string,
  domainInput: string
): Promise<{ domain: string; token: string }> {
  const domain = normalizeDomain(domainInput);
  if (!domain) throw new Error("Domaine invalide.");
  await ensureSchema();
  const token = "sentinel-verify=" + crypto.randomBytes(16).toString("hex");
  await query(
    `INSERT INTO verified_domains (user_id, domain, token)
       VALUES ($1, $2, $3)
     ON CONFLICT (user_id, domain)
       DO UPDATE SET token = EXCLUDED.token, verified_at = NULL, method = NULL`,
    [userId, domain, token]
  );
  return { domain, token };
}

export async function verifyDomain(
  userId: string,
  domainInput: string
): Promise<{ verified: boolean; method?: string; reason?: string }> {
  const domain = normalizeDomain(domainInput);
  if (!domain) return { verified: false, reason: "Domaine invalide." };
  await ensureSchema();
  const rows = await query<DomainRow>(
    `SELECT token FROM verified_domains WHERE user_id=$1 AND domain=$2`,
    [userId, domain]
  );
  if (!rows.length)
    return { verified: false, reason: "Demandez d'abord un jeton de vérification." };
  const token = rows[0].token;

  // Méthode 1 : enregistrement DNS TXT sur _sentinel-verify.<domaine>
  try {
    const txt = await resolveTxt(`_sentinel-verify.${domain}`);
    if (txt.some((r) => r.join("").includes(token))) {
      await markVerified(userId, domain, "dns");
      return { verified: true, method: "dns" };
    }
  } catch {
    /* pas d'enregistrement, on tente le fichier */
  }

  // Méthode 2 : fichier /.well-known/sentinel-verify.txt
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(`https://${domain}/.well-known/sentinel-verify.txt`, {
      signal: ctrl.signal,
      headers: { "user-agent": "SentinelByKayzen/1.0 (domain verification)" },
    }).finally(() => clearTimeout(t));
    if (r.ok) {
      const body = await r.text();
      if (body.includes(token)) {
        await markVerified(userId, domain, "file");
        return { verified: true, method: "file" };
      }
    }
  } catch {
    /* ignore */
  }

  return {
    verified: false,
    reason:
      "Jeton introuvable. Vérifiez l'enregistrement DNS TXT ou le fichier, puis réessayez (la propagation DNS peut prendre quelques minutes).",
  };
}

async function markVerified(userId: string, domain: string, method: string) {
  await query(
    `UPDATE verified_domains SET verified_at=now(), method=$3 WHERE user_id=$1 AND domain=$2`,
    [userId, domain, method]
  );
}

/** Le domaine enregistrable de `host` est-il vérifié par cet utilisateur ? */
export async function isHostVerified(userId: string, host: string): Promise<boolean> {
  await ensureSchema();
  const reg = registrableDomain(host);
  const rows = await query<{ n: string }>(
    `SELECT count(*)::int AS n FROM verified_domains
       WHERE user_id=$1 AND domain=$2 AND verified_at IS NOT NULL`,
    [userId, reg]
  );
  return Number(rows[0]?.n ?? 0) > 0;
}
