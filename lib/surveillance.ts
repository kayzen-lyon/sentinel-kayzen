import type { ScanResult } from "./scanner";
import type { TlsVersion } from "./insights/types";
import { diffFindings } from "./scanDiff";

/**
 * Surveillance de surface d'attaque (module pur, sans accès réseau ni base) :
 * - construireInstantane() : ce que le scan a RÉELLEMENT mesuré, rien d'autre. Une donnée
 *   non mesurée est absente de l'instantané, avec sa raison dans `absents` ;
 * - comparer(avant, apres) : changements entre deux instantanés, en phrases françaises ;
 * - ajouterAuJournal() : journal des changements, plafonné (300 entrées par cible).
 */

export type Gravite = "critique" | "important" | "info";

export type Categorie =
  | "en-tetes"
  | "certificat"
  | "tls"
  | "domaine"
  | "sous-domaines"
  | "routes"
  | "problemes"
  | "score";

export const CATEGORIE_LABELS: Record<Categorie, string> = {
  "en-tetes": "En-têtes",
  certificat: "Certificat",
  tls: "Protocoles TLS",
  domaine: "Nom de domaine",
  "sous-domaines": "Sous-domaines",
  routes: "Routes exposées",
  problemes: "Problèmes",
  score: "Score",
};

export type Changement = {
  date: string;
  gravite: Gravite;
  categorie: Categorie;
  message: string;
};

/** Champs d'un instantané pouvant être absents (non mesurés). */
export type ChampMesure = "enTetes" | "certificat" | "tls" | "domaine" | "sousDomaines" | "routes";

export type ProblemeMesure = { id: string; title: string; severity: string; state: string };

export type Instantane = {
  date: string;
  score: number;
  /** En-têtes de sécurité envoyés par la page (nom en minuscules → valeur). */
  enTetes?: Record<string, string>;
  certificat?: { emetteur?: string; joursRestants?: number; expireLe?: string };
  /** Protocoles TLS testés : true = accepté, false = refusé. */
  tls?: Partial<Record<TlsVersion, boolean>>;
  /** Expiration du nom de domaine (RDAP). */
  domaine?: { joursRestants: number; expireLe?: string };
  sousDomaines?: string[];
  routes?: string[];
  /** Contrôles en échec ou en alerte (gravité moyenne et plus). */
  problemes: ProblemeMesure[];
  /** Raison de chaque donnée absente. */
  absents: Partial<Record<ChampMesure, string>>;
};

export const JOURNAL_MAX = 300;

/** En-têtes de sécurité suivis (noms en minuscules). */
export const EN_TETES_SECURITE: Record<string, string> = {
  "content-security-policy": "Content-Security-Policy",
  "strict-transport-security": "Strict-Transport-Security",
  "x-frame-options": "X-Frame-Options",
  "x-content-type-options": "X-Content-Type-Options",
  "referrer-policy": "Referrer-Policy",
  "permissions-policy": "Permissions-Policy",
  "cross-origin-opener-policy": "Cross-Origin-Opener-Policy",
  "cross-origin-resource-policy": "Cross-Origin-Resource-Policy",
  "cross-origin-embedder-policy": "Cross-Origin-Embedder-Policy",
};
/** En-têtes dont le retrait est « important » (les autres : « info »). */
const EN_TETES_MAJEURS = new Set(["content-security-policy", "strict-transport-security"]);

const LIBELLE_TLS: Record<TlsVersion, string> = {
  TLSv1: "TLS 1.0",
  "TLSv1.1": "TLS 1.1",
  "TLSv1.2": "TLS 1.2",
  "TLSv1.3": "TLS 1.3",
};
const TLS_OBSOLETES: TlsVersion[] = ["TLSv1", "TLSv1.1"];

const LISTE_MAX = 200;

/**
 * Instantané d'un scan. `sousDomaines` : liste énumérée (contrôles approfondis), ou null si
 * non mesurée ; `raisonSousDomaines` explique pourquoi elle manque.
 */
