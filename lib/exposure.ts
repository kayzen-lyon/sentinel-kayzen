import { parse } from "node-html-parser";
import type { Finding, Severity } from "./scanner";
import { safeFetch } from "./ssrf";

/**
 * Analyse de surface d'exposition — passive et non destructive, réservée aux domaines vérifiés
 * (`deep`). Uniquement des requêtes GET sur l'origine DÉJÀ validée anti-SSRF par l'appelant :
 *  - fichiers/métadonnées sensibles exposés (VCS, sauvegardes, dumps de config, phpinfo) ;
 *  - endpoints d'administration de framework laissés ouverts (Spring Boot Actuator) ;
 *  - spécifications d'API publiées (Swagger/OpenAPI) et endpoint GraphQL détectable ;
 *  - source maps JavaScript exposées (fuite de code source côté client).
 *
 * Checklist dérivée des méthodologies reverse-skill (api-security, code-audit, js-reverse,
 * supply-chain-security) et de cas réels du field-journal (fuite Spring Boot Actuator).
 * Chaque probe est validée sur le contenu réel pour limiter les faux positifs.
 */

const UA =
  "SentinelByKayzen/1.0 (+https://sentinel.kayzen-lyon.com; passive security posture scan)";

async function fetchWithTimeout(
  url: string,
  opts: RequestInit & { timeoutMs?: number } = {}
): Promise<Response | null> {
  // Suivi de redirections durci anti-SSRF (cf. lib/ssrf.ts).
  return safeFetch(url, {
    timeoutMs: 7000,
    ...opts,
    headers: { "user-agent": UA, ...(opts.headers || {}) },
  });
}

/** Exécute `fn` sur `items` avec une concurrence bornée. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
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

// --- 1. Fichiers / endpoints sensibles (probes texte validées sur le contenu) --------------

type TextProbe = {
  path: string;
  label: string;
  category: string;
  severity: Severity;
  /** Valide que le corps ressemble bien à la ressource attendue (anti-faux-positif). */
  valid: (body: string) => boolean;
  recommendation: string;
};

export const TEXT_PROBES: TextProbe[] = [
  {
    path: "/.git/HEAD",
    label: "Dépôt Git exposé (.git/HEAD)",
    category: "Exposition",
    severity: "high",
    valid: (b) => /^ref:\s+refs\//m.test(b) || /^[0-9a-f]{40}\b/m.test(b),
    recommendation:
      "Bloquez l'accès public au répertoire /.git au niveau du serveur web ; ne déployez jamais le dossier de contrôle de version.",
  },
  {
    path: "/.svn/entries",
    label: "Métadonnées Subversion exposées (.svn)",
    category: "Exposition",
    severity: "medium",
    valid: (b) => /svn:|dir\b/i.test(b) && !/<html/i.test(b),
    recommendation: "Bloquez l'accès public au répertoire /.svn.",
  },
  {
    path: "/.env.local",
    label: "Fichier .env.local exposé",
    category: "Exposition",
    severity: "critical",
    valid: (b) => /^[A-Z0-9_]+=/m.test(b) && !/<html/i.test(b),
    recommendation:
      "Retirez le fichier d'environnement du répertoire servi et faites tourner tout secret exposé.",
  },
  {
    path: "/.env.production",
    label: "Fichier .env.production exposé",
    category: "Exposition",
    severity: "critical",
    valid: (b) => /^[A-Z0-9_]+=/m.test(b) && !/<html/i.test(b),
    recommendation:
      "Retirez le fichier d'environnement du répertoire servi et faites tourner tout secret exposé.",
  },
  {
    path: "/phpinfo.php",
    label: "phpinfo() exposé",
    category: "Divulgation",
    severity: "medium",
    valid: (b) => /phpinfo\(\)|PHP Version|php_uname/i.test(b),
    recommendation:
      "Supprimez les pages phpinfo() de production : elles divulguent chemins, modules et configuration.",
  },
  {
    path: "/actuator",
    label: "Spring Boot Actuator exposé (index)",
    category: "Exposition",
    severity: "medium",
    valid: (b) => /"_links"|"self"\s*:|"health"\s*:/i.test(b) && b.trim().startsWith("{"),
    recommendation:
      "Restreignez les endpoints Actuator (management.endpoints.web.exposure) et exigez une authentification.",
  },
  {
    path: "/actuator/health",
    label: "Spring Boot Actuator /health exposé",
    category: "Divulgation",
    severity: "low",
    valid: (b) => /"status"\s*:\s*"(UP|DOWN|OUT_OF_SERVICE|UNKNOWN)"/i.test(b),
    recommendation:
      "Limitez /actuator/health aux détails minimaux (management.endpoint.health.show-details=never).",
  },
  {
    path: "/actuator/env",
    label: "Spring Boot Actuator /env exposé (secrets)",
    category: "Exposition",
    severity: "critical",
    valid: (b) => /"activeProfiles"|"propertySources"/i.test(b),
    recommendation:
      "Désactivez ou authentifiez /actuator/env : il expose variables d'environnement et secrets applicatifs.",
  },
];

