import { safeFetch } from "./ssrf";

export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type CheckState = "pass" | "fail" | "warn" | "info";

/** Référence CVE potentielle rattachée à un composant détecté (advisory, non authentifié). */
export type CveRef = {
  id: string;
  cvss?: number;
  source: "NVD" | "OSV";
  url: string;
};

export type Finding = {
  id: string;
  category: string;
  title: string;
  severity: Severity;
  state: CheckState;
  detail: string;
  recommendation?: string;
  /** CVE potentiellement applicables au composant/version détecté (jamais confirmées activement). */
  cves?: CveRef[];
  /** Liens de référence (sources externes, preuves). */
  refs?: { label: string; url: string }[];
};

export type ScanSummary = {
  finalUrl: string;
  httpStatus: number;
  https: boolean;
  server?: string;
  responseTimeMs: number;
  counts: Record<Severity, number>;
  passed: number;
  total: number;
};

export type ScanResult = {
  targetUrl: string;
  grade: string;
  score: number;
  summary: ScanSummary;
  findings: Finding[];
};

const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
  info: 0,
};

const UA =
  "SentinelByKayzen/1.0 (+https://sentinel.kayzen-lyon.com; passive security posture scan)";

async function fetchSafe(
  url: string,
  opts: RequestInit & { timeoutMs?: number } = {}
): Promise<Response | null> {
  // Suivi de redirections durci anti-SSRF : chaque saut est re-validé (bloque une redirection
  // vers une IP interne / les métadonnées cloud, y compris après résolution DNS).
  return safeFetch(url, {
    ...opts,
    headers: { "user-agent": UA, ...(opts.headers || {}) },
  });
}

function grade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 65) return "C";
  if (score >= 50) return "D";
  if (score >= 35) return "E";
  return "F";
}