export function construireInstantane(
  result: ScanResult,
  opts: { date: string; sousDomaines?: string[] | null; raisonSousDomaines?: string; profond: boolean }
): Instantane {
  const i = result.insights;
  const absents: Instantane["absents"] = {};
  const snap: Instantane = {
    date: opts.date,
    score: result.score,
    problemes: result.findings
      .filter(
        (f) =>
          (f.state === "fail" || f.state === "warn") &&
          (f.severity === "critical" || f.severity === "high" || f.severity === "medium")
      )
      .map((f) => ({ id: f.id, title: f.title, severity: f.severity, state: f.state })),
    absents,
  };

  if (i?.headers) {
    const h: Record<string, string> = {};
    for (const [k, v] of i.headers) if (k in EN_TETES_SECURITE) h[k] = v;
    snap.enTetes = h;
  } else absents.enTetes = "Analyse des en-têtes indisponible pour ce passage.";

  if (!result.summary.https) {
    absents.certificat = "Le site n'est pas servi en HTTPS.";
    absents.tls = "Le site n'est pas servi en HTTPS.";
  } else if (!i?.tls) {
    absents.certificat = "Analyse TLS indisponible (délai dépassé ou erreur).";
    absents.tls = "Analyse TLS indisponible (délai dépassé ou erreur).";
  } else {
    const c = i.tls.cert;
    if (c) snap.certificat = { emetteur: c.issuer, joursRestants: c.daysRemaining, expireLe: c.validTo };
    else absents.certificat = "Certificat non lu lors de l'analyse TLS.";
    const versions = Object.entries(i.tls.protocols).filter(([, v]) => typeof v === "boolean");
    if (versions.length) snap.tls = Object.fromEntries(versions);
    else absents.tls = "Protocoles TLS non testés.";
  }

  if (i?.domain?.daysToExpiry !== undefined)
    snap.domaine = { joursRestants: i.domain.daysToExpiry, expireLe: i.domain.expires };
  else absents.domaine = "Le registre (RDAP) n'a pas fourni de date d'expiration.";

  if (!opts.profond) {
    absents.sousDomaines = "Réservé aux domaines vérifiés (contrôles approfondis).";
    absents.routes = "Réservé aux domaines vérifiés (contrôles approfondis).";
  } else {
    if (opts.sousDomaines && opts.sousDomaines.length)
      snap.sousDomaines = [...new Set(opts.sousDomaines)].sort().slice(0, LISTE_MAX);
    else absents.sousDomaines = opts.raisonSousDomaines || "Aucune source publique n'a renvoyé de sous-domaine.";
    const surface = result.findings.find((f) => f.id === "attack-surface")?.surface;
    if (surface?.length) snap.routes = [...new Set(surface.map((s) => s.path))].sort().slice(0, LISTE_MAX);
    else absents.routes = "Aucune carte de surface produite lors de ce passage.";
  }
  return snap;
}

/** Palier d'échéance : 2 = moins de 7 jours, 1 = moins de 30 jours, 0 = au-delà. */
function palier(jours: number): number {
  return jours < 7 ? 2 : jours < 30 ? 1 : 0;
}

function jours(n: number): string {
  if (n < 0) return `depuis ${-n} jour${n < -1 ? "s" : ""}`;
  return `dans ${n} jour${n > 1 ? "s" : ""}`;
}

/** Échéance (certificat ou domaine) : alerte seulement quand on entre dans un palier plus grave. */
function echeance(
  out: Changement[],
  date: string,
  categorie: "certificat" | "domaine",
  sujet: string,
  avant: number | undefined,
  apres: number | undefined
) {
  if (apres === undefined) return;
  const p = palier(apres);
  if (p === 0 || (avant !== undefined && palier(avant) >= p)) return;
  out.push({
    date,
    gravite: p === 2 ? "critique" : "important",
    categorie,
    message: apres < 0 ? `${sujet} a expiré (${jours(apres)})` : `${sujet} expire ${jours(apres)}`,
  });
}

const maxAge = (hsts: string) => {
  const m = /max-age\s*=\s*"?(\d+)/i.exec(hsts);
  return m ? Number(m[1]) : 0;
};
const SIX_MOIS = 15552000;
const MOTS_CSP_RISQUES = ["'unsafe-inline'", "'unsafe-eval'", "data:", "*"];

