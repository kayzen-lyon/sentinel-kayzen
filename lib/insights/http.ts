import { parse } from "node-html-parser";
import type { Finding } from "../scanner";
import { safeFetch } from "../ssrf";
import type { CookieInfo, LibraryInfo, RedirectHop, ThirdParty } from "./types";

/**
 * Analyse HTTP et contenu de la page principale — à partir de la réponse déjà obtenue
 * (aucune requête supplémentaire hormis la chaîne de redirections et la variante www/apex).
 * Items 11-13, 31-39 et 41-50 de docs/AMELIORATIONS-SCAN-DASHBOARD.md.
 */

const UA = "SentinelByKayzen/1.0 (+https://sentinel.kayzen-lyon.com; passive security posture scan)";

// ---------------------------------------------------------------- cookies

/** Analyse d'un en-tête Set-Cookie (la valeur n'est jamais conservée). */
export function parseCookie(raw: string): CookieInfo {
  const parts = raw.split(";").map((p) => p.trim());
  const name = parts[0].split("=")[0];
  const attr = (k: string) => parts.find((p) => p.toLowerCase().startsWith(k));
  const sameSite = attr("samesite")?.split("=")[1];
  const maxAge = attr("max-age")?.split("=")[1] ?? attr("expires")?.slice(8);
  return {
    name,
    secure: parts.some((p) => p.toLowerCase() === "secure"),
    httpOnly: parts.some((p) => p.toLowerCase() === "httponly"),
    sameSite,
    maxAge,
    domain: attr("domain")?.split("=")[1],
    session: /sess|sid|auth|token|jwt|login/i.test(name),
  };
}

// ---------------------------------------------------------------- CSP

/** Faiblesses d'une politique CSP. */
export function analyzeCsp(csp: string): { weaknesses: string[]; missing: string[] } {
  const dirs = new Map<string, string>();
  for (const d of csp.split(";")) {
    const [k, ...v] = d.trim().split(/\s+/);
    if (k) dirs.set(k.toLowerCase(), v.join(" "));
  }
  const script = dirs.get("script-src") ?? dirs.get("default-src") ?? "";
  const weaknesses: string[] = [];
  if (/'unsafe-inline'/.test(script) && !/'nonce-|'sha(256|384|512)-|'strict-dynamic'/.test(script))
    weaknesses.push("script-src autorise 'unsafe-inline' (XSS non bloquée)");
  if (/'unsafe-eval'/.test(script)) weaknesses.push("script-src autorise 'unsafe-eval'");
  if (/(^|\s)\*(\s|$)|(^|\s)https?:(\s|$)/.test(script)) weaknesses.push("script-src accepte n'importe quel domaine (joker)");
  if (/(^|\s)data:(\s|$)/.test(script)) weaknesses.push("script-src accepte data:");
  const missing: string[] = [];
  if (!dirs.has("object-src") && !/'none'/.test(dirs.get("default-src") ?? "")) missing.push("object-src");
  if (!dirs.has("base-uri")) missing.push("base-uri");
  if (!dirs.has("frame-ancestors")) missing.push("frame-ancestors");
  if (!dirs.has("form-action")) missing.push("form-action");
  return { weaknesses, missing };
}

// ---------------------------------------------------------------- bibliothèques

