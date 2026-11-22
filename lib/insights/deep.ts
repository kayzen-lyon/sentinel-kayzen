import dns from "node:dns/promises";
import type { Finding, Severity } from "../scanner";
import { safeFetch } from "../ssrf";

/**
 * Contrôles approfondis supplémentaires — RÉSERVÉS aux domaines dont la propriété est vérifiée.
 * Uniquement des GET / OPTIONS sur l'origine validée (et ses sous-domaines publiés dans les logs
 * CT), contenu validé pour limiter les faux positifs. Items 51 à 59 de
 * docs/AMELIORATIONS-SCAN-DASHBOARD.md.
 */

const UA = "SentinelByKayzen/1.0 (+https://sentinel.kayzen-lyon.com; passive security posture scan)";

async function get(url: string, method = "GET", timeoutMs = 6000): Promise<{ status: number; body: string; headers: Headers } | null> {
  const r = await safeFetch(url, { method, redirect: "manual", timeoutMs, headers: { "user-agent": UA } });
  if (!r) return null;
  const body = method === "GET" ? (await r.text().catch(() => "")).slice(0, 60000) : "";
  return { status: r.status, body, headers: r.headers };
}

type Probe = { path: string; label: string; severity: Severity; valid: (b: string) => boolean; fix: string };

const SENSITIVE: Probe[] = [
  { path: "/.DS_Store", label: "Index de dossier macOS (.DS_Store)", severity: "low", valid: (b) => b.includes("Bud1"), fix: "Supprimez les fichiers .DS_Store du serveur et bloquez-les." },
  { path: "/.htaccess", label: "Configuration Apache (.htaccess)", severity: "medium", valid: (b) => /RewriteEngine|RewriteRule|Deny from|Require all|AuthType/i.test(b) && !/<html/i.test(b), fix: "Interdisez la lecture des fichiers .ht* (directive FilesMatch)." },
  { path: "/web.config", label: "Configuration IIS (web.config)", severity: "medium", valid: (b) => /<configuration[\s>]/i.test(b), fix: "Bloquez la lecture de web.config." },
  { path: "/composer.json", label: "Dépendances PHP (composer.json)", severity: "low", valid: (b) => /"require"\s*:/.test(b), fix: "Ne servez pas composer.json : il révèle les versions des dépendances." },
  { path: "/composer.lock", label: "Versions PHP figées (composer.lock)", severity: "low", valid: (b) => /"packages"\s*:/.test(b), fix: "Ne servez pas composer.lock." },
  { path: "/package.json", label: "Dépendances Node (package.json)", severity: "low", valid: (b) => /"(dependencies|devDependencies)"\s*:/.test(b), fix: "Ne servez pas package.json depuis la racine web." },
  { path: "/docker-compose.yml", label: "Fichier docker-compose", severity: "medium", valid: (b) => /^services:|^\s+image:/m.test(b), fix: "Retirez docker-compose.yml du répertoire servi (il contient souvent des secrets)." },
  { path: "/Dockerfile", label: "Dockerfile", severity: "low", valid: (b) => /^FROM\s+\S+/m.test(b) && !/<html/i.test(b), fix: "Retirez le Dockerfile du répertoire servi." },
  { path: "/.npmrc", label: "Configuration npm (.npmrc)", severity: "high", valid: (b) => /_authToken|registry=/i.test(b) && !/<html/i.test(b), fix: "Retirez .npmrc et révoquez le jeton qu'il contient." },
  { path: "/.gitlab-ci.yml", label: "Pipeline GitLab CI", severity: "low", valid: (b) => /^(stages|script|image):/m.test(b), fix: "Retirez les fichiers de CI du répertoire servi." },
  { path: "/server-info", label: "Page server-info Apache", severity: "medium", valid: (b) => /Apache Server Information/i.test(b), fix: "Désactivez mod_info ou restreignez-le à localhost." },
  { path: "/nginx_status", label: "Statut nginx (stub_status)", severity: "low", valid: (b) => /Active connections:/i.test(b), fix: "Restreignez stub_status à localhost." },
  { path: "/telescope", label: "Console Laravel Telescope", severity: "high", valid: (b) => /Laravel Telescope|telescope-app/i.test(b), fix: "Désactivez Telescope en production ou protégez-le par authentification." },
  { path: "/_profiler", label: "Profileur Symfony", severity: "high", valid: (b) => /Symfony Profiler|sf-toolbar/i.test(b), fix: "Désactivez le profileur Symfony en production (APP_ENV=prod)." },
  { path: "/console", label: "Console de débogage Werkzeug", severity: "critical", valid: (b) => /Werkzeug|Interactive Console/i.test(b), fix: "Désactivez le mode debug Flask/Werkzeug en production : la console permet d'exécuter du code." },
  { path: "/elmah.axd", label: "Journal d'erreurs ELMAH", severity: "medium", valid: (b) => /Error Log for/i.test(b), fix: "Restreignez elmah.axd aux administrateurs." },
];

