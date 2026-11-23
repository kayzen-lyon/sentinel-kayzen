/**
 * Surveillance quotidienne de la surface d'attaque : instantané d'un hôte et comparaison de deux
 * passages. Fonctions PURES, testées dans tests/surface.test.ts.
 *
 * Une mesure qui n'a pas pu être faite vaut `null` : elle n'est jamais interprétée comme une
 * disparition (aucune donnée inventée).
 */

export type Gravite = "critique" | "important" | "info";

export type Instantane = {
  hote: string;
  date: string; // ISO
  /** Ports TCP ouverts parmi la liste contrôlée (périmètre autorisé seulement). */
  ports: number[] | null;
  tls: { protocoles: string[]; certExpire: string | null; emetteur: string | null } | null;
  domaineExpire: string | null | undefined; // undefined : mesure indisponible ; null : pas de date publiée
  sousDomaines: string[] | null;
  routes: string[] | null;
  /** En-têtes de sécurité de la page d'accueil (nom en minuscules → valeur, absent = clé absente). */
  entetes: Record<string, string> | null;
};

export type Changement = { date: string; gravite: Gravite; type: string; phrase: string };

/** Ports dont l'exposition sur Internet est presque toujours une erreur grave. */
export const PORTS_SENSIBLES: Record<number, string> = {
  21: "FTP",
  23: "Telnet",
  445: "SMB",
  1433: "SQL Server",
  2375: "API Docker",
  3306: "MySQL",
  3389: "Bureau à distance (RDP)",
  5432: "PostgreSQL",
  5900: "VNC",
  6379: "Redis",
  9200: "Elasticsearch",
  11211: "Memcached",
  27017: "MongoDB",
};
export const PORTS_CONTROLES = [21, 22, 23, 25, 80, 443, 445, 1433, 2375, 3000, 3306, 3389, 5432, 5900, 6379, 8000, 8080, 8443, 9200, 11211, 27017];

const ENTETES_SECURITE: Record<string, string> = {
  "strict-transport-security": "HSTS",
  "content-security-policy": "Content-Security-Policy",
  "x-frame-options": "X-Frame-Options",
  "x-content-type-options": "X-Content-Type-Options",
  "referrer-policy": "Referrer-Policy",
  "permissions-policy": "Permissions-Policy",
};

const ROUTE_SENSIBLE = /(^|\/)(admin|administrator|wp-admin|debug|actuator|graphql|\.git|\.env|backup|phpmyadmin|console|swagger|api-docs)(\/|$|\?)/i;

/** Jours entre deux dates ISO (arrondi vers le bas). */
export function joursAvant(echeance: string, depuis: string): number {
  return Math.floor((new Date(echeance).getTime() - new Date(depuis).getTime()) / 86_400_000);
}

function maxAge(hsts: string): number {
  return Number(/max-age=(\d+)/i.exec(hsts)?.[1] || 0);
}

/** Affaiblissement d'un en-tête présent des deux côtés (null si rien de notable). */
function affaiblissement(nom: string, avant: string, apres: string): string | null {
  if (nom === "strict-transport-security") {
    const a = maxAge(avant), b = maxAge(apres);
    if (b < a && b < 15_552_000) return `durée HSTS réduite (${a} s → ${b} s)`;
    if (/includesubdomains/i.test(avant) && !/includesubdomains/i.test(apres)) return "includeSubDomains retiré";
  }
  if (nom === "content-security-policy") {
    for (const jeton of ["'unsafe-inline'", "'unsafe-eval'", "*"]) {
      const present = (s: string) => (jeton === "*" ? /(^|[\s;])\*([\s;]|$)/.test(s) : s.includes(jeton));
      if (!present(avant) && present(apres)) return `${jeton} ajouté`;
    }
  }
  if (nom === "x-frame-options" && /deny/i.test(avant) && !/deny/i.test(apres)) return `DENY remplacé par ${apres}`;
  return null;
}

/** Seuils d'échéance franchis (certificat, domaine) : critique à 7 jours, important à 30. */
function echeance(quoi: string, date: string | null | undefined, maintenant: string, dejaSousSeuil: number | null): Changement | null {
  if (!date) return null;
  const j = joursAvant(date, maintenant);
  const seuil = j < 0 ? -1 : j <= 7 ? 7 : j <= 30 ? 30 : null;
  if (seuil === null || (dejaSousSeuil !== null && dejaSousSeuil <= seuil)) return null;
  if (j < 0) return { date: maintenant, gravite: "critique", type: `${quoi}-expire`, phrase: `${quoi === "certificat" ? "Le certificat TLS" : "Le nom de domaine"} a expiré.` };
  return {
    date: maintenant,
    gravite: seuil === 7 ? "critique" : "important",
    type: `${quoi}-echeance`,
    phrase: `${quoi === "certificat" ? "Le certificat TLS" : "Le nom de domaine"} expire dans ${j} jour${j > 1 ? "s" : ""} (${date.slice(0, 10)}).`,
  };
}

function seuilAtteint(date: string | null | undefined, quand: string): number | null {
  if (!date) return null;
  const j = joursAvant(date, quand);
  return j < 0 ? -1 : j <= 7 ? 7 : j <= 30 ? 30 : null;
}