async function textProbes(origin: string): Promise<Finding[]> {
  const out: Finding[] = [];
  await mapLimit(TEXT_PROBES, 4, async (p) => {
    const r = await fetchWithTimeout(`${origin}${p.path}`, { redirect: "follow" });
    if (!r || r.status !== 200) return;
    const body = (await r.text().catch(() => "")).slice(0, 8192);
    if (!body || !p.valid(body)) return;
    out.push({
      id: `exposed-${p.path.replace(/[^a-z0-9]+/gi, "-")}`,
      category: p.category,
      title: `${p.label}`,
      severity: p.severity,
      state: "fail",
      detail: `${p.path} renvoie un contenu sensible (HTTP 200, contenu confirmé).`,
      recommendation: p.recommendation,
    });
  });
  return out;
}

// --- 2. Sauvegardes / archives exposées (en-têtes seulement, corps non téléchargé) ---------

export const ARCHIVE_PROBES: { path: string; label: string }[] = [
  { path: "/backup.zip", label: "backup.zip" },
  { path: "/backup.sql", label: "backup.sql" },
  { path: "/database.sql", label: "database.sql" },
  { path: "/dump.sql", label: "dump.sql" },
  { path: "/.env.bak", label: ".env.bak" },
  { path: "/wp-config.php.bak", label: "wp-config.php.bak" },
];

async function archiveProbes(origin: string): Promise<Finding[]> {
  const hits: string[] = [];
  await mapLimit(ARCHIVE_PROBES, 4, async (p) => {
    const r = await fetchWithTimeout(`${origin}${p.path}`, { redirect: "manual" });
    if (!r || r.status !== 200) return;
    const ct = (r.headers.get("content-type") || "").toLowerCase();
    const len = Number(r.headers.get("content-length") || "0");
    // On ne consomme jamais le corps (archives potentiellement volumineuses).
    r.body?.cancel().catch(() => {});
    // Signature d'un vrai fichier téléchargeable : type non-HTML + taille non triviale.
    const archived =
      /zip|octet-stream|sql|x-sql|gzip|x-tar|download/.test(ct) || (len > 512 && !/text\/html/.test(ct));
    if (archived) hits.push(`${p.label}${len ? ` (${len} o)` : ""}`);
  });
  if (!hits.length) return [];
  return [
    {
      id: "exposed-backups",
      category: "Exposition",
      title: `${hits.length} sauvegarde(s)/archive(s) potentiellement exposée(s)`,
      severity: "high",
      state: "fail",
      detail:
        "Fichiers de sauvegarde téléchargeables détectés : " +
        hits.join(", ") +
        " (contenu non téléchargé par le scanner).",
      recommendation:
        "Supprimez les sauvegardes du répertoire servi et bloquez l'accès public aux archives (.zip/.sql/.bak).",
    },
  ];
}

// --- 3. Spécifications d'API & endpoint GraphQL (détection passive) ------------------------

