import type { Finding, Severity } from "../scanner";
import type { CategoryKey } from "./types";

/**
 * Notation et recommandations enrichies (module pur). Items 61 à 70 de
 * docs/AMELIORATIONS-SCAN-DASHBOARD.md : sous-scores, plafonnement, effort, gains rapides,
 * extraits de configuration, références OWASP/CWE, explications, résumé, priorité.
 */

export type Effort = "rapide" | "moyen" | "important";

const WEIGHT: Record<Severity, number> = { critical: 25, high: 15, medium: 8, low: 3, info: 0 };
const SEV_RANK: Record<Severity, number> = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };

/** Catégorie de sous-score d'un finding. */
export function categoryOf(f: Pick<Finding, "category" | "id">): CategoryKey {
  const c = f.category;
  if (c === "Transport" || c === "TLS") return "transport";
  if (c === "En-têtes" || c === "Cookies") return "headers";
  if (c === "E-mail" || c === "DNS") return "dns";
  if (c === "Contenu") return "content";
  if (c === "Confidentialité") return "privacy";
  return "exposure";
}

const isProblem = (f: Finding) => f.state === "fail" || f.state === "warn";

export function categoryScores(findings: Finding[]): Partial<Record<CategoryKey, number>> {
  const out: Partial<Record<CategoryKey, number>> = {};
  const seen = new Set<CategoryKey>();
  for (const f of findings) {
    const k = categoryOf(f);
    seen.add(k);
    if (!isProblem(f)) continue;
    const w = f.state === "fail" ? WEIGHT[f.severity] : Math.round(WEIGHT[f.severity] / 2);
    out[k] = (out[k] ?? 100) - w;
  }
  for (const k of seen) out[k] = Math.max(0, Math.min(100, out[k] ?? 100));
  return out;
}

/** Note plafonnée : une faille critique interdit B ou mieux, une élevée interdit A. */
export function capGrade(grade: string, findings: Finding[]): string {
  const order = ["A", "B", "C", "D", "E", "F"];
  const fails = findings.filter((f) => f.state === "fail");
  let cap = "A";
  if (fails.some((f) => f.severity === "high")) cap = "B";
  if (fails.some((f) => f.severity === "critical")) cap = "D";
  return order.indexOf(grade) < order.indexOf(cap) ? cap : grade;
}

const RAPIDE = /^(xcto|xfo|refpol|permpol|hsts|hsts-preload|coop|corp|coep|reporting|spf|dmarc|dmarc-rua|caa|dnssec|domain-lock|domain-expiry|http-redirect|exposed|dir-listing|robots-sensitive|wp-xmlrpc|wp-users|http-trace|securitytxt|server|cache|cookies|cookie|tabnabbing|html-comments|form-http|redirect|www-apex|sourcemap|emails-exposed)/;
const IMPORTANT = /^(js-secret|takeover|tls-weak-key|tls-weak-signature|cve-|trackers-preconsent|https$)/;

export function effortOf(id: string): Effort {
  if (IMPORTANT.test(id)) return "important";
  if (RAPIDE.test(id)) return "rapide";
  return "moyen";
}

const REFS: [RegExp, { owasp?: string; cwe?: string }][] = [
  [/^(csp|xfo|xcto|refpol|permpol|coop|corp|coep|cors|cache|reporting|http-methods|http-trace)/, { owasp: "A05:2021 Mauvaise configuration de sécurité", cwe: "CWE-693" }],
  [/^cookie/, { owasp: "A05:2021 Mauvaise configuration de sécurité", cwe: "CWE-614 / CWE-1004" }],
  [/^(https|hsts|http-redirect|redirect|tls)/, { owasp: "A02:2021 Défaillances cryptographiques", cwe: "CWE-319 / CWE-326" }],
  [/^(exposed|dir-listing|sourcemap|error-disclosure|html-comments|server|robots)/, { owasp: "A05:2021 Mauvaise configuration de sécurité", cwe: "CWE-538 / CWE-200" }],
  [/^js-secret/, { owasp: "A07:2021 Défaillances d'identification", cwe: "CWE-798" }],
  [/^(lib-|cve-)/, { owasp: "A06:2021 Composants vulnérables et obsolètes", cwe: "CWE-1104" }],
  [/^(spf|dmarc|dkim|mta-sts)/, { cwe: "CWE-290 (usurpation)" }],
  [/^takeover/, { owasp: "A05:2021 Mauvaise configuration de sécurité", cwe: "CWE-350" }],
  [/^(wp-|graphql|api-spec)/, { owasp: "A01:2021 Contrôle d'accès défaillant", cwe: "CWE-200" }],
  [/^(sri-missing|trackers)/, { owasp: "A08:2021 Intégrité des logiciels et des données", cwe: "CWE-829" }],
  [/^form-http/, { owasp: "A02:2021 Défaillances cryptographiques", cwe: "CWE-319" }],
];

