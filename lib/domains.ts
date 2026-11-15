import crypto from "node:crypto";
import { resolveTxt } from "node:dns/promises";
import { ensureSchema, query } from "./db";
import { safeFetch } from "./ssrf";

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

/**
 * Domaines dont la vérification peut couvrir `host` : l'hôte lui-même puis
 * chacun de ses parents (au moins 2 labels). Ex. a.b.example.co.uk →
 * [a.b.example.co.uk, b.example.co.uk, example.co.uk, co.uk].
 * Un suffixe public (co.uk, gouv.fr…) peut apparaître dans la liste mais ne
 * peut jamais être vérifié : personne ne contrôle _sentinel-verify.co.uk.
 */
export function domainCandidates(host: string): string[] {
  const labels = host.trim().toLowerCase().replace(/\.$/, "").replace(/^www\./, "").split(".");
  const out: string[] = [];
  for (let i = 0; i <= labels.length - 2; i++) out.push(labels.slice(i).join("."));
  return out;
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
    // safeFetch : chaque redirection est re-validée (pas de rebond vers une IP interne).
    const r = await safeFetch(`https://${domain}/.well-known/sentinel-verify.txt`, {
      headers: { "user-agent": "SentinelByKayzen/1.0 (domain verification)" },
      timeoutMs: 8000,
    });
    if (r?.ok) {
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

/**
 * `host` est-il vérifié par cet utilisateur ?
 * - l'hôte exact vérifié (DNS ou fichier) → oui ;
 * - un domaine parent vérifié → oui seulement par DNS : contrôler la zone DNS
 *   prouve le contrôle des sous-domaines, un fichier sur le parent non.
 */
export async function isHostVerified(userId: string, host: string): Promise<boolean> {
  const [exact, ...parents] = domainCandidates(host);
  if (!exact) return false;
  await ensureSchema();
  const rows = await query<{ n: string }>(
    `SELECT count(*)::int AS n FROM verified_domains
       WHERE user_id=$1 AND verified_at IS NOT NULL
         AND (domain=$2 OR (domain = ANY($3::text[]) AND method='dns'))`,
    [userId, exact, parents]
  );
  return Number(rows[0]?.n ?? 0) > 0;
}