function motsCsp(csp: string): Set<string> {
  const out = new Set<string>();
  for (const d of csp.split(";")) {
    const [nom, ...valeurs] = d.trim().toLowerCase().split(/\s+/);
    if (nom === "script-src" || nom === "default-src") for (const v of valeurs) out.add(v);
  }
  return out;
}

function comparerEnTetes(out: Changement[], date: string, avant: Record<string, string>, apres: Record<string, string>) {
  for (const [cle, nom] of Object.entries(EN_TETES_SECURITE)) {
    const a = avant[cle];
    const b = apres[cle];
    if (a === b) continue;
    if (a !== undefined && b === undefined) {
      out.push({
        date,
        gravite: EN_TETES_MAJEURS.has(cle) ? "important" : "info",
        categorie: "en-tetes",
        message: `L'en-tête ${nom} a été retiré`,
      });
    } else if (a === undefined) {
      out.push({ date, gravite: "info", categorie: "en-tetes", message: `L'en-tête ${nom} a été ajouté` });
    } else if (cle === "content-security-policy") {
      const avantMots = motsCsp(a);
      const ajoutes = [...motsCsp(b)].filter((m) => MOTS_CSP_RISQUES.includes(m) && !avantMots.has(m));
      out.push(
        ajoutes.length
          ? {
              date,
              gravite: "important",
              categorie: "en-tetes",
              message: `La Content-Security-Policy a été affaiblie : ${ajoutes.join(", ")} autorisé pour les scripts`,
            }
          : { date, gravite: "info", categorie: "en-tetes", message: "La Content-Security-Policy a été modifiée" }
      );
    } else if (cle === "strict-transport-security") {
      const ma = maxAge(a);
      const mb = maxAge(b);
      if (mb < ma)
        out.push({
          date,
          gravite: mb < SIX_MOIS ? "important" : "info",
          categorie: "en-tetes",
          message:
            mb === 0
              ? "Strict-Transport-Security a été désactivé (max-age=0)"
              : `La durée Strict-Transport-Security a été réduite : ${ma} → ${mb} secondes`,
        });
      else if (/includesubdomains/i.test(a) && !/includesubdomains/i.test(b))
        out.push({
          date,
          gravite: "info",
          categorie: "en-tetes",
          message: "Strict-Transport-Security ne couvre plus les sous-domaines (includeSubDomains retiré)",
        });
      else out.push({ date, gravite: "info", categorie: "en-tetes", message: "L'en-tête Strict-Transport-Security a été modifié" });
    } else {
      out.push({ date, gravite: "info", categorie: "en-tetes", message: `L'en-tête ${nom} a changé : « ${a} » → « ${b} »` });
    }
  }
}

function comparerListe(
  out: Changement[],
  date: string,
  categorie: "sous-domaines" | "routes",
  avant: string[],
  apres: string[],
  libelles: { nouveau: string; nouveaux: string; retire: string; retires: string },
  graviteNouveau: Gravite
) {
  const a = new Set(avant);
  const b = new Set(apres);
  const ajoutes = apres.filter((x) => !a.has(x));
  const retires = avant.filter((x) => !b.has(x));
  const resume = (l: string[]) => l.slice(0, 10).join(", ") + (l.length > 10 ? ` (+${l.length - 10})` : "");
  if (ajoutes.length)
    out.push({
      date,
      gravite: graviteNouveau,
      categorie,
      message: ajoutes.length === 1 ? `${libelles.nouveau} : ${ajoutes[0]}` : `${ajoutes.length} ${libelles.nouveaux} : ${resume(ajoutes)}`,
    });
  if (retires.length)
    out.push({
      date,
      gravite: "info",
      categorie,
      message: retires.length === 1 ? `${libelles.retire} : ${retires[0]}` : `${retires.length} ${libelles.retires} : ${resume(retires)}`,
    });
}

const SEUIL_SCORE = 10;

/**
 * Changements entre deux instantanés de la même cible (le plus grave d'abord).
 * Une donnée absente d'un côté n'est jamais comparée (pas de faux « retrait »).
 * Sans instantané précédent, seules les échéances proches (certificat, domaine) sont signalées.
 */
