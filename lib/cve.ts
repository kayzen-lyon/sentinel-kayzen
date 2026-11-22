import type { CveRef } from "./scanner";
import { dbConfigured, ensureSchema, query } from "./db";

/**
 * Corrélation « composant détecté → CVE potentielles ».
 *
 * Source primaire : NVD 2.0 (gratuit ; clé optionnelle `NVD_API_KEY` pour lever la limite
 * 5 req/30s → 50 req/30s). Les résultats sont mis en cache (Postgres `cve_cache` + mémoire
 * du process) car les données CVE évoluent lentement. Les findings sont marqués « potentiel » :
 * la corrélation est basée sur une bannière, jamais sur une exploitation active.
 */

const UA =
  "SentinelByKayzen/1.0 (+https://sentinel.kayzen-lyon.com; passive CVE correlation)";
const CACHE_TTL_MS = 7 * 24 * 3600 * 1000; // 7 jours
const MAX_LOOKUPS_PER_SCAN = 3; // garde-fou gratuité (limite NVD sans clé)
const MAX_CVES_PER_COMPONENT = 8;

/** Bannière logicielle → vendor/product CPE (composants les plus courants en en-tête HTTP). */
const CPE_MAP: Record<string, { vendor: string; product: string }> = {
  nginx: { vendor: "nginx", product: "nginx" },
  apache: { vendor: "apache", product: "http_server" },
  httpd: { vendor: "apache", product: "http_server" },
  openssl: { vendor: "openssl", product: "openssl" },
  php: { vendor: "php", product: "php" },
  iis: { vendor: "microsoft", product: "internet_information_services" },
  "microsoft-iis": { vendor: "microsoft", product: "internet_information_services" },
  node: { vendor: "nodejs", product: "node.js" },
  nodejs: { vendor: "nodejs", product: "node.js" },
  express: { vendor: "openjsf", product: "express" },
  tomcat: { vendor: "apache", product: "tomcat" },
  coyote: { vendor: "apache", product: "tomcat" }, // "Apache-Coyote/1.1" → Tomcat
  jetty: { vendor: "eclipse", product: "jetty" },
  lighttpd: { vendor: "lighttpd", product: "lighttpd" },
  wordpress: { vendor: "wordpress", product: "wordpress" },
  openresty: { vendor: "openresty", product: "openresty" },
};

export type DetectedComponent = { product: string; version: string };

const memCache = new Map<string, { refs: CveRef[]; at: number }>();

/** Extrait les couples produit/version d'une chaîne de bannière ("nginx/1.24.0 (Ubuntu)"). */
export function parseBanners(...banners: (string | undefined)[]): DetectedComponent[] {
  const out: DetectedComponent[] = [];
  const seen = new Set<string>();
  for (const raw of banners) {
    if (!raw) continue;
    // Capture les motifs "<produit>/<version>" (nginx/1.24.0, PHP/8.1.2, Apache/2.4.52).
    // Faux positif safe-regex : un seul quantificateur par classe et {0,3}
    // borné → pas de backtracking catastrophique, sûr sur entrée hostile.
    // eslint-disable-next-line security/detect-unsafe-regex
    const re = /([a-zA-Z][a-zA-Z0-9_.-]*)\/(\d+(?:\.\d+){0,3})/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(raw)) !== null) {
      const product = m[1].toLowerCase();
      const version = m[2];
      const key = `${product}@${version}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ product, version });
    }
  }
  return out;
}

function cacheKey(vendor: string, product: string, version: string): string {
  return `nvd:${vendor}:${product}:${version}`;
}

async function readCache(key: string): Promise<CveRef[] | null> {
  const mem = memCache.get(key);
  if (mem && Date.now() - mem.at < CACHE_TTL_MS) return mem.refs;
  if (!dbConfigured) return null;
  try {
    await ensureSchema();
    const rows = await query<{ refs: CveRef[]; fetched_at: string }>(
      "SELECT refs, fetched_at FROM cve_cache WHERE cache_key = $1",
      [key]
    );
    if (!rows.length) return null;
    if (Date.now() - new Date(rows[0].fetched_at).getTime() > CACHE_TTL_MS) return null;
    memCache.set(key, { refs: rows[0].refs, at: Date.now() });
    return rows[0].refs;
  } catch {
    return null;
  }
}

async function writeCache(key: string, refs: CveRef[]): Promise<void> {
  memCache.set(key, { refs, at: Date.now() });
  if (!dbConfigured) return;
  try {
    await ensureSchema();
    await query(
      `INSERT INTO cve_cache (cache_key, refs, fetched_at)
       VALUES ($1, $2, now())
       ON CONFLICT (cache_key) DO UPDATE SET refs = EXCLUDED.refs, fetched_at = now()`,
      [key, JSON.stringify(refs)]
    );
  } catch {
    /* le cache est best-effort */
  }
}

type NvdResponse = {
  vulnerabilities?: {
    cve?: {
      id?: string;
      metrics?: {
        cvssMetricV31?: { cvssData?: { baseScore?: number } }[];
        cvssMetricV30?: { cvssData?: { baseScore?: number } }[];
        cvssMetricV2?: { cvssData?: { baseScore?: number } }[];
      };
    };
  }[];
};

async function queryNvd(
  vendor: string,
  product: string,
  version: string
): Promise<CveRef[]> {
  const cpe = `cpe:2.3:a:${vendor}:${product}:${version}:*:*:*:*:*:*:*`;
  const url =
    "https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=20&cpeName=" +
    encodeURIComponent(cpe);
  const headers: Record<string, string> = { "user-agent": UA };
  if (process.env.NVD_API_KEY) headers.apiKey = process.env.NVD_API_KEY;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 9000);
  let data: NvdResponse;
  try {
    const r = await fetch(url, { headers, signal: ctrl.signal });
    if (!r.ok) return []; // 403/429 (limite de débit) → pas de données, silencieux
    data = (await r.json()) as NvdResponse;
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }

  const refs: CveRef[] = [];
  for (const v of data.vulnerabilities ?? []) {
    const id = v.cve?.id;
    if (!id) continue;
    const m = v.cve?.metrics;
    const cvss =
      m?.cvssMetricV31?.[0]?.cvssData?.baseScore ??
      m?.cvssMetricV30?.[0]?.cvssData?.baseScore ??
      m?.cvssMetricV2?.[0]?.cvssData?.baseScore;
    refs.push({
      id,
      cvss,
      source: "NVD",
      url: `https://nvd.nist.gov/vuln/detail/${id}`,
    });
  }
  refs.sort((a, b) => (b.cvss ?? 0) - (a.cvss ?? 0));
  return refs.slice(0, MAX_CVES_PER_COMPONENT);
}

