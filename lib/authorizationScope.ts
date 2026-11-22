/**
 * Règles pures de couverture d'une autorisation écrite de pentest (sans base ni réseau :
 * utilisables côté serveur, côté client et dans les tests).
 *
 * Une autorisation couvre un hôte si :
 * - elle n'est pas révoquée ;
 * - l'instant présent est dans [début, fin[ ;
 * - l'hôte est exactement celui autorisé, ou — si les sous-domaines sont inclus — un
 *   sous-domaine de celui-ci (« api.exemple.fr » pour « exemple.fr », jamais « exemple.fr.evil.com »
 *   ni « monexemple.fr »). « www. » n'est pas implicite : c'est un sous-domaine comme un autre.
 */

export type AuthorizationScope = {
  host: string;
  include_subdomains: boolean;
  starts_at: string | Date;
  ends_at: string | Date;
  revoked_at: string | Date | null;
};

export type AuthorizationStatus = "active" | "upcoming" | "expired" | "revoked";

/** Normalise un hôte saisi (URL, « *.domaine », point final, port) ; null si invalide. */
export function normalizeScopeHost(input: string): { host: string; wildcard: boolean } | null {
  let host = (input || "").trim().toLowerCase();
  if (!host) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//.test(host)) {
    try {
      host = new URL(host).hostname;
    } catch {
      return null;
    }
  }
  host = host.replace(/[/?#].*$/, "").replace(/:\d+$/, "").replace(/\.$/, "");
  const wildcard = host.startsWith("*.");
  if (wildcard) host = host.slice(2);
  if (host.length > 253) return null;
  // Validation label par label (pas de regex imbriquée : aucun risque de ReDoS).
  const labels = host.split(".");
  if (labels.length < 2 || !/^[a-z]{2,63}$/.test(labels[labels.length - 1])) return null;
  if (!labels.every((l) => /^[a-z0-9-]{1,63}$/.test(l) && !l.startsWith("-") && !l.endsWith("-")))
    return null;
  return { host, wildcard };
}

/** L'hôte `host` est-il dans le périmètre `scopeHost` ? */
export function hostInScope(scopeHost: string, includeSubdomains: boolean, host: string): boolean {
  const h = (host || "").trim().toLowerCase().replace(/\.$/, "");
  const s = (scopeHost || "").trim().toLowerCase().replace(/\.$/, "");
  if (!h || !s) return false;
  if (h === s) return true;
  return includeSubdomains && h.endsWith("." + s);
}

/** État d'une autorisation à l'instant `now`. */
export function authorizationStatus(a: AuthorizationScope, now: Date = new Date()): AuthorizationStatus {
  if (a.revoked_at) return "revoked";
  const t = now.getTime();
  if (t < new Date(a.starts_at).getTime()) return "upcoming";
  if (t >= new Date(a.ends_at).getTime()) return "expired";
  return "active";
}

/** L'autorisation `a` couvre-t-elle un pentest actif sur `host` à l'instant `now` ? */
export function authorizationCovers(a: AuthorizationScope, host: string, now: Date = new Date()): boolean {
  return authorizationStatus(a, now) === "active" && hostInScope(a.host, a.include_subdomains, host);
}

export type AuthorizationInput = {
  host: string;
  includeSubdomains: boolean;
  startsAt: Date;
  endsAt: Date;
  signerName: string;
  signerTitle: string;
  acceptedAt: Date;
};

function date(v: unknown): Date | null {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function text(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** Valide une saisie d'autorisation ; renvoie la valeur normalisée ou un message en français. */
export function parseAuthorizationInput(
  body: Record<string, unknown>,
  now: Date = new Date()
): { ok: true; value: AuthorizationInput } | { ok: false; error: string } {
  const scope = normalizeScopeHost(text(body.host, 300));
  if (!scope) return { ok: false, error: "Hôte ou périmètre invalide (ex. app.exemple.fr ou *.exemple.fr)." };
  const startsAt = date(body.startsAt);
  const endsAt = date(body.endsAt);
  const acceptedAt = date(body.acceptedAt);
  if (!startsAt || !endsAt) return { ok: false, error: "Dates de début et de fin requises." };
  if (endsAt.getTime() <= startsAt.getTime())
    return { ok: false, error: "La date de fin doit être postérieure à la date de début." };
  if (endsAt.getTime() <= now.getTime())
    return { ok: false, error: "Cette autorisation est déjà expirée." };
  if (!acceptedAt) return { ok: false, error: "Date d'acceptation (signature) requise." };
  if (acceptedAt.getTime() > now.getTime() + 5 * 60_000)
    return { ok: false, error: "La date d'acceptation ne peut pas être dans le futur." };
  const signerName = text(body.signerName, 200);
  const signerTitle = text(body.signerTitle, 200);
  if (!signerName || !signerTitle)
    return { ok: false, error: "Nom et fonction du signataire requis." };
  return {
    ok: true,
    value: {
      host: scope.host,
      includeSubdomains: scope.wildcard || body.includeSubdomains === true,
      startsAt,
      endsAt,
      signerName,
      signerTitle,
      acceptedAt,
    },
  };
}

/** Message de refus d'un pentest actif sans autorisation écrite en cours de validité. */
export function authorizationRequiredMessage(host: string): string {
  return (
    `Aucune autorisation écrite du client en cours de validité ne couvre ${host}. ` +
    "Enregistrez l'autorisation signée (périmètre, dates, signataire) dans l'onglet Domaines " +
    "avant de lancer un pentest actif."
  );
}