/** Versions minimales sans vulnérabilité publique connue (sources : avis OSV / GitHub). */
const LIB_RULES: { name: string; re: RegExp; safe: string; note: string }[] = [
  { name: "jQuery", re: /jquery[.-]?(\d+\.\d+\.\d+)|jQuery v(\d+\.\d+\.\d+)/i, safe: "3.5.0", note: "XSS (CVE-2020-11022/11023)" },
  { name: "Bootstrap", re: /bootstrap[@/.-]v?(\d+\.\d+\.\d+)|Bootstrap v(\d+\.\d+\.\d+)/i, safe: "4.3.1", note: "XSS (CVE-2019-8331)" },
  { name: "AngularJS", re: /angular(?:js)?[@/.-]v?(1\.\d+\.\d+)|AngularJS v(1\.\d+\.\d+)/i, safe: "2.0.0", note: "fin de support depuis 2022" },
  { name: "Lodash", re: /lodash[@/.-]v?(\d+\.\d+\.\d+)|lodash (\d+\.\d+\.\d+)/i, safe: "4.17.21", note: "pollution de prototype (CVE-2021-23337)" },
  { name: "Moment.js", re: /moment[@/.-]v?(\d+\.\d+\.\d+)|moment\.js[^\d]{0,12}(\d+\.\d+\.\d+)/i, safe: "2.29.4", note: "ReDoS (CVE-2022-31129)" },
  { name: "Vue", re: /vue[@/.-]v?(\d+\.\d+\.\d+)|Vue\.js v(\d+\.\d+\.\d+)/i, safe: "3.0.0", note: "Vue 2 en fin de support" },
  { name: "Handlebars", re: /handlebars[@/.-]v?(\d+\.\d+\.\d+)/i, safe: "4.7.7", note: "exécution de code (CVE-2021-23369)" },
  { name: "DOMPurify", re: /dompurify[@/.-]v?(\d+\.\d+\.\d+)|DOMPurify (\d+\.\d+\.\d+)/i, safe: "3.1.3", note: "contournement de nettoyage" },
];

function lt(a: string, b: string): boolean {
  const x = a.split(".").map(Number);
  const y = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) < (y[i] || 0);
  return false;
}

export function detectLibraries(texts: string[]): LibraryInfo[] {
  const out = new Map<string, LibraryInfo>();
  for (const rule of LIB_RULES)
    for (const t of texts) {
      const m = rule.re.exec(t);
      const v = m?.slice(1).find(Boolean);
      if (v && !out.has(rule.name))
        out.set(rule.name, { name: rule.name, version: v, vulnerable: lt(v, rule.safe) ? rule.note : undefined });
    }
  return [...out.values()];
}

// ---------------------------------------------------------------- tiers & traceurs

const TRACKERS: [RegExp, string][] = [
  [/google-analytics\.com|googletagmanager\.com/, "Google Analytics / Tag Manager"],
  [/doubleclick\.net|googlesyndication\.com|googleadservices\.com/, "Google Ads"],
  [/connect\.facebook\.net|facebook\.com\/tr/, "Meta Pixel"],
  [/hotjar\.com/, "Hotjar"],
  [/clarity\.ms/, "Microsoft Clarity"],
  [/snap\.licdn\.com|linkedin\.com\/px/, "LinkedIn Insight"],
  [/analytics\.tiktok\.com/, "TikTok Pixel"],
  [/static\.ads-twitter\.com|t\.co\/i\/adsct/, "X (Twitter) Ads"],
  [/cdn\.segment\.com/, "Segment"],
  [/js\.hs-scripts\.com|js\.hs-analytics\.net/, "HubSpot"],
  [/widget\.intercom\.io/, "Intercom"],
  [/script\.crazyegg\.com/, "Crazy Egg"],
];

export function trackerFor(host: string): string | undefined {
  return TRACKERS.find(([re]) => re.test(host))?.[1];
}

export type ContentAnalysis = {
  thirdParties: ThirdParty[];
  libraries: LibraryInfo[];
  emailsExposed: number;
  findings: Finding[];
};