/** Exécute un scan passif de posture de sécurité sur une URL déjà validée (anti-SSRF). */
export async function runScan(
  target: URL,
  opts: { deep?: boolean } = {}
): Promise<ScanResult> {
  const findings: Finding[] = [];
  const add = (f: Finding) => findings.push(f);

  const started = Date.now();
  const res = await fetchSafe(target.toString(), {
    redirect: "follow",
    timeoutMs: 12000,
  });
  const responseTimeMs = Date.now() - started;

  if (!res) {
    throw new Error(
      "Cible injoignable (timeout, DNS ou connexion refusée). Vérifiez l'URL."
    );
  }

  const finalUrl = res.url || target.toString();
  const h = res.headers;
  const isHttps = finalUrl.startsWith("https://");
  const get = (k: string) => h.get(k) || "";

  // Corps de la page principale, lu une seule fois (plafonné) : sert à détecter
  // les WAF/CDN et les défis anti-bot (CAPTCHA) sur en-têtes + contenu.
  const bodyText = (await res.text().catch(() => "")).slice(0, 20000);

  // 1. HTTPS
  add(
    isHttps
      ? {
          id: "https",
          category: "Transport",
          title: "HTTPS activé",
          severity: "info",
          state: "pass",
          detail: `La cible répond en HTTPS (${finalUrl}).`,
        }
      : {
          id: "https",
          category: "Transport",
          title: "Absence de HTTPS",
          severity: "critical",
          state: "fail",
          detail: "Le site est servi en HTTP non chiffré.",
          recommendation:
            "Activez TLS et forcez la redirection de tout le trafic HTTP vers HTTPS.",
        }
  );

  // 2. Redirection HTTP -> HTTPS
  if (isHttps) {
    const httpUrl = new URL(finalUrl);
    httpUrl.protocol = "http:";
    const r = await fetchSafe(httpUrl.toString(), {
      redirect: "manual",
      timeoutMs: 8000,
    });
    const loc = r?.headers.get("location") || "";
    const redirects = r ? r.status >= 300 && r.status < 400 : false;
    if (redirects && loc.startsWith("https://")) {
      add({
        id: "http-redirect",
        category: "Transport",
        title: "Redirection HTTP → HTTPS",
        severity: "info",
        state: "pass",
        detail: "Le trafic HTTP est redirigé vers HTTPS.",
      });
    } else {
      add({
        id: "http-redirect",
        category: "Transport",
        title: "HTTP non redirigé vers HTTPS",
        severity: "medium",
        state: "warn",
        detail: "La version HTTP ne redirige pas clairement vers HTTPS.",
        recommendation:
          "Configurez une redirection 301 de http:// vers https:// sur l'ensemble du site.",
      });
    }
  }

  // 3. HSTS
  const hsts = get("strict-transport-security");
  if (isHttps) {
    if (hsts) {
      const maxAge = /max-age=(\d+)/i.exec(hsts)?.[1];
      const weak = maxAge && Number(maxAge) < 15552000;
      add({
        id: "hsts",
        category: "En-têtes",
        title: weak ? "HSTS présent mais faible" : "HSTS configuré",
        severity: weak ? "low" : "info",
        state: weak ? "warn" : "pass",
        detail: `Strict-Transport-Security: ${hsts}`,
        recommendation: weak
          ? "Portez max-age à au moins 6 mois (15552000) et ajoutez includeSubDomains."
          : undefined,
      });
    } else {
      add({
        id: "hsts",
        category: "En-têtes",
        title: "HSTS absent",
        severity: "high",
        state: "fail",
        detail: "L'en-tête Strict-Transport-Security n'est pas défini.",
        recommendation:
          "Ajoutez Strict-Transport-Security: max-age=63072000; includeSubDomains; preload.",
      });
    }
  }

  // 4. Content-Security-Policy
  const csp = get("content-security-policy");
  // Ce qui compte est la directive qui gouverne les SCRIPTS (script-src, sinon default-src).
  // 'unsafe-inline' y est neutralisé par les navigateurs dès qu'un nonce ou un hash est présent.
  const cspDirective = (name: string) =>
    (csp || "")
      .split(";")
      .map((d) => d.trim())
      .find((d) => d.toLowerCase().startsWith(name + " ")) || "";
  const cspScript = cspDirective("script-src") || cspDirective("default-src");
  const cspHasNonceOrHash = /'(nonce-|sha(256|384|512)-)/i.test(cspScript);
  const cspWeak =
    /'unsafe-eval'/i.test(cspScript) || (/'unsafe-inline'/i.test(cspScript) && !cspHasNonceOrHash);
  const cspStyleInline = /'unsafe-inline'/i.test(cspDirective("style-src"));
  add(
    csp
      ? {
          id: "csp",
          category: "En-têtes",
          title: "Content-Security-Policy présente",
          severity: cspWeak ? "low" : "info",
          state: cspWeak ? "warn" : "pass",
          detail: `CSP définie${
            cspWeak
              ? " (les scripts autorisent unsafe-inline/eval)"
              : cspStyleInline
                ? " — scripts protégés ; les styles en ligne restent autorisés (risque faible)"
                : ""
          }.`,
          recommendation: cspWeak
            ? "Éliminez 'unsafe-inline' et 'unsafe-eval' des scripts au profit de nonces/hashes."
            : undefined,
        }
      : {
          id: "csp",
          category: "En-têtes",
          title: "Content-Security-Policy absente",
          severity: "high",
          state: "fail",
          detail: "Aucune CSP : la protection contre le XSS est réduite.",
          recommendation:
            "Déployez une Content-Security-Policy restrictive (default-src 'self').",
        }
  );

  // 5. En-têtes de sécurité divers
  const headerChecks: {
    id: string;
    header: string;
    title: string;
    severity: Severity;
    rec: string;
  }[] = [
    {
      id: "xcto",
      header: "x-content-type-options",
      title: "X-Content-Type-Options",
      severity: "medium",
      rec: "Ajoutez X-Content-Type-Options: nosniff.",
    },
    {
      id: "xfo",
      header: "x-frame-options",
      title: "X-Frame-Options / anti-clickjacking",
      severity: "medium",
      rec: "Ajoutez X-Frame-Options: DENY ou une directive frame-ancestors en CSP.",
    },
    {
      id: "refpol",
      header: "referrer-policy",
      title: "Referrer-Policy",
      severity: "low",
      rec: "Ajoutez Referrer-Policy: strict-origin-when-cross-origin.",
    },
    {
      id: "permpol",
      header: "permissions-policy",
      title: "Permissions-Policy",
      severity: "low",
      rec: "Restreignez les API navigateur via Permissions-Policy.",
    },
  ];
  for (const c of headerChecks) {
    const present = Boolean(get(c.header)) || (c.id === "xfo" && /frame-ancestors/i.test(csp));
    add({
      id: c.id,
      category: "En-têtes",
      title: present ? `${c.title} présent` : `${c.title} absent`,
      severity: present ? "info" : c.severity,
      state: present ? "pass" : "fail",
      detail: present ? get(c.header) || "Couvert par la CSP." : "En-tête non défini.",
      recommendation: present ? undefined : c.rec,
    });
  }

  // 5b. Isolation cross-origine (COOP / CORP) — durcissement contre les XS-Leaks / Spectre.
  //     Dérivé de la méthodologie « en-têtes de sécurité » (reverse-skill / web-attack-cheatsheet).
  for (const c of [
    {
      id: "coop",
      header: "cross-origin-opener-policy",
      title: "Cross-Origin-Opener-Policy",
    },
    {
      id: "corp",
      header: "cross-origin-resource-policy",
      title: "Cross-Origin-Resource-Policy",
    },
  ]) {
    const present = Boolean(get(c.header));
    add({
      id: c.id,
      category: "En-têtes",
      title: present ? `${c.title} présent` : `${c.title} absent`,
      severity: present ? "info" : "low",
      state: present ? "pass" : "warn",
      detail: present
        ? `${c.title}: ${get(c.header)}`
        : "En-tête d'isolation cross-origine non défini.",
      recommendation: present
        ? undefined
        : `Ajoutez ${c.title} pour limiter les fuites d'information cross-origine (XS-Leaks).`,
    });
  }

  // 6. Cookies
  const cookies = (h as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
  if (cookies.length) {
    const insecure = cookies.filter(
      (c) => !/;\s*secure/i.test(c) || !/;\s*httponly/i.test(c)
    );
    add(
      insecure.length
        ? {
            id: "cookies",
            category: "Cookies",
            title: "Cookies sans attributs de sécurité",
            severity: "medium",
            state: "fail",
            detail: `${insecure.length}/${cookies.length} cookie(s) sans Secure/HttpOnly.`,
            recommendation:
              "Ajoutez les attributs Secure, HttpOnly et SameSite à tous les cookies.",
          }
        : {
            id: "cookies",
            category: "Cookies",
            title: "Cookies correctement sécurisés",
            severity: "info",
            state: "pass",
            detail: `${cookies.length} cookie(s), tous avec Secure + HttpOnly.`,
          }
    );
  }

  // 7. Fuite d'information serveur
  const server = get("server");
  const powered = get("x-powered-by");
  if (server || powered) {
    const versioned = /\d/.test(server) || /\d/.test(powered);
    add({
      id: "server-leak",
      category: "Divulgation",
      title: versioned ? "Version logicielle divulguée" : "Bannière serveur exposée",
      severity: versioned ? "low" : "info",
      state: versioned ? "warn" : "info",
      detail: [server && `Server: ${server}`, powered && `X-Powered-By: ${powered}`]
        .filter(Boolean)
        .join(" · "),
      recommendation: versioned
        ? "Masquez les numéros de version des en-têtes Server / X-Powered-By."
        : undefined,
    });
  }

  // 8. CORS permissif
  const acao = get("access-control-allow-origin");
  if (acao === "*") {
    add({
      id: "cors",
      category: "En-têtes",
      title: "CORS totalement ouvert",
      severity: "medium",
      state: "warn",
      detail: "Access-Control-Allow-Origin: * autorise toutes les origines.",
      recommendation:
        "Restreignez Access-Control-Allow-Origin à une liste d'origines de confiance.",
    });
  }

  // 8f. Réflexion d'origine CORS (test passif : une requête GET avec un en-tête Origin forgé).
  //     Dérivé de la méthodologie api-security (reverse-skill). Non intrusif : même URL déjà scannée.
  try {
    const probeOrigin = "https://sentinel-cors-probe.example";
    const r = await fetchSafe(finalUrl, {
      redirect: "manual",
      timeoutMs: 8000,
      headers: { origin: probeOrigin },
    });
    const reflected = r?.headers.get("access-control-allow-origin") || "";
    const creds = /true/i.test(r?.headers.get("access-control-allow-credentials") || "");
    if (reflected === probeOrigin) {
      add({
        id: "cors-reflection",
        category: "En-têtes",
        title: creds
          ? "CORS reflète toute origine avec Allow-Credentials"
          : "CORS reflète l'origine de la requête",
        severity: creds ? "high" : "medium",
        state: creds ? "fail" : "warn",
        detail: creds
          ? `L'origine arbitraire ${probeOrigin} est reflétée dans Access-Control-Allow-Origin avec ` +
            "Access-Control-Allow-Credentials: true — une page malveillante peut lire les réponses authentifiées."
          : `L'origine arbitraire ${probeOrigin} est reflétée dans Access-Control-Allow-Origin.`,
        recommendation:
          "Validez l'en-tête Origin contre une liste blanche stricte ; ne reflétez jamais Origin " +
          "dynamiquement, en particulier avec Allow-Credentials.",
      });
    }
  } catch {
    /* la sonde CORS est best-effort */
  }

  // 8b. Cookies SameSite
  if (cookies.length) {
    const noSameSite = cookies.filter((c) => !/;\s*samesite/i.test(c));
    if (noSameSite.length) {
      add({
        id: "cookies-samesite",
        category: "Cookies",
        title: "Cookies sans attribut SameSite",
        severity: "low",
        state: "warn",
        detail: `${noSameSite.length}/${cookies.length} cookie(s) sans SameSite (risque CSRF).`,
        recommendation: "Ajoutez SameSite=Lax ou Strict à vos cookies.",
      });
    }
  }

  // 8c. Cache-Control
  const cacheControl = get("cache-control");
  add(
    cacheControl
      ? {
          id: "cache-control",
          category: "En-têtes",
          title: "Cache-Control défini",
          severity: "info",
          state: "pass",
          detail: `Cache-Control: ${cacheControl}`,
        }
      : {
          id: "cache-control",
          category: "En-têtes",
          title: "Cache-Control absent",
          severity: "low",
          state: "warn",
          detail: "Aucune directive Cache-Control sur la réponse principale.",
          recommendation:
            "Définissez Cache-Control explicitement, surtout sur les pages authentifiées (no-store).",
        }
  );

  // 8d. Détection de technologie (informatif)
  const generator = get("x-generator");
  const techBits: string[] = [];
  if (server) techBits.push(server);
  if (powered) techBits.push(powered);
  if (generator) techBits.push(generator);
  if (/wp-|wordpress/i.test(get("link")) || /wordpress/i.test(generator))
    techBits.push("WordPress");
  if (get("x-vercel-id")) techBits.push("Vercel");
  if (get("x-nextjs-cache") || /next\.js/i.test(powered)) techBits.push("Next.js");
  if (techBits.length) {
    add({
      id: "tech",
      category: "Reconnaissance",
      title: "Technologies détectées",
      severity: "info",
      state: "info",
      detail: `Empreinte : ${[...new Set(techBits)].join(", ")}.`,
      recommendation:
        "Vérifiez que ces composants sont à jour et que leurs versions ne sont pas exposées.",
    });
  }

  // 8e. Corrélation CVE (advisory) sur les bannières versionnées détectées
  try {
    const { parseBanners, correlateCves } = await import("./cve");
    const components = parseBanners(server, powered, generator);
    if (components.length) {
      const correlated = await correlateCves(components);
      for (const { component, cves } of correlated) {
        const maxCvss = Math.max(...cves.map((c) => c.cvss ?? 0));
        const sev: Severity =
          maxCvss >= 9 ? "critical" : maxCvss >= 7 ? "high" : maxCvss >= 4 ? "medium" : "low";
        add({
          id: `cve-${component.product}-${component.version}`,
          category: "CVE",
          title: `${cves.length} CVE potentielle(s) — ${component.product} ${component.version}`,
          severity: sev,
          state: "warn",
          detail:
            `La version détectée (${component.product} ${component.version}) correspond à des ` +
            `CVE publiées (corrélation par bannière, à confirmer) : ` +
            cves.map((c) => c.id + (c.cvss ? ` [${c.cvss}]` : "")).join(", ") +
            ".",
          recommendation:
            "Mettez à jour le composant vers une version corrigée et masquez le numéro de version.",
          cves,
        });
      }
    }
  } catch {
    /* la corrélation CVE est best-effort (réseau/limite de débit) */
  }

  // 9. security.txt
  // WAF/CDN et CAPTCHA (informatif) — sur en-têtes, cookies et corps de la page.
  try {
    const { detectWafCaptcha } = await import("./wafdetect");
    for (const f of detectWafCaptcha(h, cookies, bodyText)) add(f);
  } catch {
    /* best-effort */
  }

  const origin = new URL(finalUrl).origin;
  const sec = await fetchSafe(`${origin}/.well-known/security.txt`, {
    timeoutMs: 6000,
  });
  add(
    sec && sec.status === 200
      ? {
          id: "securitytxt",
          category: "Bonnes pratiques",
          title: "security.txt présent",
          severity: "info",
          state: "pass",
          detail: "Un fichier /.well-known/security.txt est publié.",
        }
      : {
          id: "securitytxt",
          category: "Bonnes pratiques",
          title: "security.txt absent",
          severity: "low",
          state: "warn",
          detail: "Aucun canal de divulgation de vulnérabilités publié.",
          recommendation:
            "Publiez /.well-known/security.txt (RFC 9116) avec un contact sécurité.",
        }
  );

  // 10. Fichiers sensibles potentiellement exposés (GET passif, non destructif)
  const sensitive = [
    { path: "/.env", label: "Fichier .env" },
    { path: "/.git/config", label: "Dépôt .git" },
    { path: "/server-status", label: "Apache server-status" },
  ];
  const probes = await Promise.all(
    sensitive.map(async (s) => {
      const r = await fetchSafe(`${origin}${s.path}`, { timeoutMs: 6000 });
      const body =
        r && r.status === 200 ? (await r.text().catch(() => "")).slice(0, 200) : null;
      return { s, body };
    })
  );
  for (const { s, body } of probes) {
    if (body !== null) {
      const looksReal =
        s.path === "/.env"
          ? /=/.test(body) && !/<html/i.test(body)
          : s.path === "/.git/config"
            ? /\[core\]|repositoryformatversion/i.test(body)
            : /Server Version|Apache Status/i.test(body);
      if (looksReal) {
        add({
          id: `exposed${s.path}`,
          category: "Exposition",
          title: `${s.label} exposé publiquement`,
          severity: "critical",
          state: "fail",
          detail: `${s.path} renvoie un contenu sensible (HTTP 200).`,
          recommendation: `Bloquez l'accès public à ${s.path} au niveau du serveur web.`,
        });
      }
    }
  }

  // --- Contrôles approfondis (domaine vérifié) ---
  if (opts.deep) {
    try {
      const { deepChecks } = await import("./deepchecks");
      const extra = await deepChecks(new URL(finalUrl));
      for (const f of extra) add(f);
    } catch {
      /* les contrôles approfondis sont best-effort */
    }
    // Reconnaissance étendue : sous-domaines (CT), pages admin, formulaires
    try {
      const { reconChecks } = await import("./recon");
      const apex = new URL(finalUrl).hostname.split(".").slice(-2).join(".");
      const extra = await reconChecks(new URL(finalUrl), apex);
      for (const f of extra) add(f);
    } catch {
      /* la reconnaissance étendue est best-effort */
    }
    // Surface d'exposition : VCS, sauvegardes, Actuator, specs d'API, source maps
    try {
      const { exposureChecks } = await import("./exposure");
      const extra = await exposureChecks(new URL(finalUrl));
      for (const f of extra) add(f);
    } catch {
      /* l'analyse d'exposition est best-effort */
    }
  }

  // --- Scoring ---
  let score = 100;
  for (const f of findings) {
    if (f.state === "fail") score -= SEVERITY_WEIGHT[f.severity];
    else if (f.state === "warn") score -= Math.round(SEVERITY_WEIGHT[f.severity] / 2);
  }
  score = Math.max(0, Math.min(100, score));

  const counts: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
  for (const f of findings) if (f.state === "fail" || f.state === "warn") counts[f.severity]++;
  const passed = findings.filter((f) => f.state === "pass").length;

  // tri par gravité
  const order: Severity[] = ["critical", "high", "medium", "low", "info"];
  findings.sort(
    (a, b) =>
      order.indexOf(a.severity) - order.indexOf(b.severity) ||
      (a.state === "fail" ? -1 : 1)
  );

  return {
    targetUrl: target.toString(),
    grade: grade(score),
    score,
    summary: {
      finalUrl,
      httpStatus: res.status,
      https: isHttps,
      server: server || undefined,
      responseTimeMs,
      counts,
      passed,
      total: findings.length,
    },
    findings,
  };
}