/** Cherche les CVE potentielles pour un composant détecté (avec cache). */
export async function lookupComponentCves(
  c: DetectedComponent
): Promise<CveRef[]> {
  const mapped = CPE_MAP[c.product];
  if (!mapped) return []; // produit non cartographié → on ne devine pas (évite les faux positifs)
  const key = cacheKey(mapped.vendor, mapped.product, c.version);
  const cached = await readCache(key);
  if (cached) return cached;
  const refs = await queryNvd(mapped.vendor, mapped.product, c.version);
  await writeCache(key, refs);
  return refs;
}

/** Enrichit les bannières détectées avec leurs CVE potentielles (borné pour rester gratuit). */
export async function correlateCves(
  components: DetectedComponent[]
): Promise<{ component: DetectedComponent; cves: CveRef[] }[]> {
  const known = components.filter((c) => CPE_MAP[c.product]).slice(0, MAX_LOOKUPS_PER_SCAN);
  const results = await Promise.all(
    known.map(async (component) => ({
      component,
      cves: await lookupComponentCves(component),
    }))
  );
  const hits = results.filter((r) => r.cves.length > 0);
  await enrichExploitation(hits.flatMap((r) => r.cves)).catch(() => {});
  return hits;
}

// --- Priorisation : exploitation réelle (CISA KEV) et probabilité d'exploitation (FIRST EPSS) ---
// Flux publics et gratuits. Idée reprise de CVEngine (GPL : aucune ligne de code reprise).

let kevCache: { ids: Set<string>; at: number } | null = null;

async function kevIds(): Promise<Set<string>> {
  if (kevCache && Date.now() - kevCache.at < 12 * 3600 * 1000) return kevCache.ids;
  const r = await fetch("https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json", {
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) return kevCache?.ids ?? new Set();
  const d = (await r.json()) as { vulnerabilities?: { cveID?: string }[] };
  kevCache = { ids: new Set((d.vulnerabilities ?? []).map((v) => v.cveID || "")), at: Date.now() };
  return kevCache.ids;
}

/** Lit la réponse EPSS de FIRST : identifiant CVE → probabilité (0 à 1). */
export function parseEpss(data: unknown): Map<string, number> {
  const out = new Map<string, number>();
  const rows = (data as { data?: { cve?: string; epss?: string }[] })?.data ?? [];
  for (const row of rows) {
    const v = Number(row.epss);
    if (row.cve && Number.isFinite(v)) out.set(row.cve, v);
  }
  return out;
}

/** Ajoute `kev` et `epss` aux CVE (au mieux : une source indisponible n'empêche pas l'autre). */
export async function enrichExploitation(refs: CveRef[]): Promise<void> {
  const ids = [...new Set(refs.map((r) => r.id).filter((id) => /^CVE-\d{4}-\d+$/.test(id)))].slice(0, 60);
  if (!ids.length) return;
  const [kev, epss] = await Promise.all([
    kevIds().catch(() => new Set<string>()),
    fetch(`https://api.first.org/data/v1/epss?cve=${ids.join(",")}`, { signal: AbortSignal.timeout(6000) })
      .then((r) => (r.ok ? r.json() : null))
      .then(parseEpss)
      .catch(() => new Map<string, number>()),
  ]);
  for (const ref of refs) {
    if (kev.has(ref.id)) ref.kev = true;
    const p = epss.get(ref.id);
    if (p !== undefined) ref.epss = p;
  }
  // Exploitées activement d'abord, puis par probabilité d'exploitation, puis par CVSS.
  refs.sort((a, b) => Number(b.kev ?? false) - Number(a.kev ?? false) || (b.epss ?? 0) - (a.epss ?? 0) || (b.cvss ?? 0) - (a.cvss ?? 0));
}
