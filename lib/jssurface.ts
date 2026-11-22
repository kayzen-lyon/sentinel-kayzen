import { parse } from "node-html-parser";
import type { Finding, Severity } from "./scanner";
import { safeFetch } from "./ssrf";
import { maskSecret } from "./redact";
import type { AttackClass, SurfaceItem } from "./surface";

export type { AttackClass, SurfaceItem } from "./surface";

/**
 * Analyse du JavaScript client et carte de surface d'attaque — passive, réservée aux domaines
 * vérifiés (`deep`). Uniquement des GET sur la page d'accueil et ses bundles JS de MÊME origine
 * (aucune requête vers les endpoints découverts, aucun paramètre injecté) :
 *  - secrets exposés dans le code livré au navigateur (clés cloud, jetons, clés privées) ;
 *  - endpoints d'API, formulaires et paramètres extraits du HTML et des bundles ;
 *  - pour chacun, les classes d'attaque plausibles (heuristique déterministe sur le nom).
 *
 * Motifs de secrets et règles de classement adaptés du moteur de Claude-BugHunter
 * (Sachin Sharma, licence MIT — voir NOTICE). Aucune valeur de secret n'est stockée en clair :
 * seule une forme masquée (4 premiers caractères + « …[masqué] », lib/redact.ts) est conservée.
 */

const UA =
  "SentinelByKayzen/1.0 (+https://sentinel.kayzen-lyon.com; passive security posture scan)";

// --- 1. Secrets dans le code client ----------------------------------------------------------

type SecretPattern = { label: string; re: RegExp; severity: Severity; note?: string };

export const SECRET_PATTERNS: SecretPattern[] = [
  { label: "Clé d'accès AWS", re: /\bAKIA[0-9A-Z]{16}\b/g, severity: "critical" },
  { label: "Clé secrète Stripe (live)", re: /\bsk_live_[0-9A-Za-z]{24,}\b/g, severity: "critical" },
  { label: "Clé restreinte Stripe (live)", re: /\brk_live_[0-9A-Za-z]{24,}\b/g, severity: "high" },
  {
    label: "Clé privée",
    re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g,
    severity: "critical",
  },
  { label: "Jeton GitHub", re: /\bgh[pousr]_[0-9A-Za-z]{36,}\b/g, severity: "critical" },
  { label: "Jeton Slack", re: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/g, severity: "high" },
  {
    label: "Clé API OpenAI",
    re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}T3BlbkFJ[A-Za-z0-9_-]{20,}\b/g,
    severity: "high",
  },
  { label: "Clé API Anthropic", re: /\bsk-ant-[0-9A-Za-z-]{20,}\b/g, severity: "high" },
  {
    label: "Clé API Google",
    re: /\bAIza[0-9A-Za-z_-]{35}\b/g,
    severity: "low",
    note: "souvent publique par conception (Firebase, Maps) : vérifiez ses restrictions de domaine et d'API",
  },
  {
    label: "Jeton JWT",
    re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    severity: "medium",
    note: "peut être une clé publique « anon » (Supabase…) : vérifiez son rôle et son expiration",
  },
  {
    label: "Secret codé en dur",
    re: /(?:client[_-]?secret|api[_-]?secret|secret[_-]?key|access[_-]?token|auth[_-]?token)["']?\s*[:=]\s*["']([A-Za-z0-9_-]{16,})["']/gi,
    severity: "medium",
  },
];

/** Valeurs de documentation / gabarits à ignorer (anti-faux-positif). */
const SECRET_NOISE = /EXAMPLE|YOUR_|XXXX|\.\.\.|<[^>]+>|process\.env|import\.meta|placeholder|dummy|test_?key/i;

export type SecretHit = { type: string; severity: Severity; redacted: string; source: string; note?: string };

/** Même forme masquée que tous les rapports Sentinel (lib/redact.ts). */
const redact = maskSecret;