/** Analyse de la page HTML (tiers, SRI, traceurs, bibliothèques, formulaires, fuites). */
export function analyzeContent(html: string, pageUrl: string): ContentAnalysis {
  const findings: Finding[] = [];
  const origin = new URL(pageUrl);
  const site = origin.hostname.split(".").slice(-2).join(".");
  const tp = new Map<string, ThirdParty>();
  const noSri: string[] = [];
  let root;
  try {
    root = parse(html, { comment: true });
  } catch {
    return { thirdParties: [], libraries: [], emailsExposed: 0, findings };
  }
  const note = (src: string | undefined, kind: string, sriOk: boolean) => {
    if (!src) return;
    try {
      const u = new URL(src, pageUrl);
      if (!/^https?:$/.test(u.protocol)) return;
      const host = u.hostname.toLowerCase();
      if (host === origin.hostname || host.endsWith(`.${site}`) || host === site) return;
      const cur = tp.get(host) ?? { host, kinds: [], sri: true, tracker: trackerFor(host + u.pathname) };
      if (!cur.kinds.includes(kind)) cur.kinds.push(kind);
      if (!sriOk && (kind === "script" || kind === "style")) {
        cur.sri = false;
        if (!noSri.includes(host)) noSri.push(host);
      }
      tp.set(host, cur);
    } catch {
      /* URL invalide */
    }
  };
  const scripts = root.querySelectorAll("script[src]");
  for (const s of scripts) note(s.getAttribute("src"), "script", !!s.getAttribute("integrity"));
  for (const l of root.querySelectorAll('link[rel~="stylesheet"][href]')) note(l.getAttribute("href"), "style", !!l.getAttribute("integrity"));
  for (const i of root.querySelectorAll("img[src]")) note(i.getAttribute("src"), "image", true);
  for (const f of root.querySelectorAll("iframe[src]")) note(f.getAttribute("src"), "iframe", true);
  const thirdParties = [...tp.values()].sort((a, b) => a.host.localeCompare(b.host)).slice(0, 60);

  // Traceurs dans le HTML initial (avant tout consentement)
  const trackers = [...new Set(thirdParties.map((t) => t.tracker).filter(Boolean))] as string[];
  const inlineGa = /gtag\(|ga\('create'|fbq\('init'|_hjSettings/.test(html);
  if (trackers.length || inlineGa)
    findings.push({
      id: "trackers-preconsent",
      category: "Confidentialité",
      title: `Traceurs présents dans la page initiale${trackers.length ? ` (${trackers.join(", ")})` : ""}`,
      severity: "medium",
      state: "warn",
      detail:
        "Ces outils de mesure ou de publicité sont référencés dès le chargement. S'ils s'exécutent avant le " +
        "consentement, le site enfreint les règles de la CNIL (contrôle indicatif, à confirmer dans un navigateur).",
      recommendation: "Ne chargez ces scripts qu'après un consentement explicite (bandeau conforme).",
      refs: [{ label: "CNIL — cookies et traceurs", url: "https://www.cnil.fr/fr/cookies-et-autres-traceurs" }],
    });

  if (noSri.length)
    findings.push({
      id: "sri-missing",
      category: "Contenu",
      title: `${noSri.length} domaine(s) tiers chargé(s) sans contrôle d'intégrité (SRI)`,
      severity: "low",
      state: "warn",
      detail: `Scripts ou styles tiers sans attribut integrity : ${noSri.slice(0, 6).join(", ")}. Si ce fournisseur est compromis, son code s'exécute sur votre site.`,
      recommendation: "Ajoutez integrity=\"sha384-…\" et crossorigin=\"anonymous\" aux ressources tierces versionnées.",
    });

  // Bibliothèques
  const libraries = detectLibraries([...scripts.map((s) => s.getAttribute("src") || ""), html.slice(0, 400000)]);
  for (const lib of libraries.filter((l) => l.vulnerable))
    findings.push({
      id: `lib-${lib.name.toLowerCase().replace(/[^a-z]/g, "")}`,
      category: "Contenu",
      title: `${lib.name} ${lib.version} obsolète`,
      severity: "medium",
      state: "fail",
      detail: `Cette version présente une faiblesse connue : ${lib.vulnerable}.`,
      recommendation: `Mettez ${lib.name} à jour vers la dernière version stable.`,
    });

  // Formulaires
  const badForms: string[] = [];
  for (const form of root.querySelectorAll("form[action]")) {
    try {
      const u = new URL(form.getAttribute("action") || "", pageUrl);
      if (u.protocol === "http:" && origin.protocol === "https:") badForms.push(`${u.href} (HTTP)`);
    } catch {
      /* ignore */
    }
  }
  if (badForms.length)
    findings.push({
      id: "form-http",
      category: "Contenu",
      title: "Formulaire envoyé en HTTP non chiffré",
      severity: "high",
      state: "fail",
      detail: `Les données saisies partent en clair : ${badForms.slice(0, 3).join(", ")}.`,
      recommendation: "Faites pointer l'attribut action des formulaires vers une URL https://.",
    });

  // Adresses e-mail visibles
  const emails = new Set((html.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []).filter((e) => !/\.(png|jpe?g|svg|webp|gif)$/i.test(e)));
  if (emails.size)
    findings.push({
      id: "emails-exposed",
      category: "Confidentialité",
      title: `${emails.size} adresse(s) e-mail en clair dans la page`,
      severity: "info",
      state: "info",
      detail: "Les adresses lisibles dans le HTML sont collectées par les robots de spam et d'hameçonnage.",
      recommendation: "Préférez un formulaire de contact ou masquez les adresses (encodage, image).",
    });

  // Commentaires HTML sensibles
  const comments = (html.match(/<!--([\s\S]{0,400}?)-->/g) || []).filter((c) => /todo|fixme|password|mot de passe|secret|api[_-]?key|debug|admin/i.test(c));
  if (comments.length)
    findings.push({
      id: "html-comments",
      category: "Divulgation",
      title: `${comments.length} commentaire(s) HTML sensible(s)`,
      severity: "low",
      state: "warn",
      detail: `Extrait : ${comments[0].replace(/\s+/g, " ").slice(0, 140)}`,
      recommendation: "Retirez les commentaires de développement du HTML servi en production.",
    });

  // target=_blank sans noopener
  const blank = root.querySelectorAll('a[target="_blank"]').filter((a) => !/noopener|noreferrer/i.test(a.getAttribute("rel") || ""));
  if (blank.length)
    findings.push({
      id: "tabnabbing",
      category: "Contenu",
      title: `${blank.length} lien(s) target="_blank" sans rel="noopener"`,
      severity: "info",
      state: "info",
      detail: "Les navigateurs récents protègent par défaut, mais les anciens permettent à la page ouverte de rediriger la vôtre.",
      recommendation: 'Ajoutez rel="noopener noreferrer" aux liens qui ouvrent un nouvel onglet.',
    });

  return { thirdParties, libraries, emailsExposed: emails.size, findings };
}

// ---------------------------------------------------------------- en-têtes

export function analyzeHeaders(h: Headers): { headers: [string, string][]; cookies: CookieInfo[]; findings: Finding[] } {
  const findings: Finding[] = [];
  const rawCookies = (h as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
  const cookies = rawCookies.map(parseCookie).slice(0, 40);
  const headers: [string, string][] = [];
  h.forEach((v, k) => {
    if (k !== "set-cookie") headers.push([k, v.length > 400 ? `${v.slice(0, 400)}…` : v]);
  });
  for (const c of cookies) headers.push(["set-cookie", `${c.name}=… (valeur masquée)`]);
  headers.sort((a, b) => a[0].localeCompare(b[0]));

  const sessionNoHttpOnly = cookies.filter((c) => c.session && !c.httpOnly);
  if (sessionNoHttpOnly.length)
    findings.push({
      id: "cookie-session-httponly",
      category: "Cookies",
      title: "Cookie de session lisible par JavaScript",
      severity: "high",
      state: "fail",
      detail: `Sans HttpOnly, une faille XSS suffit pour voler la session : ${sessionNoHttpOnly.map((c) => c.name).join(", ")}.`,
      recommendation: "Ajoutez HttpOnly (et Secure, SameSite=Lax) aux cookies d'authentification.",
    });

  const csp = h.get("content-security-policy") || "";
  if (csp) {
    const { weaknesses, missing } = analyzeCsp(csp);
    if (weaknesses.length)
      findings.push({
        id: "csp-weak",
        category: "En-têtes",
        title: "CSP présente mais contournable",
        severity: "medium",
        state: "warn",
        detail: weaknesses.join(" · ") + ".",
        recommendation: "Remplacez 'unsafe-inline' par des nonces ou des empreintes, retirez 'unsafe-eval' et les jokers.",
      });
    if (missing.length)
      findings.push({
        id: "csp-missing-directives",
        category: "En-têtes",
        title: `CSP : directive(s) absente(s) (${missing.join(", ")})`,
        severity: "low",
        state: "warn",
        detail: "Ces directives ne sont pas couvertes par default-src et restent ouvertes.",
        recommendation: `Ajoutez ${missing.map((m) => `${m} ${m === "frame-ancestors" ? "'self'" : m === "form-action" ? "'self'" : m === "base-uri" ? "'self'" : "'none'"}`).join("; ")}.`,
      });
  }
  if (!h.get("cross-origin-embedder-policy"))
    findings.push({
      id: "coep",
      category: "En-têtes",
      title: "Cross-Origin-Embedder-Policy absent",
      severity: "info",
      state: "info",
      detail: "COEP (avec COOP) isole la page des ressources non autorisées et active l'isolation cross-origin.",
      recommendation: "Évaluez Cross-Origin-Embedder-Policy: require-corp (attention aux ressources tierces).",
    });
  if (!h.get("x-permitted-cross-domain-policies"))
    findings.push({
      id: "xpcdp",
      category: "En-têtes",
      title: "X-Permitted-Cross-Domain-Policies absent",
      severity: "info",
      state: "info",
      detail: "Cet en-tête empêche les clients Adobe (PDF, Flash hérité) de charger des données depuis votre domaine.",
      recommendation: "Ajoutez X-Permitted-Cross-Domain-Policies: none.",
    });
  const reporting = h.get("report-to") || h.get("reporting-endpoints") || h.get("nel") || /report-(uri|to)/i.test(csp);
  findings.push(
    reporting
      ? { id: "reporting", category: "En-têtes", title: "Rapports navigateur configurés", severity: "info", state: "pass", detail: "Les violations CSP / erreurs réseau vous sont remontées." }
      : { id: "reporting", category: "En-têtes", title: "Aucun rapport de violation navigateur", severity: "info", state: "info",
          detail: "Sans report-to / report-uri, vous ne voyez pas les attaques bloquées par la CSP.",
          recommendation: "Ajoutez une directive report-to à la CSP (des services gratuits existent)." }
  );
  return { headers: headers.slice(0, 80), cookies, findings };
}

// ---------------------------------------------------------------- redirections

/** Suit la chaîne de redirections à la main (8 sauts maximum), chaque saut revalidé anti-SSRF. */
export async function redirectChain(start: string): Promise<RedirectHop[]> {
  const hops: RedirectHop[] = [];
  let url = start;
  for (let i = 0; i < 8; i++) {
    const r = await safeFetch(url, { redirect: "manual", timeoutMs: 6000, headers: { "user-agent": UA } });
    if (!r) break;
    hops.push({ url, status: r.status });
    const loc = r.headers.get("location");
    if (!(r.status >= 300 && r.status < 400 && loc)) break;
    url = new URL(loc, url).toString();
  }
  return hops;
}

export async function analyzeRedirects(target: URL, finalUrl: string): Promise<{ redirects: RedirectHop[]; findings: Finding[] }> {
  const findings: Finding[] = [];
  const redirects = await redirectChain(target.toString());
  if (redirects.length > 3)
    findings.push({
      id: "redirect-chain",
      category: "Transport",
      title: `Chaîne de ${redirects.length - 1} redirections`,
      severity: "low",
      state: "warn",
      detail: redirects.map((r) => `${r.status} ${r.url}`).join(" → "),
      recommendation: "Redirigez directement vers l'URL finale (une seule redirection 301).",
    });
  if (redirects.some((r, i) => i > 0 && r.url.startsWith("http://")))
    findings.push({
      id: "redirect-downgrade",
      category: "Transport",
      title: "Redirection intermédiaire en HTTP",
      severity: "medium",
      state: "fail",
      detail: "Un saut de redirection passe par http:// : il peut être intercepté.",
      recommendation: "Faites pointer toutes les redirections vers des URL https://.",
    });

  // Cohérence www / apex
  const host = new URL(finalUrl).hostname;
  const alt = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
  if (alt.split(".").length >= 2) {
    const r = await safeFetch(`https://${alt}/`, { redirect: "follow", timeoutMs: 6000, headers: { "user-agent": UA } });
    if (!r)
      findings.push({
        id: "www-apex",
        category: "Transport",
        title: `${alt} ne répond pas`,
        severity: "info",
        state: "info",
        detail: `Les visiteurs qui tapent ${alt} n'arrivent pas sur le site.`,
        recommendation: `Ajoutez ${alt} au DNS et redirigez-le vers ${host}.`,
      });
    else if (new URL(r.url).hostname !== host)
      findings.push({
        id: "www-apex",
        category: "Transport",
        title: `${alt} et ${host} ne convergent pas`,
        severity: "info",
        state: "info",
        detail: `${alt} aboutit à ${new URL(r.url).hostname} au lieu de ${host} (contenu dupliqué possible).`,
        recommendation: `Redirigez ${alt} vers ${host} en 301.`,
      });
  }
  return { redirects, findings };
}