/**
 * Rattachement au guide de test OWASP WSTG (identifiants de la version 4.2 uniquement ;
 * le texte du guide, sous CC BY-SA 4.0, n'est pas reproduit).
 */
const WSTG: [RegExp, string][] = [
  [/^(hsts)/, "WSTG-CONF-07"],
  [/^(https|http-redirect|redirect|form-http|mixed-content)/, "WSTG-CRYP-03"],
  [/^tls/, "WSTG-CRYP-01"],
  [/^cookie/, "WSTG-SESS-02"],
  [/^recon-form-csrf/, "WSTG-SESS-05"],
  [/^(cors)/, "WSTG-CLNT-07"],
  [/^xfo/, "WSTG-CLNT-09"],
  [/^(sri-missing|lib-)/, "WSTG-CLNT-13"],
  [/^(csp|xcto|refpol|permpol|coop|corp|coep|cache)/, "WSTG-CONF-02"],
  [/^(http-trace|http-methods)/, "WSTG-CONF-06"],
  [/^(exposed|dir-listing|sourcemap)/, "WSTG-CONF-04"],
  [/^recon-admin/, "WSTG-CONF-05"],
  [/^takeover/, "WSTG-CONF-10"],
  [/^(server|tech|cve-)/, "WSTG-INFO-02"],
  [/^(robots)/, "WSTG-INFO-03"],
  [/^recon-subdomains/, "WSTG-INFO-04"],
  [/^(html-comments|emails-exposed|js-secret)/, "WSTG-INFO-05"],
  [/^(wp-|graphql|api-spec|attack-surface)/, "WSTG-INFO-06"],
  [/^waf/, "WSTG-INFO-10"],
  [/^error-disclosure/, "WSTG-ERRH-01"],
];

export function wstgFor(id: string): string | undefined {
  return WSTG.find(([re]) => re.test(id))?.[1];
}

const WHY: Record<CategoryKey, string> = {
  transport: "Le chiffrement protège ce qui circule entre vos visiteurs et le serveur : mots de passe, sessions, données personnelles.",
  headers: "Ces en-têtes indiquent au navigateur les protections à appliquer ; sans eux, une seule faille XSS ou un iframe piégé suffit.",
  dns: "Le DNS et l'e-mail sont la porte d'entrée de l'hameçonnage : un domaine mal protégé permet d'envoyer des e-mails crédibles en votre nom.",
  exposure: "Tout fichier ou service exposé par erreur donne à un attaquant des informations ou un accès direct.",
  content: "Le code et les ressources tierces s'exécutent avec les mêmes droits que votre site : une dépendance compromise vous compromet.",
  privacy: "Le RGPD et les règles de la CNIL encadrent ce qui est collecté sur vos visiteurs ; les manquements exposent à des sanctions.",
};

/** En-têtes dont on fournit un extrait prêt à copier, par serveur. */
const HEADER_SNIPPETS: Record<string, [string, string]> = {
  hsts: ["Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload"],
  xcto: ["X-Content-Type-Options", "nosniff"],
  xfo: ["X-Frame-Options", "DENY"],
  refpol: ["Referrer-Policy", "strict-origin-when-cross-origin"],
  permpol: ["Permissions-Policy", "camera=(), microphone=(), geolocation=()"],
  coop: ["Cross-Origin-Opener-Policy", "same-origin"],
  corp: ["Cross-Origin-Resource-Policy", "same-origin"],
  coep: ["Cross-Origin-Embedder-Policy", "require-corp"],
  csp: ["Content-Security-Policy", "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'"],
};

export function snippetsFor(id: string): { label: string; code: string }[] | undefined {
  const h = HEADER_SNIPPETS[id];
  if (!h) return undefined;
  const [name, value] = h;
  return [
    { label: "nginx", code: `add_header ${name} "${value}" always;` },
    { label: "Apache", code: `Header always set ${name} "${value}"` },
    { label: "Vercel (vercel.json)", code: `{ "headers": [{ "source": "/(.*)", "headers": [{ "key": "${name}", "value": "${value}" }] }] }` },
    { label: "Next.js (next.config)", code: `async headers() { return [{ source: "/(.*)", headers: [{ key: "${name}", value: "${value}" }] }]; }` },
  ];
}

/**
 * Commande de reproduction à lancer soi-même (lecture seule) pour vérifier un constat.
 * Idée reprise de REAP (hackwither/reap, MIT) : chaque constat est vérifiable hors de Sentinel.
 */