/** Secrets repérés dans un texte client. Les valeurs sont masquées, jamais stockées en clair. */
export function scanSecrets(text: string, source: string): SecretHit[] {
  const out: SecretHit[] = [];
  const seen = new Set<string>();
  if (!text) return out;
  for (const p of SECRET_PATTERNS) {
    p.re.lastIndex = 0;
    for (const m of text.matchAll(p.re)) {
      const tok = m[1] || m[0];
      const start = m.index ?? 0;
      const windowText = text.slice(Math.max(0, start - 16), start + m[0].length + 16);
      if (SECRET_NOISE.test(tok) || SECRET_NOISE.test(windowText)) continue;
      if (seen.has(tok)) continue;
      seen.add(tok);
      out.push({ type: p.label, severity: p.severity, redacted: redact(tok), source, note: p.note });
      if (out.length >= 30) return out;
    }
  }
  return out;
}

// --- 2. Carte de surface ---------------------------------------------------------------------

const PARAM_CLASS: [AttackClass, string[]][] = [
  ["open-redirect", ["url", "uri", "next", "redirect", "redirect_uri", "redirect_url", "return", "returnurl", "return_url", "returnto", "callback", "goto", "dest", "destination", "continue", "target"]],
  ["lfi", ["file", "path", "page", "template", "include", "doc", "document", "filename", "filepath", "load", "dir"]],
  ["ssrf", ["image", "imageurl", "image_url", "img", "fetch", "webhook", "proxy", "feed", "host", "endpoint", "src", "source"]],
  ["idor", ["id", "uid", "user", "userid", "user_id", "account", "accountid", "account_id", "order", "orderid", "order_id", "invoice", "docid", "pid", "oid", "customer", "customer_id"]],
  ["sqli", ["q", "query", "search", "keyword", "s", "term", "filter", "sort", "order_by", "orderby", "category"]],
];

/** Paramètres de suivi / cache sans valeur d'attaque. */
const PARAM_NOISE = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid",
  "msclkid", "mc_cid", "mc_eid", "trk", "v", "ver", "_", "ts", "cache", "cb", "rnd", "version",
  "lang", "locale", "hl", "_rsc", "dpl",
]);

const PATH_RULES: [string[], AttackClass][] = [
  [["/graphql", "/gql"], "graphql"],
  [["/chat", "/ai/", "/llm", "completion", "/assistant", "/agent", "/copilot", "/prompt"], "llm-ai"],
  [["/socket.io", "websocket", "/ws/", "/ws"], "websocket"],
  [["/forgot", "/reset-password", "/password-reset", "/recover", "/mot-de-passe"], "forgot-password"],
  [["/upload", "/import", "/attachment", "/avatar"], "file-upload"],
  [["redirect", "returnurl", "callback", "/go/", "/out"], "open-redirect"],
  [["/download", "/file", "/export"], "lfi"],
  [["/account", "/users", "/user/", "/profile", "/order", "/invoice", "/report", "/me"], "idor"],
  [["/search", "/query", "/recherche"], "sqli"],
  [["/login", "/signin", "/signup", "/register", "/auth", "/oauth", "/token", "/session", "/sso", "/saml"], "auth-bypass"],
  [["/proxy", "/fetch", "/webhook", "/preview", "/unfurl"], "ssrf"],
];