async function apiSurface(origin: string): Promise<Finding[]> {
  const out: Finding[] = [];

  // 3a. Spécification OpenAPI/Swagger publiée
  const specPaths = ["/swagger.json", "/openapi.json", "/v2/api-docs", "/v3/api-docs"];
  const specHit = await mapLimit(specPaths, 4, async (path) => {
    const r = await fetchWithTimeout(`${origin}${path}`, { redirect: "follow" });
    if (!r || r.status !== 200) return null;
    const body = (await r.text().catch(() => "")).slice(0, 4096);
    if (/"swagger"\s*:|"openapi"\s*:/i.test(body)) return path;
    return null;
  });
  const spec = specHit.find(Boolean);
  if (spec) {
    out.push({
      id: "api-spec",
      category: "Reconnaissance",
      title: "Spécification d'API exposée (OpenAPI/Swagger)",
      severity: "low",
      state: "warn",
      detail: `Une spécification d'API complète est publique (${spec}) : elle cartographie tous les endpoints.`,
      recommendation:
        "Restreignez l'accès à la documentation d'API en production (authentification ou réseau interne).",
    });
  }

  // 3b. Endpoint GraphQL (détection sans requête réelle : un GET provoque une erreur GraphQL typée)
  const gql = await fetchWithTimeout(`${origin}/graphql`, { redirect: "follow" });
  if (gql) {
    const body = (await gql.text().catch(() => "")).slice(0, 2048);
    if (/"errors"\s*:|must provide query string|GraphQL/i.test(body)) {
      out.push({
        id: "graphql-endpoint",
        category: "Reconnaissance",
        title: "Endpoint GraphQL détecté",
        severity: "info",
        state: "info",
        detail:
          "Un endpoint /graphql répond. Vérifiez que l'introspection est désactivée en production et " +
          "qu'une limite de profondeur/complexité protège contre le déni de service.",
        recommendation:
          "Désactivez l'introspection GraphQL en production et appliquez des limites de profondeur, " +
          "de complexité et de débit. Voir le playbook « API GraphQL » pour un test approfondi.",
      });
    }
  }

  return out;
}

// --- 4. Source maps JavaScript exposées (fuite de code source côté client) -----------------

async function sourceMapExposure(origin: string): Promise<Finding[]> {
  const html = await fetchWithTimeout(origin, { redirect: "follow", timeoutMs: 9000 });
  if (!html || !html.ok) return [];
  const body = await html.text().catch(() => "");
  if (!body) return [];

  let scripts: string[] = [];
  try {
    const root = parse(body);
    scripts = root
      .querySelectorAll("script[src]")
      .map((s) => s.getAttribute("src") || "")
      .filter((src) => /\.js(\?|$)/i.test(src));
  } catch {
    return [];
  }

  // Ne conserve que les bundles de même origine, dédupliqués, limités à 6 sondes.
  const candidates = [
    ...new Set(
      scripts
        .map((src) => {
          try {
            return new URL(src, origin).toString();
          } catch {
            return "";
          }
        })
        .filter((u) => u && u.startsWith(origin))
        .map((u) => u.split("?")[0])
    ),
  ].slice(0, 6);

  if (!candidates.length) return [];

  const exposed: string[] = [];
  await mapLimit(candidates, 4, async (jsUrl) => {
    const mapUrl = `${jsUrl}.map`;
    const r = await fetchWithTimeout(mapUrl, { redirect: "follow", timeoutMs: 7000 });
    if (!r || r.status !== 200) return;
    const head = (await r.text().catch(() => "")).slice(0, 4096);
    // Une source map valide contient "version" et "sources"/"sourcesContent".
    if (/"version"\s*:\s*3/.test(head) && /"sources(Content)?"\s*:/.test(head)) {
      exposed.push(mapUrl.replace(origin, ""));
    }
  });

  if (!exposed.length) return [];
  return [
    {
      id: "sourcemap-exposure",
      category: "Divulgation",
      title: `${exposed.length} source map(s) JavaScript exposée(s)`,
      severity: "low",
      state: "warn",
      detail:
        "Des fichiers .map exposent le code source front-end original (noms de variables, commentaires, " +
        "logique métier, endpoints internes) : " +
        exposed.slice(0, 5).join(", ") +
        (exposed.length > 5 ? ` … (+${exposed.length - 5})` : "") +
        ".",
      recommendation:
        "Ne déployez pas les source maps en production, ou restreignez-en l'accès (les retirer du CDN public).",
    },
  ];
}

/** Analyse de surface d'exposition approfondie (domaine vérifié). */
export async function exposureChecks(target: URL): Promise<Finding[]> {
  const origin = target.origin;
  const groups = await Promise.all([
    textProbes(origin).catch(() => [] as Finding[]),
    archiveProbes(origin).catch(() => [] as Finding[]),
    apiSurface(origin).catch(() => [] as Finding[]),
    sourceMapExposure(origin).catch(() => [] as Finding[]),
  ]);
  return groups.flat();
}