export function reproFor(id: string, url: string): string | undefined {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return undefined;
  }
  const host = u.hostname;
  const apex = host.split(".").slice(-2).join(".");
  const origin = u.origin;
  if (/^(hsts|xcto|xfo|refpol|permpol|coop|corp|coep|csp|reporting|cache|server|cookie)/.test(id)) return `curl -sI ${url}`;
  if (id === "cors-reflection") return `curl -sI -H "Origin: https://exemple-attaquant.test" ${url} | grep -i access-control`;
  if (id === "http-redirect" || id.startsWith("redirect")) return `curl -sIL http://${host}/`;
  if (id.startsWith("exposed/")) return `curl -s ${origin}${id.slice(7)} | head -20`;
  if (id === "spf" || id === "spf-lookups") return `dig +short TXT ${apex}`;
  if (id.startsWith("dmarc")) return `dig +short TXT _dmarc.${apex}`;
  if (id === "mta-sts") return `dig +short TXT _mta-sts.${apex}`;
  if (id === "caa") return `dig +short CAA ${apex}`;
  if (id === "dnssec") return `dig +dnssec ${apex} | grep -E "flags|RRSIG"`;
  if (id.startsWith("tls")) return `openssl s_client -connect ${host}:443 -servername ${host} </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -dates`;
  if (id === "tls-legacy") return `openssl s_client -connect ${host}:443 -tls1_1 </dev/null`;
  if (id === "http-trace" || id === "http-methods") return `curl -si -X OPTIONS ${origin}/ | grep -i allow`;
  if (id === "wp-users") return `curl -s ${origin}/wp-json/wp/v2/users`;
  if (id === "wp-xmlrpc") return `curl -s ${origin}/xmlrpc.php`;
  if (id === "dir-listing") return `curl -s ${origin}/uploads/ | grep -i "index of"`;
  return undefined;
}

/** Enrichit chaque finding : effort, priorité, explication, références, extraits, reproduction. */
export function enrichFindings(findings: Finding[], url?: string): void {
  for (const f of findings) {
    if (!isProblem(f)) continue;
    if (url) f.repro ??= reproFor(f.id, url);
    f.effort ??= effortOf(f.id);
    const eff = f.effort === "rapide" ? 3 : f.effort === "moyen" ? 2 : 1;
    f.priority = SEV_RANK[f.severity] * 10 + eff * (f.state === "fail" ? 2 : 1);
    f.why ??= WHY[categoryOf(f)];
    const ref = REFS.find(([re]) => re.test(f.id))?.[1];
    if (ref) {
      f.owasp ??= ref.owasp;
      f.cwe ??= ref.cwe;
    }
    f.snippets ??= snippetsFor(f.id);
    f.wstg ??= wstgFor(f.id);
  }
}

/** Gains rapides : problèmes sérieux corrigeables vite, triés par priorité. */
export function quickWins(findings: Finding[], max = 6): string[] {
  return findings
    .filter((f) => isProblem(f) && f.effort === "rapide" && f.severity !== "info")
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    .slice(0, max)
    .map((f) => f.title);
}

/** Résumé exécutif en trois phrases. */
export function executiveSummary(grade: string, score: number, findings: Finding[], scores: Partial<Record<CategoryKey, number>>): string {
  const probs = findings.filter(isProblem);
  const crit = probs.filter((f) => f.severity === "critical").length;
  const high = probs.filter((f) => f.severity === "high").length;
  const labels: Record<CategoryKey, string> = {
    transport: "le chiffrement", headers: "les en-têtes de sécurité", dns: "le DNS et l'e-mail",
    exposure: "l'exposition", content: "le contenu et les tiers", privacy: "la confidentialité",
  };
  const entries = Object.entries(scores) as [CategoryKey, number][];
  const best = entries.filter(([, v]) => v >= 90).map(([k]) => labels[k]);
  const worst = entries.sort((a, b) => a[1] - b[1])[0];
  const s1 = `Note ${grade} (${score}/100) : ${probs.length} point(s) à traiter${crit + high ? `, dont ${crit ? `${crit} critique(s)` : ""}${crit && high ? " et " : ""}${high ? `${high} élevé(s)` : ""}` : ""}.`;
  const s2 = best.length ? `Points forts : ${best.slice(0, 3).join(", ")}.` : "Aucune catégorie n'atteint encore 90/100.";
  const s3 = worst && worst[1] < 90 ? `Priorité : ${labels[worst[0]]} (${worst[1]}/100).` : "Continuez à surveiller la cible pour détecter les régressions.";
  return `${s1} ${s2} ${s3}`;
}
