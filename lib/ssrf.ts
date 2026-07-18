import { lookup } from "node:dns/promises";
import net from "node:net";

export type UrlCheck =
  | { ok: true; url: URL }
  | { ok: false; reason: string };

function isPrivateIPv4(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true;
  const [a, b] = p;
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 0) return true;
  if (a === 169 && b === 254) return true; // link-local (métadonnées cloud 169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
  if (a === 192 && b === 168) return true; // 192.168/16
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast / reserved
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v === "::1" || v === "::") return true;
  if (v.startsWith("fc") || v.startsWith("fd")) return true; // ULA
  if (v.startsWith("fe80")) return true; // link-local
  if (v.startsWith("::ffff:")) return isPrivateIPv4(v.split(":").pop() || "");
  return false;
}

/**
 * Valide une URL cible : schéma http(s), hostname public uniquement.
 * Résout le DNS pour bloquer toute cible privée / interne (anti-SSRF).
 */
export async function validateTargetUrl(input: string): Promise<UrlCheck> {
  let url: URL;
  const raw = input.trim();
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return { ok: false, reason: "URL invalide." };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:")
    return { ok: false, reason: "Seuls les schémas http et https sont autorisés." };

  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  )
    return { ok: false, reason: "Les hôtes internes ne peuvent pas être scannés." };

  // Si l'hôte est déjà une IP littérale
  if (net.isIP(host)) {
    if (net.isIPv4(host) && isPrivateIPv4(host))
      return { ok: false, reason: "Adresse IP privée interdite." };
    if (net.isIPv6(host) && isPrivateIPv6(host))
      return { ok: false, reason: "Adresse IPv6 privée interdite." };
    return { ok: true, url };
  }

  // Résolution DNS → refuse si l'un des enregistrements pointe vers du privé
  try {
    const records = await lookup(host, { all: true });
    if (!records.length)
      return { ok: false, reason: "Le domaine ne résout aucune adresse." };
    for (const r of records) {
      if (r.family === 4 && isPrivateIPv4(r.address))
        return { ok: false, reason: "Le domaine résout vers une adresse privée." };
      if (r.family === 6 && isPrivateIPv6(r.address))
        return { ok: false, reason: "Le domaine résout vers une adresse privée." };
    }
  } catch {
    return { ok: false, reason: "Résolution DNS impossible pour ce domaine." };
  }

  return { ok: true, url };
}
