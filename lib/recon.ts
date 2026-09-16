import { parse } from "node-html-parser";
import type { Finding } from "./scanner";
import { safeFetch } from "./ssrf";

/**
 * Reconnaissance légère et non destructive, réservée aux domaines vérifiés (`deep`) :
 *  - énumération passive de sous-domaines via Certificate Transparency (crt.sh) — zéro paquet
 *    envoyé à la cible ;
 *  - détection de pages d'administration/login exposées (GET sur une courte liste de chemins) ;
 *  - analyse des formulaires (jeton CSRF, autocomplétion des champs mot de passe).
 *
 * Les probes de chemins sont du trafic GET (jamais de soumission) sur l'origine DÉJÀ validée
 * anti-SSRF par l'appelant. Les sous-domaines découverts sont seulement listés, jamais sondés.
 */

const UA =
  "SentinelByKayzen/1.0 (+https://sentinel.kayzen-lyon.com; passive security posture scan)";

async function fetchWithTimeout(
  url: string,
  opts: RequestInit & { timeoutMs?: number } = {}
): Promise<Response | null> {
  // Suivi de redirections durci anti-SSRF (cf. lib/ssrf.ts) : un propriétaire de domaine vérifié
  // ne peut pas faire rebondir le scan vers une adresse interne via une redirection.
  return safeFetch(url, {
    timeoutMs: 8000,
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

// --- 1. Énumération passive de sous-domaines (Certificate Transparency) -------------------

type CrtEntry = { name_value?: string; common_name?: string };

/** Interroge crt.sh (logs CT publics) et renvoie la liste dédupliquée des sous-domaines. */
export async function enumerateSubdomains(apex: string): Promise<string[]> {
  const url = `https://crt.sh/?q=%25.${encodeURIComponent(apex)}&output=json`;
  // crt.sh est souvent lent / instable : timeout large + un retry.
  let res = await fetchWithTimeout(url, { timeoutMs: 25000 });
  if (!res || !res.ok) res = await fetchWithTimeout(url, { timeoutMs: 25000 });
  if (!res || !res.ok) return [];

  let entries: CrtEntry[];
  try {
    entries = JSON.parse(await res.text()) as CrtEntry[];
  } catch {
    return []; // corps malformé sous charge → on abandonne proprement
  }

  const set = new Set<string>();
  for (const e of entries) {
    const names = `${e.name_value ?? ""}\n${e.common_name ?? ""}`.split("\n");
    for (const n of names) {
      const host = n.trim().toLowerCase().replace(/^\*\./, "");
      if (host && host.endsWith(apex) && /^[a-z0-9.-]+$/.test(host)) set.add(host);
    }
  }
  return [...set].sort();
}

async function subdomainFinding(apex: string): Promise<Finding | null> {
  const subs = await enumerateSubdomains(apex);
  if (!subs.length) return null;
  const sample = subs.slice(0, 12).join(", ");
  return {
    id: "recon-subdomains",
    category: "Reconnaissance",
    title: `${subs.length} sous-domaine(s) exposé(s) (Certificate Transparency)`,
    severity: subs.length > 25 ? "medium" : "low",
    state: "warn",
    detail:
      `Surface d'attaque visible dans les logs CT publics : ${sample}` +
      (subs.length > 12 ? ` … (+${subs.length - 12})` : "") +
      ".",
    recommendation:
      "Passez en revue chaque sous-domaine : retirez les environnements de test/staging exposés, " +
      "et vérifiez l'absence de sous-domaines orphelins (risque de subdomain takeover).",
  };
}

// --- 2. Détection de pages admin/login + analyse de formulaires --------------------------

const ADMIN_PATHS = [
  "/admin",
  "/administrator",
  "/login",
  "/wp-admin",
  "/wp-login.php",
  "/admin/login",
  "/user/login",
  "/users/sign_in",
  "/account/login",
  "/signin",
  "/auth/login",
  "/admin.php",
  "/cpanel",
  "/phpmyadmin",
  "/manager/html",
  "/admin/index.php",
  "/api/login",
] as const;

type FormIssue = { csrf: boolean; weakAutocomplete: boolean; hasPassword: boolean };

/** Analyse le HTML : présence d'un formulaire de login, jeton CSRF, autocomplétion. */
export function analyzeForms(html: string): FormIssue {
  let csrf = false;
  let weakAutocomplete = false;
  let hasPassword = false;
  try {
    const root = parse(html);
    for (const form of root.querySelectorAll("form")) {
      const inputs = form.querySelectorAll("input");
      const pw = inputs.filter(
        (i) => (i.getAttribute("type") || "").toLowerCase() === "password"
      );
      if (!pw.length) continue;
      hasPassword = true;
      const formCsrf = inputs.some((i) => {
        const type = (i.getAttribute("type") || "").toLowerCase();
        const name = (i.getAttribute("name") || "").toLowerCase();
        return type === "hidden" && /csrf|token|authenticity|_token|nonce|xsrf/.test(name);
      });
      if (formCsrf) csrf = true;
      const weak = pw.some((i) => {
        const ac = (i.getAttribute("autocomplete") || "").toLowerCase();
        return ac !== "off" && ac !== "new-password" && ac !== "current-password";
      });
      if (weak) weakAutocomplete = true;
    }
  } catch {
    /* parsing best-effort */
  }
  return { csrf, weakAutocomplete, hasPassword };
}

async function probeAdminPaths(origin: string): Promise<Finding[]> {
  const found: { path: string; status: number }[] = [];
  const formIssues: FormIssue = { csrf: true, weakAutocomplete: false, hasPassword: false };

  await mapLimit([...ADMIN_PATHS], 5, async (path) => {
    const r = await fetchWithTimeout(`${origin}${path}`, {
      redirect: "follow",
      timeoutMs: 6000,
    });
    if (!r) return;
    if (r.status === 200 || r.status === 401 || r.status === 403) {
      found.push({ path, status: r.status });
      const ct = r.headers.get("content-type") || "";
      if (r.status === 200 && /text\/html/i.test(ct)) {
        const body = (await r.text().catch(() => "")).slice(0, 120_000);
        const issue = analyzeForms(body);
        if (issue.hasPassword) {
          formIssues.hasPassword = true;
          if (!issue.csrf) formIssues.csrf = false; // au moins un formulaire sans CSRF
          if (issue.weakAutocomplete) formIssues.weakAutocomplete = true;
        }
      }
    }
  });

  const out: Finding[] = [];
  if (found.length) {
    out.push({
      id: "recon-admin",
      category: "Exposition",
      title: `${found.length} interface(s) d'administration/login accessibles`,
      severity: "low",
      state: "warn",
      detail:
        "Chemins sensibles répondant : " +
        found.map((f) => `${f.path} (${f.status})`).join(", ") +
        ".",
      recommendation:
        "Restreignez l'accès aux interfaces d'administration (VPN, filtrage IP, MFA) et " +
        "évitez les chemins par défaut prévisibles.",
    });
  }
  if (formIssues.hasPassword && !formIssues.csrf) {
    out.push({
      id: "recon-form-csrf",
      category: "Formulaires",
      title: "Formulaire d'authentification sans jeton anti-CSRF",
      severity: "medium",
      state: "warn",
      detail:
        "Un formulaire contenant un champ mot de passe ne présente pas de jeton CSRF caché détectable.",
      recommendation:
        "Ajoutez un jeton anti-CSRF (synchronizer token) à tous les formulaires POST authentifiés.",
    });
  }
  if (formIssues.weakAutocomplete) {
    out.push({
      id: "recon-form-autocomplete",
      category: "Formulaires",
      title: "Champ mot de passe avec autocomplétion permissive",
      severity: "low",
      state: "warn",
      detail:
        "Un champ mot de passe n'utilise pas autocomplete=off / new-password / current-password.",
      recommendation:
        "Positionnez explicitement l'attribut autocomplete sur les champs sensibles.",
    });
  }
  return out;
}

/** Reconnaissance approfondie (domaine vérifié) : sous-domaines + admin + formulaires. */
export async function reconChecks(target: URL, apex: string): Promise<Finding[]> {
  const out: Finding[] = [];
  const [sub, admin] = await Promise.all([
    subdomainFinding(apex).catch(() => null),
    probeAdminPaths(target.origin).catch(() => [] as Finding[]),
  ]);
  if (sub) out.push(sub);
  out.push(...admin);
  return out;
}
