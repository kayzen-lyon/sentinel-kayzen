/**
 * Audit de périmètre déterministe des preuves (PoC) remontées par le pentest autonome.
 *
 * Un pentest Sentinel n'est autorisé que sur un domaine dont la propriété est vérifiée. Cet audit
 * relit chaque finding et signale tout hôte cité dans sa preuve qui n'appartient PAS au domaine
 * vérifié : l'analyste doit alors revoir le finding avant de le transmettre (preuve contre un
 * tiers, hors autorisation). Module pur, sans réseau, utilisable côté client et serveur.
 *
 * Principe repris du « scope-audit » du moteur de Claude-BugHunter (Sachin Sharma, MIT — NOTICE).
 */

export type ScopeAudit = {
  /** Hôtes tiers cités dans la preuve : à revoir. */
  outOfScope: string[];
  /** Serveurs de rappel hors bande (tests aveugles) : légitimes mais tiers, signalés à part. */
  oob: string[];
};

/** Champs du finding Strix susceptibles de porter une preuve. */
const EVIDENCE_FIELDS = [
  "endpoint",
  "target",
  "poc_description",
  "poc_script_code",
  "technical_analysis",
  "description",
];

/** Hôtes de documentation / réservés (RFC 2606) : jamais une cible. */
const BENIGN = [
  /^localhost$/,
  /^127\.\d+\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /(^|\.)example\.(com|org|net)$/,
  /(^|\.)(test|invalid|localhost)$/,
  /(^|\.)owasp\.org$/,
  /(^|\.)mitre\.org$/,
  /(^|\.)nist\.gov$/,
  /(^|\.)first\.org$/,
  /(^|\.)portswigger\.net$/,
  /(^|\.)mozilla\.org$/,
  /(^|\.)w3\.org$/,
  /(^|\.)schema\.org$/,
];

/** Serveurs de collaboration hors bande usuels. */
const OOB = [
  /(^|\.)oast\.(fun|pro|live|site|online|me)$/,
  /(^|\.)interact\.sh$/,
  /(^|\.)interactsh\.com$/,
  /(^|\.)burpcollaborator\.net$/,
  /(^|\.)oastify\.com$/,
];

const URL_HOST = /\b(?:https?|wss?):\/\/([A-Za-z0-9.-]+\.[A-Za-z]{2,}|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g;
const HOST_HEADER = /\bHost:\s*([A-Za-z0-9.-]+\.[A-Za-z]{2,})/gi;

function apex(host: string): string {
  return host.split(".").slice(-2).join(".");
}

/** Hôtes cités dans un texte (URL et en-têtes Host). */
export function hostsIn(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(URL_HOST)) out.add(m[1].toLowerCase().replace(/\.$/, ""));
  for (const m of text.matchAll(HOST_HEADER)) out.add(m[1].toLowerCase().replace(/\.$/, ""));
  return [...out];
}

/** Audit d'un finding : hôtes hors du domaine vérifié de la cible. */
export function auditScope(payload: unknown, targetUrl: string): ScopeAudit {
  const res: ScopeAudit = { outOfScope: [], oob: [] };
  let targetHost = "";
  try {
    targetHost = new URL(targetUrl).hostname.toLowerCase();
  } catch {
    return res;
  }
  if (!payload || typeof payload !== "object") return res;
  const p = payload as Record<string, unknown>;
  const text = EVIDENCE_FIELDS.map((k) => (typeof p[k] === "string" ? (p[k] as string) : "")).join("\n");
  const allowedApex = apex(targetHost);
  for (const h of hostsIn(text)) {
    if (h === targetHost || h.endsWith(`.${allowedApex}`) || h === allowedApex) continue;
    if (BENIGN.some((re) => re.test(h))) continue;
    if (OOB.some((re) => re.test(h))) {
      res.oob.push(h);
      continue;
    }
    res.outOfScope.push(h);
  }
  return res;
}
