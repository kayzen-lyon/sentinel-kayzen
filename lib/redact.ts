/**
 * Masquage des secrets dans les textes produits par Sentinel (rapports, findings, exports,
 * journaux d'audit, notifications). Module pur, sans réseau ni dépendance : utilisable côté
 * serveur comme côté client.
 *
 * Chaque secret reconnu est remplacé par ses 4 premiers caractères suivis de `…[masqué]`
 * (ou par `…[masqué]` seul s'il est trop court pour en montrer une partie sans le divulguer).
 * Le masquage est idempotent : repasser un texte déjà masqué ne change rien.
 *
 * Couvre : clés AWS, jetons GitHub / Stripe / Slack, JWT, clés privées PEM, mots de passe
 * dans une URL (user:pass@) ou en paramètre, en-têtes Authorization / Cookie / clé d'API,
 * chaînes de connexion (URL ou `Password=…;`).
 */

export const MASK = "…[masqué]";

/** Masque une valeur secrète : 4 premiers caractères + `…[masqué]`. */
export function maskSecret(value: string): string {
  if (value.includes("[masqué]")) return value;
  return value.length > 8 ? value.slice(0, 4) + MASK : MASK;
}

type Rule = { re: RegExp; replace: (...m: string[]) => string };

/** Masque le dernier groupe capturé, en conservant ce qui le précède dans la correspondance. */
const maskLastGroup =
  () =>
  (...m: string[]): string => {
    const prefix = m[1] ?? "";
    const secret = m[2] ?? "";
    return prefix + maskSecret(secret);
  };

const RULES: Rule[] = [
  // Clés privées PEM : en-tête conservé, corps masqué (bloc complet ou tronqué).
  {
    re: /(-----BEGIN ([A-Z0-9 ]{0,30})PRIVATE KEY-----)[\s\S]*?(?:-----END \2PRIVATE KEY-----|$)/g,
    replace: (_all, header, kind) => `${header}\n${MASK}\n-----END ${kind}PRIVATE KEY-----`,
  },
  // Identifiants dans une URL / chaîne de connexion : scheme://user:motdepasse@hôte
  // (longueurs bornées : pas de coût quadratique sur un très long texte).
  {
    re: /(\b[a-z][a-z0-9+.-]{0,30}:\/\/[^\s/:@"'<>]{1,256}:)([^\s@/"'<>]{1,256})(?=@)/gi,
    replace: maskLastGroup(),
  },
  // En-têtes HTTP sensibles : en début de ligne (requête/réponse brute) ou juste après un
  // guillemet (curl -H 'Authorization: …').
  {
    re: /((?:^|["'])[ \t]*(?:authorization|proxy-authorization)[ \t]*:[ \t]*(?:bearer |basic |token |digest |negotiate |ntlm )?)([^\s"']+)/gim,
    replace: maskLastGroup(),
  },
  {
    re: /((?:^|["'])[ \t]*(?:x-api-key|x-auth-token|api-key)[ \t]*:[ \t]*)([^\s"']+)/gim,
    replace: maskLastGroup(),
  },
  // Cookie : toutes les valeurs ; Set-Cookie : la seule valeur (les attributs restent lisibles).
  {
    re: /((?:^|["'])[ \t]*cookie[ \t]*:[ \t]*)([^\r\n"']+)/gim,
    replace: (_all, prefix, cookies) =>
      prefix +
      cookies.replace(/([^=;\s]+=)([^;\r\n]*)/g, (_c: string, name: string, val: string) =>
        val ? name + maskSecret(val) : name + val
      ),
  },
  {
    re: /((?:^|["'])[ \t]*set-cookie[ \t]*:[ \t]*[^=;\s]+=)([^;\r\n"']+)/gim,
    replace: maskLastGroup(),
  },
  // Même chose sous forme JSON : "authorization": "Bearer …", "cookie": "…"
  {
    re: /(["'](?:authorization|proxy-authorization|cookie|set-cookie|x-api-key)["']\s*:\s*["'](?:bearer |basic |token )?)([^"']+)/gi,
    replace: maskLastGroup(),
  },
  // Mot de passe ou jeton en clé=valeur (paramètre d'URL, corps de formulaire, chaîne ADO/JDBC).
  {
    re: /(\b(?:password|passwd|pwd|pass|secret|client_secret|api_key|apikey|access_token|auth_token)=)([^&;"'\s<>]+)/gi,
    replace: maskLastGroup(),
  },
  // Clé secrète AWS associée à son nom de variable.
  {
    re: /(\baws_secret_access_key["']?\s*[:=]\s*["']?)([A-Za-z0-9/+=]{40})/gi,
    replace: maskLastGroup(),
  },
  // Jetons reconnaissables à leur forme.
  { re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g, replace: (t) => maskSecret(t) },
  { re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g, replace: (t) => maskSecret(t) },
  { re: /\bgithub_pat_[A-Za-z0-9_]{22,}\b/g, replace: (t) => maskSecret(t) },
  { re: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g, replace: (t) => maskSecret(t) },
  { re: /\bwhsec_[A-Za-z0-9]{24,}\b/g, replace: (t) => maskSecret(t) },
  { re: /\bxox[abposr]-[A-Za-z0-9-]{10,}/g, replace: (t) => maskSecret(t) },
  {
    re: /(https:\/\/hooks\.slack\.com\/services\/)([A-Za-z0-9/_-]+)/g,
    replace: maskLastGroup(),
  },
  {
    re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]*/g,
    replace: (t) => maskSecret(t),
  },
];

/** Masque les secrets reconnus dans un texte. Fonction pure. */
export function redactSecrets(text: string): string;
export function redactSecrets(text: string | null | undefined): string | null | undefined;
export function redactSecrets(text: string | null | undefined): string | null | undefined {
  if (!text) return text;
  let out = text;
  for (const r of RULES) out = out.replace(r.re, r.replace as (...a: string[]) => string);
  return out;
}

function isPlainObject(v: object): boolean {
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

/** Masque les secrets dans toutes les chaînes d'une valeur JSON (objets et tableaux). */
export function redactDeep<T>(value: T): T {
  if (typeof value === "string") return redactSecrets(value) as T;
  if (Array.isArray(value)) return value.map((v) => redactDeep(v)) as T;
  // Objets « simples » seulement (JSON) : une Date ou une instance de classe est laissée intacte.
  if (value && typeof value === "object" && isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = redactDeep(v);
    return out as T;
  }
  return value;
}