/**
 * Compare deux instantanés et renvoie les changements datés, du plus grave au moins grave.
 * Sans instantané précédent : seules les situations déjà graves (échéances proches, ports
 * sensibles ouverts) sont signalées.
 */
export function comparer(avant: Instantane | null, apres: Instantane): Changement[] {
  const d = apres.date;
  const out: Changement[] = [];
  const h = apres.hote;

  // Ports exposés
  if (apres.ports) {
    const anciens = new Set(avant?.ports ?? []);
    for (const p of apres.ports) {
      if (avant?.ports && anciens.has(p)) continue;
      if (!avant?.ports && !PORTS_SENSIBLES[p]) continue; // premier passage : seuls les ports sensibles
      const service = PORTS_SENSIBLES[p];
      out.push({
        date: d,
        gravite: service ? "critique" : "important",
        type: "port-ouvert",
        phrase: service
          ? `Le port ${p} (${service}) de ${h} est accessible depuis Internet.`
          : `Nouveau port ouvert sur ${h} : ${p}.`,
      });
    }
    if (avant?.ports)
      for (const p of avant.ports)
        if (!apres.ports.includes(p)) out.push({ date: d, gravite: "info", type: "port-ferme", phrase: `Le port ${p} de ${h} n'est plus accessible.` });
  }

  // TLS
  if (apres.tls) {
    for (const v of ["TLSv1", "TLSv1.1"])
      if (apres.tls.protocoles.includes(v) && !(avant?.tls?.protocoles.includes(v) ?? false))
        out.push({ date: d, gravite: "important", type: "tls-obsolete", phrase: `${h} accepte de nouveau le protocole obsolète ${v.replace("v", " ")}.` });
    if (avant?.tls?.protocoles.includes("TLSv1.3") && !apres.tls.protocoles.includes("TLSv1.3"))
      out.push({ date: d, gravite: "info", type: "tls13-retire", phrase: `${h} n'accepte plus TLS 1.3.` });
    if (avant?.tls?.emetteur && apres.tls.emetteur && avant.tls.emetteur !== apres.tls.emetteur)
      out.push({ date: d, gravite: "info", type: "certificat-emetteur", phrase: `Le certificat de ${h} est désormais émis par ${apres.tls.emetteur}.` });
    const c = echeance("certificat", apres.tls.certExpire, d, seuilAtteint(avant?.tls?.certExpire, avant?.date ?? d));
    if (c) out.push(c);
  }

  // Domaine (RDAP)
  if (apres.domaineExpire !== undefined) {
    const c = echeance("domaine", apres.domaineExpire, d, seuilAtteint(avant?.domaineExpire, avant?.date ?? d));
    if (c) out.push(c);
  }

  // Nouveaux sous-domaines et nouvelles routes (seulement si la mesure précédente existe)
  if (apres.sousDomaines && avant?.sousDomaines) {
    const connus = new Set(avant.sousDomaines);
    const nouveaux = apres.sousDomaines.filter((s) => !connus.has(s));
    for (const s of nouveaux.slice(0, 20))
      out.push({ date: d, gravite: "important", type: "sous-domaine", phrase: `Nouveau sous-domaine publié : ${s}.` });
    if (nouveaux.length > 20)
      out.push({ date: d, gravite: "important", type: "sous-domaine", phrase: `Et ${nouveaux.length - 20} autres nouveaux sous-domaines.` });
  }
  if (apres.routes && avant?.routes) {
    const connues = new Set(avant.routes);
    for (const r of apres.routes.filter((x) => !connues.has(x)).slice(0, 20))
      out.push({
        date: d,
        gravite: ROUTE_SENSIBLE.test(r) ? "important" : "info",
        type: "route",
        phrase: `Nouvelle route exposée sur ${h} : ${r}.`,
      });
  }

  // En-têtes de sécurité retirés ou affaiblis
  if (apres.entetes && avant?.entetes) {
    for (const [nom, libelle] of Object.entries(ENTETES_SECURITE)) {
      const a = avant.entetes[nom], b = apres.entetes[nom];
      if (a && !b) out.push({ date: d, gravite: "important", type: "entete-retire", phrase: `L'en-tête ${libelle} a été retiré de ${h}.` });
      else if (a && b) {
        const raison = affaiblissement(nom, a, b);
        if (raison) out.push({ date: d, gravite: "important", type: "entete-affaibli", phrase: `En-tête ${libelle} affaibli sur ${h} : ${raison}.` });
      } else if (!a && b) out.push({ date: d, gravite: "info", type: "entete-ajoute", phrase: `L'en-tête ${libelle} est désormais présent sur ${h}.` });
    }
  }

  const rang: Record<Gravite, number> = { critique: 0, important: 1, info: 2 };
  return out.sort((x, y) => rang[x.gravite] - rang[y.gravite]);
}

export const JOURNAL_MAX = 300;

/** Plafonne un journal (plus récent en premier) à JOURNAL_MAX entrées. */
export function plafonner<T>(journal: T[], max = JOURNAL_MAX): T[] {
  return journal.slice(0, max);
}