const ERROR_LEAKS: [RegExp, string][] = [
  [/Traceback \(most recent call last\)/, "trace Python"],
  [/You're seeing this error because you have <code>DEBUG = True/, "mode DEBUG Django"],
  [/Whitelabel Error Page/, "page d'erreur Spring Boot"],
  [/at [\w$.]+\s?\([^)]*:\d+:\d+\)/, "pile d'appels JavaScript"],
  [/Stack trace:|Fatal error:<\/b>|Warning:<\/b>.*on line/i, "erreur PHP"],
  [/Microsoft \.NET Framework Version|ASP\.NET Version/i, "version ASP.NET"],
  [/Laravel|Illuminate\\/, "Laravel"],
  [/(Apache|nginx|Microsoft-IIS)\/\d+\.\d+/i, "version du serveur web"],
];

const TAKEOVER: [RegExp, RegExp, string][] = [
  [/github\.io$/, /There isn't a GitHub Pages site here/i, "GitHub Pages"],
  [/herokuapp\.com$|herokudns\.com$/, /No such app|herokucdn\.com\/error-pages/i, "Heroku"],
  [/s3[.-][\w.-]*amazonaws\.com$|s3\.amazonaws\.com$/, /NoSuchBucket/i, "Amazon S3"],
  [/azurewebsites\.net$|cloudapp\.net$|trafficmanager\.net$|blob\.core\.windows\.net$/, /404 Web Site not found|ResourceNotFound|The specified container does not exist/i, "Azure"],
  [/netlify\.(app|com)$/, /Not Found - Request ID/i, "Netlify"],
  [/ghost\.io$/, /Domain error|The thing you were looking for is no longer here/i, "Ghost"],
  [/surge\.sh$/, /project not found/i, "Surge"],
  [/bitbucket\.io$/, /Repository not found/i, "Bitbucket"],
  [/myshopify\.com$/, /Sorry, this shop is currently unavailable/i, "Shopify"],
  [/zendesk\.com$/, /Help Center Closed/i, "Zendesk"],
  [/readme\.io$/, /Project doesnt exist/i, "ReadMe"],
  [/wordpress\.com$/, /Do you want to register/i, "WordPress.com"],
  [/pantheonsite\.io$/, /The gods are wise/i, "Pantheon"],
];

/** Détection de prise de contrôle de sous-domaine (CNAME vers un service non revendiqué). */
export async function takeoverCheck(sub: string): Promise<{ sub: string; service: string; cname: string } | null> {
  const cname = (await dns.resolveCname(sub).catch(() => [] as string[]))[0];
  if (!cname) return null;
  const rule = TAKEOVER.find(([host]) => host.test(cname.toLowerCase()));
  if (!rule) return null;
  const r = await safeFetch(`https://${sub}/`, { timeoutMs: 6000, headers: { "user-agent": UA } }).catch(() => null);
  const body = r ? (await r.text().catch(() => "")).slice(0, 20000) : "";
  return rule[1].test(body) ? { sub, service: rule[2], cname } : null;
}

export async function deepInsightChecks(target: URL, homeHtml: string, subdomains: string[]): Promise<Finding[]> {
  const origin = target.origin;
  const out: Finding[] = [];
  const rnd = Math.random().toString(36).slice(2, 10);

  const [options, notFound, sensitive, dirs, robots, wp, takeovers] = await Promise.all([
    get(origin, "OPTIONS"),
    get(`${origin}/sentinel-${rnd}-introuvable`),
    Promise.all(SENSITIVE.map(async (p) => {
      const r = await get(`${origin}${p.path}`);
      return r && r.status === 200 && p.valid(r.body) ? p : null;
    })),
    Promise.all(["/uploads/", "/images/", "/files/", "/backup/", "/assets/", "/static/", "/media/"].map(async (d) => {
      const r = await get(`${origin}${d}`);
      return r && r.status === 200 && /<title>\s*Index of \/|Directory listing for|<h1>Index of/i.test(r.body) ? d : null;
    })),
    get(`${origin}/robots.txt`),
    /wp-content|wp-includes/i.test(homeHtml)
      ? Promise.all([get(`${origin}/xmlrpc.php`), get(`${origin}/wp-json/wp/v2/users`)])
      : Promise.resolve(null),
    Promise.all(subdomains.slice(0, 20).map((s) => takeoverCheck(s).catch(() => null))),
  ]);

  // Méthodes HTTP
  const allow = (options?.headers.get("allow") || options?.headers.get("access-control-allow-methods") || "").toUpperCase();
  if (/\bTRACE\b/.test(allow))
    out.push({ id: "http-trace", category: "Exposition", title: "Méthode TRACE annoncée", severity: "low", state: "warn",
      detail: `Le serveur annonce : ${allow}. TRACE peut renvoyer les en-têtes (dont les cookies) à un script (XST).`,
      recommendation: "Désactivez TRACE (Apache : TraceEnable off)." });
  const allowed = allow.split(/[\s,]+/);
  const risky = ["PUT", "DELETE", "PATCH"].filter((m) => allowed.includes(m));
  if (risky.length && options && options.status < 400)
    out.push({ id: "http-methods", category: "Exposition", title: `Méthodes d'écriture annoncées à la racine (${risky.join(", ")})`, severity: "info", state: "info",
      detail: `En-tête Allow : ${allow}. À vérifier : ces méthodes doivent exiger une authentification.`,
      recommendation: "N'autorisez que GET, HEAD et POST sur les pages publiques." });

  // Page d'erreur
  const leaks = notFound ? ERROR_LEAKS.filter(([re]) => re.test(notFound.body)).map(([, l]) => l) : [];
  if (leaks.length)
    out.push({ id: "error-disclosure", category: "Divulgation", title: "La page d'erreur divulgue des informations techniques",
      severity: leaks.some((l) => /trace|DEBUG|pile|PHP/.test(l)) ? "medium" : "low", state: "warn",
      detail: `Une URL inexistante révèle : ${leaks.join(", ")}.`,
      recommendation: "Servez une page d'erreur générique et désactivez le mode debug en production." });

  for (const p of sensitive.filter((x): x is Probe => !!x))
    out.push({ id: `exposed${p.path}`, category: "Exposition", title: `${p.label} accessible publiquement`, severity: p.severity,
      state: "fail", detail: `${p.path} renvoie son contenu (HTTP 200, contenu vérifié).`, recommendation: p.fix });

  const openDirs = dirs.filter(Boolean) as string[];
  if (openDirs.length)
    out.push({ id: "dir-listing", category: "Exposition", title: "Listage de répertoires activé", severity: "medium", state: "fail",
      detail: `Le contenu de ces dossiers est listé : ${openDirs.join(", ")}.`,
      recommendation: "Désactivez l'indexation automatique (Apache : Options -Indexes ; nginx : autoindex off)." });

  // robots.txt : chemins sensibles déclarés
  if (robots && robots.status === 200) {
    const paths = [...robots.body.matchAll(/^\s*Disallow:\s*(\S+)/gim)].map((m) => m[1])
      .filter((p) => /admin|backup|private|secret|internal|config|old|test|dev|staging|debug|api|sql|dump/i.test(p));
    if (paths.length)
      out.push({ id: "robots-sensitive", category: "Reconnaissance", title: `robots.txt révèle ${paths.length} chemin(s) sensible(s)`, severity: "info", state: "info",
        detail: `Déclarés « à ne pas indexer », donc signalés aux curieux : ${paths.slice(0, 8).join(", ")}.`,
        recommendation: "Protégez ces chemins par authentification plutôt que de les cacher via robots.txt." });
  }

  // WordPress
  if (wp) {
    const [xmlrpc, users] = wp;
    if (xmlrpc && /XML-RPC server accepts POST requests only/i.test(xmlrpc.body))
      out.push({ id: "wp-xmlrpc", category: "Exposition", title: "WordPress : xmlrpc.php actif", severity: "medium", state: "fail",
        detail: "xmlrpc.php permet des attaques par force brute amplifiées (system.multicall) et des pingbacks abusifs.",
        recommendation: "Désactivez XML-RPC (extension ou règle serveur) si vous ne l'utilisez pas." });
    if (users && users.status === 200 && /"slug"\s*:/.test(users.body)) {
      const slugs = [...users.body.matchAll(/"slug"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
      out.push({ id: "wp-users", category: "Exposition", title: `WordPress : ${slugs.length} identifiant(s) d'utilisateur exposé(s)`, severity: "medium", state: "fail",
        detail: `L'API REST publique liste les identifiants de connexion (${slugs.slice(0, 5).join(", ")}) : la moitié du travail d'une attaque par mot de passe.`,
        recommendation: "Restreignez /wp-json/wp/v2/users aux utilisateurs connectés." });
    }
  }

  for (const t of takeovers.filter((x): x is NonNullable<typeof x> => !!x))
    out.push({ id: `takeover-${t.sub}`, category: "Exposition", title: `Prise de contrôle possible : ${t.sub}`, severity: "critical", state: "fail",
      detail: `${t.sub} pointe (CNAME ${t.cname}) vers un service ${t.service} non revendiqué : un tiers peut y publier son propre contenu sous votre domaine.`,
      recommendation: `Supprimez l'enregistrement DNS de ${t.sub} ou recréez la ressource ${t.service} correspondante.` });

  return out;
}