/** Classes d'attaque plausibles pour un point d'entrée (heuristique sur le nom, sans requête). */
export function classifyItem(path: string, param?: string): AttackClass[] {
  const p = (param || "").toLowerCase();
  const u = path.toLowerCase();
  const out: AttackClass[] = [];
  const add = (c: AttackClass) => {
    if (!out.includes(c)) out.push(c);
  };
  for (const [cls, names] of PARAM_CLASS) if (p && names.includes(p)) add(cls);
  for (const [keys, cls] of PATH_RULES) if (keys.some((k) => u.includes(k))) add(cls);
  if (out.includes("sqli")) add("xss");
  if (out.includes("open-redirect")) add("ssrf");
  if (/\/(api|rest)(\/|$)|\/v\d+\//.test(u)) {
    add("idor");
    add("auth-bypass");
  }
  if (/\/v\d+\//.test(u)) add("shadow-api");
  if (p) {
    add("xss");
    add("sqli");
  }
  if (!out.length) add("info-leak");
  return out.slice(0, 4);
}

const REL_API =
  /["'`](\/(?:api|rest|graphql|gql|v\d[\w.]*|auth|oauth|users?|account|admin|internal|webhooks?|upload|download|files?|proxy|fetch|search|query|chat|ai|llm|gateway|session|token|export|import|report|invoices?|orders?)(?=[/"'`])[A-Za-z0-9_./-]*)["'`]/g;
const NEXT_DATA = /\/_next\/data\/[A-Za-z0-9_.\-/]+/g;

/** Endpoints relatifs cités dans un texte (JS ou HTML). */
export function mineEndpoints(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(REL_API)) {
    const path = m[1].replace(/\/+$/, "") || "/";
    if (path.length > 2 && path.length < 160 && !/\.(?:png|jpe?g|svg|gif|webp|css|woff2?|ico|map)$/i.test(path))
      out.add(path);
  }
  for (const m of text.matchAll(NEXT_DATA)) {
    // L'identifiant de build change à chaque déploiement : on ne garde que la route.
    const route = m[0].replace(/^\/_next\/data\/[^/]+/, "/_next/data/…");
    out.add(route);
  }
  return [...out];
}

/** Formulaires et liens à paramètres de la page HTML (même origine uniquement). */
export function extractHtmlInputs(html: string, origin: string): SurfaceItem[] {
  const out: SurfaceItem[] = [];
  let root;
  try {
    root = parse(html);
  } catch {
    return out;
  }
  for (const form of root.querySelectorAll("form")) {
    let path = "/";
    try {
      const u = new URL(form.getAttribute("action") || "/", origin);
      if (u.origin !== origin) continue;
      path = u.pathname;
    } catch {
      continue;
    }
    const method = (form.getAttribute("method") || "GET").toUpperCase() === "POST" ? "POST" : "GET";
    const names = form
      .querySelectorAll("input,textarea,select")
      .filter((i) => !/^(hidden|submit|button)$/i.test(i.getAttribute("type") || ""))
      .map((i) => i.getAttribute("name") || "")
      .filter((n) => n && !PARAM_NOISE.has(n.toLowerCase()));
    if (!names.length) out.push({ path, method, source: "form", classes: classifyItem(path) });
    for (const name of names.slice(0, 8))
      out.push({ path, param: name, method, source: "form", classes: classifyItem(path, name) });
  }
  for (const a of root.querySelectorAll("a[href]")) {
    try {
      const u = new URL(a.getAttribute("href") || "", origin);
      if (u.origin !== origin) continue;
      for (const key of u.searchParams.keys()) {
        if (PARAM_NOISE.has(key.toLowerCase()) || key.toLowerCase().startsWith("utm_")) continue;
        out.push({ path: u.pathname, param: key, method: "GET", source: "lien", classes: classifyItem(u.pathname, key) });
      }
    } catch {
      /* lien invalide */
    }
  }
  return out;
}

/** Construit la carte de surface dédupliquée à partir du HTML et des bundles JS. */
export function buildSurface(html: string, scripts: string[], origin: string, max = 60): SurfaceItem[] {
  const items: SurfaceItem[] = [...extractHtmlInputs(html, origin)];
  const paths = new Set<string>();
  for (const text of [html, ...scripts]) for (const p of mineEndpoints(text)) paths.add(p);
  for (const path of paths) items.push({ path, source: "js", classes: classifyItem(path) });

  const seen = new Set<string>();
  const uniq: SurfaceItem[] = [];
  for (const it of items) {
    const key = `${it.method || ""} ${it.path} ${it.param || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(it);
  }
  // Priorité : points porteurs d'un paramètre et classes à fort impact d'abord.
  const weight = (it: SurfaceItem) =>
    (it.param ? 2 : 0) + (it.classes.some((c) => c !== "info-leak") ? 1 : 0);
  return uniq.sort((a, b) => weight(b) - weight(a)).slice(0, max);
}

// --- 3. Exécution (requêtes réelles) ---------------------------------------------------------

async function getText(url: string, timeoutMs: number, maxChars: number): Promise<string | null> {
  const r = await safeFetch(url, { headers: { "user-agent": UA }, timeoutMs });
  if (!r || !r.ok) return null;
  const t = await r.text().catch(() => null);
  return t === null ? null : t.slice(0, maxChars);
}

/** Exécute `fn` sur `items` avec une concurrence bornée. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker(): Promise<void> {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

const SEV_ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];

/** Secrets du JavaScript client + carte de surface (domaine vérifié). */
export async function jsSurfaceChecks(target: URL): Promise<Finding[]> {
  const origin = target.origin;
  const html = await getText(origin, 9000, 1_000_000);
  if (!html) return [];

  let srcs: string[] = [];
  try {
    srcs = parse(html)
      .querySelectorAll("script[src]")
      .map((s) => s.getAttribute("src") || "");
  } catch {
    srcs = [];
  }
  const bundles = [
    ...new Set(
      srcs
        .map((src) => {
          try {
            const u = new URL(src, origin);
            return u.origin === origin && /\.m?js$/i.test(u.pathname) ? u.toString() : "";
          } catch {
            return "";
          }
        })
        .filter(Boolean)
    ),
  ].slice(0, 12);

  const scripts = (await mapLimit(bundles, 4, (u) => getText(u, 8000, 2_000_000))).map((t) => t || "");

  const findings: Finding[] = [];

  // Secrets : HTML (scripts inline) + bundles
  const hits: SecretHit[] = [...scanSecrets(html, "/")];
  bundles.forEach((u, i) => hits.push(...scanSecrets(scripts[i], new URL(u).pathname)));
  const byType = new Map<string, SecretHit[]>();
  for (const h of hits) byType.set(h.type, [...(byType.get(h.type) || []), h]);
  for (const [type, list] of byType) {
    const sev = list[0].severity;
    const strong = sev === "critical" || sev === "high";
    findings.push({
      id: `js-secret-${type.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      category: "Divulgation",
      title: `${type} exposé(e) dans le JavaScript client`,
      severity: sev,
      state: strong || sev === "medium" ? "fail" : "warn",
      detail:
        `${list.length} occurrence(s) dans le code livré au navigateur : ` +
        list
          .slice(0, 4)
          .map((h) => `${h.redacted} (${h.source})`)
          .join(", ") +
        (list[0].note ? ` — ${list[0].note}.` : ".") +
        " Valeur masquée : Sentinel ne conserve jamais le secret en clair.",
      recommendation: strong
        ? "Révoquez et remplacez immédiatement ce secret, puis déplacez son usage côté serveur : tout ce qui est livré au navigateur est public."
        : "Vérifiez que cette valeur est bien destinée au public et restreignez-la (domaines autorisés, droits minimaux, expiration).",
    });
  }
  findings.sort((a, b) => SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity));
  if (!hits.length && bundles.length) {
    findings.push({
      id: "js-secrets",
      category: "Divulgation",
      title: "Aucun secret détecté dans le JavaScript client",
      severity: "info",
      state: "pass",
      detail: `${bundles.length} bundle(s) JavaScript analysé(s), aucun motif de secret connu.`,
    });
  }

  // Carte de surface
  const surface = buildSurface(html, scripts, origin);
  if (surface.length) {
    const withParam = surface.filter((s) => s.param).length;
    findings.push({
      id: "attack-surface",
      category: "Reconnaissance",
      title: `Carte de surface : ${surface.length} point(s) d'entrée cartographié(s)`,
      severity: "info",
      state: "info",
      detail:
        `${surface.length} endpoint(s) et formulaire(s) extraits du HTML et de ${bundles.length} bundle(s) JS, ` +
        `dont ${withParam} avec paramètre. Classes d'attaque indicatives (déduites des noms, non testées). ` +
        "Un pentest autonome lancé sur ce domaine ciblera ces points en priorité.",
      surface,
    });
  }

  return findings;
}