export function comparer(avant: Instantane | null, apres: Instantane): Changement[] {
  const out: Changement[] = [];
  const date = apres.date;

  echeance(out, date, "certificat", "Le certificat", avant?.certificat?.joursRestants, apres.certificat?.joursRestants);
  echeance(out, date, "domaine", "Le nom de domaine", avant?.domaine?.joursRestants, apres.domaine?.joursRestants);
  if (!avant) return out;

  if (avant.score - apres.score >= SEUIL_SCORE)
    out.push({
      date,
      gravite: "important",
      categorie: "score",
      message: `Le score de sécurité a baissé : ${avant.score} → ${apres.score}/100`,
    });

  if (avant.enTetes && apres.enTetes) comparerEnTetes(out, date, avant.enTetes, apres.enTetes);

  const ca = avant.certificat;
  const cb = apres.certificat;
  if (ca && cb) {
    if (ca.emetteur && cb.emetteur && ca.emetteur !== cb.emetteur)
      out.push({
        date,
        gravite: "info",
        categorie: "certificat",
        message: `L'émetteur du certificat a changé : ${ca.emetteur} → ${cb.emetteur}`,
      });
    if (ca.joursRestants !== undefined && cb.joursRestants !== undefined && cb.joursRestants > ca.joursRestants + 1)
      out.push({
        date,
        gravite: "info",
        categorie: "certificat",
        message: `Le certificat a été renouvelé : il expire ${jours(cb.joursRestants)}`,
      });
  }

  if (avant.tls && apres.tls) {
    for (const v of Object.keys(LIBELLE_TLS) as TlsVersion[]) {
      const a = avant.tls[v];
      const b = apres.tls[v];
      if (typeof a !== "boolean" || typeof b !== "boolean" || a === b) continue;
      const obsolete = TLS_OBSOLETES.includes(v);
      if (b)
        out.push({
          date,
          gravite: obsolete ? "important" : "info",
          categorie: "tls",
          message: obsolete
            ? `Le protocole obsolète ${LIBELLE_TLS[v]} est de nouveau accepté`
            : `${LIBELLE_TLS[v]} est désormais proposé`,
        });
      else
        // « info » : un test de protocole qui expire est aussi lu comme un refus.
        out.push({ date, gravite: "info", categorie: "tls", message: `${LIBELLE_TLS[v]} n'est plus accepté` });
    }
  }

  if (avant.sousDomaines && apres.sousDomaines)
    comparerListe(out, date, "sous-domaines", avant.sousDomaines, apres.sousDomaines, {
      nouveau: "Nouveau sous-domaine exposé",
      nouveaux: "nouveaux sous-domaines exposés",
      retire: "Sous-domaine disparu des sources publiques",
      retires: "sous-domaines disparus des sources publiques",
    }, "important");

  if (avant.routes && apres.routes)
    comparerListe(out, date, "routes", avant.routes, apres.routes, {
      nouveau: "Nouvelle route exposée",
      nouveaux: "nouvelles routes exposées",
      retire: "Route qui n'est plus exposée",
      retires: "routes qui ne sont plus exposées",
    }, "info");

  const diff = diffFindings(avant.problemes, apres.problemes);
  for (const f of diff.added)
    if (f.state === "fail" && (f.severity === "critical" || f.severity === "high"))
      out.push({
        date,
        gravite: f.severity === "critical" ? "critique" : "important",
        categorie: "problemes",
        message: `Nouveau problème ${f.severity === "critical" ? "critique" : "élevé"} : ${f.title}`,
      });
  for (const f of diff.fixed)
    out.push({ date, gravite: "info", categorie: "problemes", message: `Problème corrigé : ${f.title}` });

  const ordre: Record<Gravite, number> = { critique: 0, important: 1, info: 2 };
  return out.sort((x, y) => ordre[x.gravite] - ordre[y.gravite]);
}

/** Ajoute les changements en tête du journal (le plus récent d'abord) et le plafonne. */
export function ajouterAuJournal(journal: Changement[], nouveaux: Changement[], max = JOURNAL_MAX): Changement[] {
  return [...nouveaux, ...journal].slice(0, max);
}

/** Changements qui justifient une notification (important ou critique). */
export function aNotifier(changements: Changement[]): Changement[] {
  return changements.filter((c) => c.gravite !== "info");
}
