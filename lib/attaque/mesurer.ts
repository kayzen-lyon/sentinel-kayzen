import net from "node:net";
import { adressesPubliques, safeFetch } from "../ssrf";
import { analyzeTls } from "../insights/tls";
import { analyzeDns } from "../insights/dns";
import { enumerateSubdomains } from "../recon";
import { buildSurface } from "../jssurface";
import { PORTS_CONTROLES, type Instantane } from "./comparer";

/**
 * Mesures d'un passage de surveillance. Appelé UNIQUEMENT après vérification de l'autorisation
 * écrite du client couvrant l'hôte (lib/attaque/surveillance.ts). Adresses publiques seulement :
 * l'hôte est résolu une fois, et les connexions TCP visent ces adresses (pas de rebinding DNS).
 * Chaque mesure qui échoue vaut null, jamais une valeur supposée.
 */

const avant = <T>(p: Promise<T>, ms: number): Promise<T | null> =>
  Promise.race([p.catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), ms))]);

/** Connexion TCP simple (ouverte / fermée), sans rien envoyer. */
function portOuvert(ip: string, port: number, ms = 2500): Promise<boolean> {
  return new Promise((resolve) => {
    const s = net.connect({ host: ip, port });
    const fin = (ok: boolean) => {
      s.destroy();
      resolve(ok);
    };
    s.setTimeout(ms, () => fin(false));
    s.once("connect", () => fin(true));
    s.once("error", () => fin(false));
  });
}

async function ports(ip: string): Promise<number[]> {
  const res = await Promise.all(PORTS_CONTROLES.map(async (p) => ((await portOuvert(ip, p)) ? p : null)));
  return res.filter((p): p is number => p !== null);
}

const ENTETES = [
  "strict-transport-security",
  "content-security-policy",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
];

export async function mesurer(hote: string): Promise<Instantane> {
  const date = new Date().toISOString();
  const ips = await adressesPubliques(hote);
  if (!ips) {
    // Adresse privée, réservée ou introuvable : aucune mesure active (protection SSRF).
    return { hote, date, ports: null, tls: null, domaineExpire: undefined, sousDomaines: null, routes: null, entetes: null };
  }
  const apex = hote.split(".").slice(-2).join(".");
  const page = await avant(safeFetch(`https://${hote}/`, { timeoutMs: 10000 }), 12000);
  const html = page && page.ok ? await avant(page.text(), 5000) : null;

  const [p, t, d, subs] = await Promise.all([
    avant(ports(ips[0]), 15000),
    avant(analyzeTls(hote, page?.headers.get("strict-transport-security") || ""), 15000),
    avant(analyzeDns(hote, apex), 15000),
    avant(enumerateSubdomains(apex), 25000),
  ]);

  const entetes: Record<string, string> | null = page
    ? Object.fromEntries(ENTETES.map((n) => [n, page.headers.get(n)]).filter((e): e is [string, string] => Boolean(e[1])))
    : null;
  const routes = html
    ? [...new Set(buildSurface(html, [], `https://${hote}`, 120).map((i) => i.path))].sort()
    : null;

  return {
    hote,
    date,
    ports: p,
    tls: t
      ? {
          protocoles: Object.entries(t.insights.protocols)
            .filter(([, ok]) => ok)
            .map(([v]) => v),
          certExpire: t.insights.cert?.validTo ? new Date(t.insights.cert.validTo).toISOString() : null,
          emetteur: t.insights.cert?.issuer ?? null,
        }
      : null,
    domaineExpire: d ? (d.domain?.expires ?? null) : undefined,
    sousDomaines: subs ? [...new Set(subs)].sort() : null,
    routes,
    entetes,
  };
}
