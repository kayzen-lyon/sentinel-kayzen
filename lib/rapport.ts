/**
 * Rapport de test d'intrusion : fonctions PURES (aucun accès réseau ni base), testées dans
 * tests/rapport.test.ts.
 *
 * Règle impérative : un rapport ne s'assemble qu'à partir d'identifiants de scans et de pentests
 * enregistrés côté serveur, appartenant au demandeur et datant de 7 jours au plus
 * (verifierSources). Aucun chiffre envoyé par le navigateur n'y entre. Chaque phrase du rapport
 * est calculée à partir de ces données ; le référentiel (lib/referentiel.ts) ne fait qu'éclairer
 * les constats existants.
 */
import { masquerSecrets } from "./masquage";
import {
  ECHELLE_NOTE,
  OWASP_2021,
  PENALITE,
  categorieOwasp,
  lireCvss,
  sujetConfiguration,
  urlCve,
  urlCwe,
  type CategorieOwasp,
} from "./referentiel";

export const AGE_MAX_JOURS = 7;

export type Severite = "critical" | "high" | "medium" | "low" | "info";
export const SEVERITES: Severite[] = ["critical", "high", "medium", "low", "info"];
export const LIBELLE_SEVERITE: Record<Severite, string> = {
  critical: "Critique",
  high: "Élevée",
  medium: "Moyenne",
  low: "Faible",
  info: "Information",
};
const RANG: Record<Severite, number> = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };

// ---------- Contrôle des sources ----------

export type SourceEnregistree = {
  id: string;
  user_id: string;
  org_id: string | null;
  status: string;
  created_at: string;
};

/**
 * Vérifie chaque identifiant demandé : il doit exister, appartenir au demandeur (lui-même ou une
 * de ses organisations), être terminé et dater de 7 jours au plus. Renvoie les erreurs (vide = OK).
 */
export function verifierSources(
  demandes: string[],
  trouvees: SourceEnregistree[],
  demandeur: { userId: string; orgIds: string[] },
  maintenant: Date,
  nature: "scan" | "pentest"
): string[] {
  const err: string[] = [];
  const limite = maintenant.getTime() - AGE_MAX_JOURS * 86_400_000;
  const parId = new Map(trouvees.map((s) => [s.id, s]));
  for (const id of new Set(demandes)) {
    const s = parId.get(id);
    const proprietaire = s && (s.user_id === demandeur.userId || (s.org_id !== null && demandeur.orgIds.includes(s.org_id)));
    if (!s || !proprietaire) err.push(`${nature} ${id.slice(0, 8)} : introuvable dans votre compte.`);
    else if (s.status !== "done") err.push(`${nature} ${id.slice(0, 8)} : pas terminé.`);
    else if (new Date(s.created_at).getTime() < limite)
      err.push(`${nature} ${id.slice(0, 8)} : plus de ${AGE_MAX_JOURS} jours, relancez-le avant d'en faire un rapport.`);
  }
  return err;
}

// ---------- Sources ----------

export type ScanSource = {
  id: string;
  target_url: string;
  created_at: string;
  deep: boolean | null;
  score: number | null;
  grade: string | null;
  findings: {
    id: string;
    title: string;
    severity: string;
    state: string;
    category?: string;
    detail?: string;
    recommendation?: string;
    effort?: string;
    owasp?: string;
    cwe?: string;
  }[];
};

export type PentestSource = {
  id: string;
  target_url: string;
  mode: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  findings: {
    native_id: string;
    title: string | null;
    severity: string | null;
    cvss: number | null;
    status: string;
    payload: Record<string, unknown> | null;
    preuves: Record<string, unknown> | null;
    /** Une preuve chiffrée est stockée (même si elle n'a pas pu être déchiffrée). */
    aPreuve?: boolean;
  }[];
};

/** Autorisation écrite du client, telle qu'elle figure dans le chapitre « Règles d'engagement ». */
export type AutorisationRapport = {
  client: string;
  perimetre: string[];
  debut: string;
  fin: string;
  document: string;
  empreinte: string;
};

export type ContexteRapport = {
  /** Identifiant du rapport (sert à la référence documentaire). */
  id?: string;
  client?: string | null;
  autorisations?: AutorisationRapport[];
};

// ---------- Modèle ----------

/** Preuve d'exploitation (masquée) : document authentifié seulement, jamais dans les exports. */
export type Preuve = {
  analyse: string | null;
  reproduction: string | null;
  elements: string | null;
  script: string | null;
  autres: string | null;
};

export type Constat = {
  ref: string;
  source: "pentest" | "scan";
  titre: string;
  severite: Severite;
  cvss: number | null;
  vecteurCvss: string | null;
  metriquesCvss: { libelle: string; valeur: string }[];
  cible: string;
  pointEntree: string | null;
  description: string;
  impact: string;
  remediation: string;
  hypotheses: string;
  effort: "rapide" | "moyen" | "important" | null;
  echeance: string;
  cwe: string | null;
  cve: string | null;
  owasp: Pick<CategorieOwasp, "code" | "libelle" | "url"> | null;
  /** Références textuelles (CWE, CVE, OWASP) : seule forme reprise dans les exports. */
  references: string[];
  liens: { libelle: string; url: string }[];
  localisations: string[];
  validation: { verdict: "confirmed" | "doubtful" | "rejected"; raison: string } | null;
  statut: string;
  /** Priorité de traitement : P1 (critique) à P4 (faible ou information). */
  priorite: "P1" | "P2" | "P3" | "P4";
  /** Catégorie du scanner (constats de configuration). */
  categorie: string | null;
  /** Critères vérifiables lors du contre-test. */
  criteres: string[];
  preuve: Preuve | null;
  /** Une preuve chiffrée existe mais n'a pas pu être lue (clé changée). */
  preuveIllisible: boolean;
};

export type Sujet = {
  id: string;
  nature: "exploitation" | "configuration";
  code: string | null;
  titre: string;
  enjeu: string;
  url: string | null;
  /** Références des constats du sujet, dans l'ordre de gravité. */
  refs: string[];
  comptes: Record<Severite, number>;
  pire: Severite | null;
  controles: { total: number; conformes: number; enEchec: number };
  recommandations: string[];
  etat: "conforme" | "a-ameliorer" | "prioritaire";
};

export type EtapePlan = {
  rang: number;
  ref: string;
  titre: string;
  severite: Severite;
  effort: Constat["effort"];
  echeance: string;
  horizon: string;
};

export type ModeleRapport = {
  titre: string;
  genereLe: string;
  document: { reference: string; version: string; classification: string; client: string | null };
  perimetre: string[];
  periode: { debut: string; fin: string } | null;
  comptes: Record<Severite, number>;
  risque: { niveau: "critique" | "eleve" | "modere" | "faible" | "aucun"; libelle: string; explication: string };
  synthese: string[];
  score: { valeur: number; lettre: string; sens: string };
  sujets: Sujet[];
  inventaire: { categorie: string; titre: string; etat: string; severite: Severite; cible: string }[];
  conclusion: string[];
  constats: Constat[];
  plan: EtapePlan[];
  repartition: {
    parCategorie: { code: string; libelle: string; url: string; nombre: number; pire: Severite }[];
    sansCategorie: number;
    parCible: { cible: string; comptes: Record<Severite, number> }[];
  };
  recommandations: CategorieOwasp[];
  controles: {
    total: number;
    conformes: number;
    parCategorie: { categorie: string; conformes: number; exemples: string[] }[];
  };
  validation: { confirmes: number; douteux: number; sansVerdict: number; avecPreuve: number };
  engagement: { autorisations: AutorisationRapport[] };
  methode: {
    outils: string[];
    scans: { id: string; cible: string; date: string; approfondi: boolean; score: number | null }[];
    pentests: { id: string; cible: string; mode: string; debut: string | null; fin: string | null }[];
    nonTeste: string[];
  };
};

// ---------- Utilitaires ----------

function sev(v: string | null | undefined): Severite {
  const s = (v || "").toLowerCase();
  return (SEVERITES as string[]).includes(s) ? (s as Severite) : "info";
}

function hote(u: string): string {
  try {
    return new URL(u).hostname;
  } catch {
    return u;
  }
}

function texte(v: unknown): string {
  if (typeof v === "string") return masquerSecrets(v.trim());
  if (Array.isArray(v))
    return v
      .filter((x) => typeof x === "string")
      .map((x) => masquerSecrets((x as string).trim()))
      .join("\n");
  return "";
}

function brut(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  return JSON.stringify(v, null, 2);
}

const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;

/** Effort de correction déclaré par le moteur Strix (trivial / low / medium / high) ou le scanner. */
export function effortDe(v: unknown): Constat["effort"] {
  const s = typeof v === "string" ? v.toLowerCase() : "";
  if (s === "trivial" || s === "low" || s === "rapide") return "rapide";
  if (s === "medium" || s === "moyen") return "moyen";
  if (s === "high" || s === "important") return "important";
  return null;
}

export const LIBELLE_EFFORT: Record<NonNullable<Constat["effort"]>, string> = {
  rapide: "Faible (correction rapide)",
  moyen: "Moyen",
  important: "Important (chantier)",
};

const ECHEANCE: Record<Severite, string> = {
  critical: "Immédiat (sous 72 h)",
  high: "Sous 2 semaines",
  medium: "Sous 3 mois",
  low: "Prochain cycle de maintenance",
  info: "À l'appréciation de l'équipe",
};
const HORIZON: Record<Severite, string> = {
  critical: "Immédiat",
  high: "Court terme",
  medium: "Moyen terme",
  low: "Long terme",
  info: "Amélioration continue",
};

/**
 * Range les preuves du moteur par nature (analyse, reproduction, éléments, script), secrets masqués.
 * null si aucune preuve.
 */
export function structurerPreuve(p: Record<string, unknown> | null): Preuve | null {
  if (!p) return null;
  const tri: Record<keyof Preuve, string[]> = { analyse: [], reproduction: [], elements: [], script: [], autres: [] };
  for (const [k, v] of Object.entries(p)) {
    const contenu = brut(v).trim();
    if (!contenu) continue;
    const cle = k.toLowerCase();
    if (cle === "technical_analysis") tri.analyse.push(contenu);
    else if (/^(poc_description|reproduction|steps_to_reproduce)/.test(cle)) tri.reproduction.push(contenu);
    else if (/^(poc_script|poc_code|exploit|curl|payloads)/.test(cle)) tri.script.push(contenu);
    else if (/^(evidence|proof|preuve|request|response|http_?request|http_?response|screenshot)/.test(cle))
      tri.elements.push(/^(evidence|proof|preuve)$/.test(cle) ? contenu : `${k} :\n${contenu}`);
    else tri.autres.push(`${k} :\n${contenu}`);
  }
  const f = (l: string[]) => (l.length ? masquerSecrets(l.join("\n\n")) : null);
  const out: Preuve = {
    analyse: f(tri.analyse),
    reproduction: f(tri.reproduction),
    elements: f(tri.elements),
    script: f(tri.script),
    autres: f(tri.autres),
  };
  return Object.values(out).some(Boolean) ? out : null;
}

function localisations(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === "object")
    .map((l) => {
      const fichier = typeof l.file === "string" ? l.file : "";
      if (!fichier) return "";
      const debut = Number(l.start_line);
      const fin = Number(l.end_line);
      const lignes = Number.isInteger(debut) && debut > 0 ? (Number.isInteger(fin) && fin > debut ? `, lignes ${debut} à ${fin}` : `, ligne ${debut}`) : "";
      return masquerSecrets(`${fichier}${lignes}`);
    })
    .filter(Boolean);
}

function validation(v: unknown): Constat["validation"] {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const verdict = String(o.verdict || "").toLowerCase();
  if (verdict !== "confirmed" && verdict !== "doubtful" && verdict !== "rejected") return null;
  return { verdict, raison: texte(o.reason) };
}

function liensDe(cwe: string | null, cve: string | null, owasp: Constat["owasp"]): Constat["liens"] {
  const l: Constat["liens"] = [];
  const uCwe = urlCwe(cwe);
  if (cwe && uCwe) l.push({ libelle: `${cwe.toUpperCase()} (MITRE)`, url: uCwe });
  const uCve = urlCve(cve);
  if (cve && uCve) l.push({ libelle: `${cve.toUpperCase()} (NVD)`, url: uCve });
  if (owasp) l.push({ libelle: `OWASP Top 10 ${owasp.code} — ${owasp.libelle}`, url: owasp.url });
  return l;
}

// ---------- Risque et plan ----------

/** Risque global : déterminé par la constatation la plus grave encore ouverte. */
export function risqueGlobal(c: Record<Severite, number>): ModeleRapport["risque"] {
  if (c.critical)
    return { niveau: "critique", libelle: "Critique", explication: `${c.critical} vulnérabilité(s) critique(s) ouverte(s) : exploitation probable avec un impact majeur. À traiter immédiatement.` };
  if (c.high)
    return { niveau: "eleve", libelle: "Élevé", explication: `${c.high} vulnérabilité(s) de gravité élevée ouverte(s) : à corriger en priorité.` };
  if (c.medium)
    return { niveau: "modere", libelle: "Modéré", explication: `${c.medium} vulnérabilité(s) de gravité moyenne : à planifier.` };
  if (c.low) return { niveau: "faible", libelle: "Faible", explication: `${c.low} constat(s) de faible gravité.` };
  return {
    niveau: "aucun",
    libelle: "Aucun constat ouvert",
    explication: "Aucune vulnérabilité ouverte n'a été relevée par les tests réalisés. Cela ne garantit pas l'absence de faille : voir « Méthode et limites ».",
  };
}

const COUT_EFFORT = { rapide: 1, moyen: 2, important: 3 } as const;

/** Plan de remédiation : risque décroissant, puis effort croissant (gains rapides d'abord). */
export function planRemediation(constats: Constat[]): EtapePlan[] {
  return constats
    .filter((c) => c.severite !== "info")
    .sort(
      (a, b) =>
        RANG[b.severite] - RANG[a.severite] ||
        (a.effort ? COUT_EFFORT[a.effort] : 2.5) - (b.effort ? COUT_EFFORT[b.effort] : 2.5) ||
        (b.cvss ?? 0) - (a.cvss ?? 0)
    )
    .map((c, i) => ({
      rang: i + 1,
      ref: c.ref,
      titre: c.titre,
      severite: c.severite,
      effort: c.effort,
      echeance: ECHEANCE[c.severite],
      horizon: HORIZON[c.severite],
    }));
}

const NON_TESTE_TOUJOURS = [
  "Déni de service et tests de charge (exclus pour ne pas perturber le service).",
  "Ingénierie sociale, hameçonnage et sécurité physique.",
  "Infrastructure interne non exposée sur Internet.",
  "Hôtes hors du périmètre autorisé par écrit.",
];

// ---------- Assemblage ----------

function constatPentest(p: PentestSource, f: PentestSource["findings"][number]): Constat {
  const pl = f.payload ?? {};
  const severite = sev(f.severity);
  const cwe = texte(pl.cwe) || null;
  const cve = texte(pl.cve) || null;
  const cat = categorieOwasp(texte(pl.owasp), cwe);
  const owasp = cat ? { code: cat.code, libelle: cat.libelle, url: cat.url } : null;
  const cvss = lireCvss(pl.cvss_breakdown);
  const methode = texte(pl.method).toUpperCase();
  const point = texte(pl.endpoint);
  const preuve = structurerPreuve(f.preuves);
  return {
    ref: `P-${p.id.slice(0, 4)}-${f.native_id}`.slice(0, 32),
    source: "pentest",
    titre: masquerSecrets(f.title || f.native_id),
    severite,
    cvss: typeof f.cvss === "number" ? f.cvss : null,
    vecteurCvss: cvss?.vecteur ?? null,
    metriquesCvss: cvss?.metriques ?? [],
    cible: hote(p.target_url),
    pointEntree: point ? `${methode ? `${methode} ` : ""}${point}` : null,
    description: texte(pl.description),
    impact: texte(pl.impact),
    remediation: texte(pl.remediation) || texte(pl.remediation_steps),
    hypotheses: texte(pl.assumptions),
    effort: effortDe(pl.fix_effort),
    echeance: ECHEANCE[severite],
    cwe,
    cve,
    owasp,
    references: [cwe, cve, owasp ? `OWASP ${owasp.code}` : ""].filter((x): x is string => Boolean(x)),
    liens: liensDe(cwe, cve, owasp),
    localisations: localisations(pl.code_locations),
    validation: validation(pl._sentinel_validation),
    statut: f.status,
    priorite: PRIORITE[severite],
    categorie: null,
    criteres: [],
    preuve,
    preuveIllisible: !preuve && Boolean(f.aPreuve),
  };
}

function constatScan(s: ScanSource, f: ScanSource["findings"][number]): Constat {
  const severite = sev(f.severity);
  const cwe = f.cwe ? masquerSecrets(f.cwe) : null;
  const cat = categorieOwasp(f.owasp, cwe);
  const owasp = cat ? { code: cat.code, libelle: cat.libelle, url: cat.url } : null;
  return {
    ref: `S-${s.id.slice(0, 4)}-${f.id}`.slice(0, 32),
    source: "scan",
    titre: masquerSecrets(f.title),
    severite,
    cvss: null,
    vecteurCvss: null,
    metriquesCvss: [],
    cible: hote(s.target_url),
    pointEntree: null,
    description: masquerSecrets(f.detail || ""),
    impact: "",
    remediation: masquerSecrets(f.recommendation || ""),
    hypotheses: "",
    effort: effortDe(f.effort),
    echeance: ECHEANCE[severite],
    cwe,
    cve: null,
    owasp,
    references: [f.owasp, cwe].filter((x): x is string => Boolean(x)),
    liens: liensDe(cwe, null, owasp),
    localisations: [],
    validation: null,
    statut: "open",
    priorite: PRIORITE[severite],
    categorie: f.category?.trim() || null,
    criteres: [],
    preuve: null,
    preuveIllisible: false,
  };
}

function repartition(constats: Constat[]): ModeleRapport["repartition"] {
  const cats = new Map<string, { code: string; libelle: string; url: string; nombre: number; pire: Severite }>();
  let sansCategorie = 0;
  const cibles = new Map<string, Record<Severite, number>>();
  for (const c of constats) {
    if (c.owasp) {
      const e = cats.get(c.owasp.code) ?? { ...c.owasp, nombre: 0, pire: "info" as Severite };
      e.nombre++;
      if (RANG[c.severite] > RANG[e.pire]) e.pire = c.severite;
      cats.set(c.owasp.code, e);
    } else sansCategorie++;
    const k = cibles.get(c.cible) ?? { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    k[c.severite]++;
    cibles.set(c.cible, k);
  }
  return {
    parCategorie: [...cats.values()].sort((a, b) => RANG[b.pire] - RANG[a.pire] || b.nombre - a.nombre || a.code.localeCompare(b.code)),
    sansCategorie,
    parCible: [...cibles.entries()].map(([cible, comptes]) => ({ cible, comptes })).sort((a, b) => a.cible.localeCompare(b.cible)),
  };
}

function controlesConformes(scans: ScanSource[]): ModeleRapport["controles"] {
  let total = 0;
  let conformes = 0;
  const parCat = new Map<string, { conformes: number; exemples: string[] }>();
  for (const s of scans)
    for (const f of s.findings) {
      if (f.state !== "pass" && f.state !== "fail" && f.state !== "warn") continue;
      total++;
      if (f.state !== "pass") continue;
      conformes++;
      const cat = f.category?.trim() || "Autres contrôles";
      const e = parCat.get(cat) ?? { conformes: 0, exemples: [] };
      e.conformes++;
      if (e.exemples.length < 6 && !e.exemples.includes(f.title)) e.exemples.push(masquerSecrets(f.title));
      parCat.set(cat, e);
    }
  return {
    total,
    conformes,
    parCategorie: [...parCat.entries()].map(([categorie, v]) => ({ categorie, ...v })).sort((a, b) => b.conformes - a.conformes),
  };
}

const PRIORITE: Record<Severite, Constat["priorite"]> = { critical: "P1", high: "P2", medium: "P3", low: "P4", info: "P4" };

/** Critères vérifiables du contre-test, déduits des seuls éléments du constat. */
export function criteresContreTest(c: Omit<Constat, "criteres">): string[] {
  const l: string[] = [];
  if (c.source === "pentest") {
    if (c.preuve?.reproduction || c.preuve?.script) l.push("Rejouer la preuve de concept de cette fiche : elle ne doit plus aboutir.");
    if (c.pointEntree) l.push(`Le point d'entrée ${c.pointEntree} ne doit plus présenter le comportement décrit, y compris avec des variantes de la charge utile.`);
    l.push(`Un nouveau test d'intrusion sur ${c.cible} ne doit plus remonter cette vulnérabilité.`);
  } else {
    l.push(`Le contrôle « ${c.titre} » doit passer à l'état conforme lors d'une nouvelle analyse de ${c.cible}.`);
  }
  l.push("Les contrôles déjà conformes doivent le rester (aucune régression).");
  return l;
}

/** Score de sécurité sur 100 : 100 moins une pénalité par vulnérabilité ouverte (voir annexe). */
export function scoreSecurite(comptes: Record<Severite, number>): ModeleRapport["score"] {
  const retrait = SEVERITES.reduce((t, s) => t + comptes[s] * PENALITE[s], 0);
  const valeur = Math.max(0, 100 - retrait);
  // Plafonds : une vulnérabilité critique ouverte interdit une note au-dessus de D, une élevée au-dessus de C.
  const plafond = comptes.critical ? 59 : comptes.high ? 74 : 100;
  const note = Math.min(valeur, plafond);
  const e = ECHELLE_NOTE.find((x) => note >= x.min) ?? ECHELLE_NOTE[ECHELLE_NOTE.length - 1];
  return { valeur, lettre: e.lettre, sens: e.sens };
}

function vide(): Record<Severite, number> {
  return { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
}

/**
 * Chapitres par sujet, sur le modèle des audits KAYZEN : vulnérabilités exploitées regroupées par
 * catégorie OWASP, constats de configuration par catégorie du scanner, avec leurs contrôles.
 */
export function construireSujets(constats: Constat[], scans: ScanSource[]): Sujet[] {
  const sujets = new Map<string, Sujet>();
  const obtenir = (id: string, init: () => Omit<Sujet, "refs" | "comptes" | "pire" | "controles" | "etat">): Sujet => {
    let x = sujets.get(id);
    if (!x) {
      x = { ...init(), refs: [], comptes: vide(), pire: null, controles: { total: 0, conformes: 0, enEchec: 0 }, etat: "conforme" };
      sujets.set(id, x);
    }
    return x;
  };
  for (const c of constats) {
    let x: Sujet;
    if (c.source === "pentest") {
      const cat = c.owasp ? Object.values(OWASP_2021).find((o) => o.code === c.owasp!.code) : null;
      x = cat
        ? obtenir(`owasp-${cat.code.slice(0, 3)}`, () => ({ id: `owasp-${cat.code.slice(0, 3).toLowerCase()}`, nature: "exploitation", code: cat.code, titre: cat.libelle, enjeu: cat.enjeu, url: cat.url, recommandations: cat.recommandations }))
        : obtenir("exploitation-autres", () => ({ id: "exploitation-autres", nature: "exploitation", code: null, titre: "Autres vulnérabilités exploitées", enjeu: "Vulnérabilités démontrées par le test d'intrusion qui ne relèvent d'aucune catégorie OWASP déterminable à partir des informations transmises.", url: null, recommandations: [] }));
    } else {
      const sj = sujetConfiguration(c.categorie ?? undefined);
      x = obtenir(`config-${sj.cle}`, () => ({ id: `config-${sj.cle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, nature: "configuration", code: null, titre: sj.titre, enjeu: sj.enjeu, url: null, recommandations: sj.recommandations }));
    }
    x.refs.push(c.ref);
    x.comptes[c.severite]++;
    if (!x.pire || RANG[c.severite] > RANG[x.pire]) x.pire = c.severite;
  }
  // Contrôles du scanner : chaque catégorie testée devient un sujet, même sans échec (sujet conforme).
  for (const s of scans)
    for (const f of s.findings) {
      if (f.state !== "pass" && f.state !== "fail" && f.state !== "warn") continue;
      const sj = sujetConfiguration(f.category);
      const x = obtenir(`config-${sj.cle}`, () => ({ id: `config-${sj.cle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, nature: "configuration", code: null, titre: sj.titre, enjeu: sj.enjeu, url: null, recommandations: sj.recommandations }));
      x.controles.total++;
      if (f.state === "pass") x.controles.conformes++;
      else x.controles.enEchec++;
    }
  for (const x of sujets.values())
    x.etat = x.pire && RANG[x.pire] >= RANG.high ? "prioritaire" : x.refs.length ? "a-ameliorer" : "conforme";
  const ordre = (x: Sujet) => (x.pire ? RANG[x.pire] : 0);
  return [...sujets.values()].sort(
    (a, b) => (a.nature === b.nature ? 0 : a.nature === "exploitation" ? -1 : 1) || ordre(b) - ordre(a) || b.refs.length - a.refs.length || a.titre.localeCompare(b.titre)
  );
}

/** Inventaire exhaustif des contrôles de configuration réalisés (annexe A). */
export function inventaireControles(scans: ScanSource[]): ModeleRapport["inventaire"] {
  const ETAT: Record<string, string> = { pass: "Conforme", fail: "Non conforme", warn: "À améliorer", info: "Information" };
  return scans
    .flatMap((s) =>
      s.findings
        .filter((f) => f.state in ETAT)
        .map((f) => ({ categorie: sujetConfiguration(f.category).titre, titre: masquerSecrets(f.title), etat: ETAT[f.state], severite: sev(f.severity), cible: hote(s.target_url) }))
    )
    .sort((a, b) => a.categorie.localeCompare(b.categorie) || a.etat.localeCompare(b.etat) || a.titre.localeCompare(b.titre));
}

/** Conclusion rédigée à partir des données du rapport. */
export function redigerConclusion(m: Omit<ModeleRapport, "conclusion" | "synthese">): string[] {
  const p: string[] = [];
  p.push(
    `Au terme des tests, la posture de sécurité de ${m.perimetre.join(", ") || "la cible"} obtient la note ${m.score.lettre} (${m.score.valeur}/100) : ${m.score.sens.charAt(0).toLowerCase()}${m.score.sens.slice(1)}`
  );
  const prioritaires = m.sujets.filter((x) => x.etat === "prioritaire");
  if (prioritaires.length)
    p.push(`Les efforts doivent porter d'abord sur ${prioritaires.map((x) => `« ${x.titre} »`).join(", ")}, où se concentrent les vulnérabilités critiques et élevées.`);
  const conformes = m.sujets.filter((x) => x.etat === "conforme");
  if (conformes.length)
    p.push(`À l'inverse, ${conformes.length > 1 ? "les sujets suivants sont conformes" : "le sujet suivant est conforme"} et témoignent de bonnes pratiques déjà en place : ${conformes.map((x) => `« ${x.titre} »`).join(", ")}.`);
  if (m.plan.length)
    p.push(`Le plan d'action compte ${m.plan.length} correction(s). Appliquées dans l'ordre proposé, elles réduisent d'abord l'exposition la plus grave pour un effort maîtrisé. Un contre-test, mené selon les critères du chapitre dédié, établira leur efficacité.`);
  p.push("Ce rapport décrit l'état de la cible aux dates des tests. Toute évolution du site ou de son infrastructure peut modifier ces résultats : un test régulier et une surveillance continue de la surface exposée sont recommandés.");
  return p;
}

const LIB_SEV_PLURIEL: Record<Severite, [string, string]> = {
  critical: ["critique", "critiques"],
  high: ["élevée", "élevées"],
  medium: ["moyenne", "moyennes"],
  low: ["faible", "faibles"],
  info: ["informative", "informatives"],
};

function dateCourte(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
}

/** Synthèse exécutive rédigée à partir des seules données du rapport. */
export function redigerSynthese(m: Omit<ModeleRapport, "synthese" | "conclusion">): string[] {
  const p: string[] = [];
  const nbP = m.methode.pentests.length;
  const nbS = m.methode.scans.length;
  const tests = [nbP ? pluriel(nbP, "test d'intrusion autonome", "tests d'intrusion autonomes") : "", nbS ? pluriel(nbS, "analyse de configuration", "analyses de configuration") : ""]
    .filter(Boolean)
    .join(" et ");
  const periode = m.periode ? ` entre le ${dateCourte(m.periode.debut)} et le ${dateCourte(m.periode.fin)}` : "";
  p.push(
    `${m.document.client ? `À la demande de ${m.document.client}, ` : ""}Sentinel a évalué la sécurité de ${m.perimetre.join(", ") || "la cible"}${periode} : ${tests || "aucun test"}. L'objectif est d'identifier les vulnérabilités exploitables depuis Internet, d'en mesurer la gravité et de proposer un plan de correction priorisé.`
  );
  const total = m.constats.length;
  if (!total) {
    p.push("Aucune vulnérabilité ouverte n'a été relevée. Ce résultat vaut pour le périmètre et les dates du test ; il ne garantit pas l'absence de faille.");
  } else {
    const detail = SEVERITES.filter((s) => m.comptes[s])
      .map((s) => `${m.comptes[s]} ${LIB_SEV_PLURIEL[s][m.comptes[s] > 1 ? 1 : 0]}`)
      .join(", ");
    p.push(`${pluriel(total, "vulnérabilité ouverte a été retenue", "vulnérabilités ouvertes ont été retenues")} (${detail}). Le niveau de risque global, fixé par la plus grave, est ${m.risque.libelle.toLowerCase()} ; la note de sécurité est ${m.score.lettre} (${m.score.valeur}/100).`);
  }
  if (m.validation.avecPreuve)
    p.push(
      `${pluriel(m.validation.avecPreuve, "vulnérabilité est étayée", "vulnérabilités sont étayées")} par une preuve d'exploitation contrôlée${m.validation.confirmes ? `, dont ${pluriel(m.validation.confirmes, "confirmée", "confirmées")} par une relecture contradictoire` : ""} : leur exploitabilité est démontrée, pas seulement supposée.`
    );
  const cats = m.repartition.parCategorie.slice(0, 3);
  if (cats.length)
    p.push(`Les faiblesses relèvent principalement des catégories OWASP suivantes : ${cats.map((c) => `${c.libelle} (${c.code}, ${c.nombre})`).join(" ; ")}.`);
  if (m.controles.total)
    p.push(`Sur ${pluriel(m.controles.total, "contrôle de configuration", "contrôles de configuration")}, ${m.controles.conformes} sont conformes : ${m.controles.parCategorie.slice(0, 3).map((c) => `« ${sujetConfiguration(c.categorie).titre} »`).join(", ")}.`);
  const urgents = m.plan.filter((e) => e.severite === "critical" || e.severite === "high");
  if (urgents.length)
    p.push(`Nous recommandons de corriger en priorité ${urgents.length > 1 ? `les ${urgents.length} vulnérabilités critiques et élevées` : `« ${urgents[0].titre} »`} selon les échéances du plan de remédiation, puis de commander un contre-test pour vérifier les corrections.`);
  else if (m.plan.length) p.push("Aucune vulnérabilité critique ou élevée : les corrections peuvent être planifiées dans les cycles de maintenance, selon l'ordre du plan de remédiation.");
  return p;
}

export function referenceDocument(id: string | undefined, maintenant: Date): string {
  const jour = maintenant.toISOString().slice(0, 10).replace(/-/g, "");
  return `SEN-RPT-${jour}-${(id || "00000000").replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

export function construireRapport(
  titre: string,
  scans: ScanSource[],
  pentests: PentestSource[],
  maintenant: Date,
  contexte: ContexteRapport = {}
): ModeleRapport {
  const constats: Constat[] = [];
  for (const p of pentests)
    for (const f of p.findings) {
      if (f.status === "false_positive" || f.status === "fixed") continue;
      constats.push(constatPentest(p, f));
    }
  for (const s of scans)
    for (const f of s.findings) {
      if (f.state !== "fail" && f.state !== "warn") continue;
      constats.push(constatScan(s, f));
    }
  for (const c of constats) c.criteres = criteresContreTest(c);
  constats.sort((a, b) => RANG[b.severite] - RANG[a.severite] || (b.cvss ?? -1) - (a.cvss ?? -1) || a.titre.localeCompare(b.titre));

  const comptes = { critical: 0, high: 0, medium: 0, low: 0, info: 0 } as Record<Severite, number>;
  for (const c of constats) comptes[c.severite]++;

  const dates = [
    ...scans.map((s) => s.created_at),
    ...pentests.flatMap((p) => [p.started_at || p.created_at, p.completed_at].filter((d): d is string => Boolean(d))),
  ].sort();

  const nonTeste = [...NON_TESTE_TOUJOURS];
  if (!pentests.length) nonTeste.unshift("Aucun pentest autonome dans ce rapport : aucune exploitation n'a été tentée (constats de configuration seulement).");
  if (scans.some((s) => !s.deep)) nonTeste.push("Certains scans sont passifs : contrôles approfondis (TLS détaillé, DNS, fichiers exposés) non réalisés sur ces cibles.");
  if (pentests.length) nonTeste.push("Parcours authentifiés : testés seulement si des identifiants de test ont été fournis au moteur.");

  const repart = repartition(constats);
  const pentestConstats = constats.filter((c) => c.source === "pentest");

  const sansSynthese: Omit<ModeleRapport, "synthese" | "conclusion"> = {
    titre,
    genereLe: maintenant.toISOString(),
    document: {
      reference: referenceDocument(contexte.id, maintenant),
      version: "1.0",
      classification: "Confidentiel — diffusion restreinte",
      client: contexte.client?.trim() || contexte.autorisations?.[0]?.client || null,
    },
    perimetre: [...new Set([...scans.map((s) => hote(s.target_url)), ...pentests.map((p) => hote(p.target_url))])].sort(),
    periode: dates.length ? { debut: dates[0], fin: dates[dates.length - 1] } : null,
    comptes,
    risque: risqueGlobal(comptes),
    score: scoreSecurite(comptes),
    sujets: construireSujets(constats, scans),
    inventaire: inventaireControles(scans),
    constats,
    plan: planRemediation(constats),
    repartition: repart,
    recommandations: repart.parCategorie
      .map((c) => Object.values(OWASP_2021).find((o) => o.code === c.code))
      .filter((x): x is CategorieOwasp => Boolean(x)),
    controles: controlesConformes(scans),
    validation: {
      confirmes: pentestConstats.filter((c) => c.validation?.verdict === "confirmed").length,
      douteux: pentestConstats.filter((c) => c.validation?.verdict === "doubtful").length,
      sansVerdict: pentestConstats.filter((c) => !c.validation).length,
      avecPreuve: pentestConstats.filter((c) => c.preuve).length,
    },
    engagement: { autorisations: contexte.autorisations ?? [] },
    methode: {
      outils: [
        ...(scans.length ? ["Scanner Sentinel (en-têtes HTTP, TLS, cookies, exposition, surface JavaScript)"] : []),
        ...(pentests.length ? ["Moteur de pentest autonome Strix (agents IA, exploitation contrôlée)"] : []),
      ],
      scans: scans.map((s) => ({ id: s.id, cible: hote(s.target_url), date: s.created_at, approfondi: Boolean(s.deep), score: s.score })),
      pentests: pentests.map((p) => ({ id: p.id, cible: hote(p.target_url), mode: p.mode, debut: p.started_at, fin: p.completed_at })),
      nonTeste,
    },
  };
  return { ...sansSynthese, synthese: redigerSynthese(sansSynthese), conclusion: redigerConclusion(sansSynthese) };
}

// ---------- Exports (jamais de preuve d'exploitation) ----------

/** Modèle sans preuves : seule forme qui quitte le document authentifié (JSON, Markdown, CSV). */
export function sansPreuve(m: ModeleRapport): ModeleRapport {
  return { ...m, constats: m.constats.map((c) => ({ ...c, preuve: null })) };
}

export function versJson(m: ModeleRapport): string {
  const { constats, ...reste } = sansPreuve(m);
  return JSON.stringify({ ...reste, constats: constats.map(({ preuve: _p, ...c }) => c) }, null, 2);
}

const md = (s: string) => s.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

export function versMarkdown(m: ModeleRapport): string {
  const l: string[] = [];
  l.push(`# ${m.titre}`, "", `Référence ${m.document.reference} · version ${m.document.version} · ${m.document.classification}`, "");
  l.push(`Généré le ${m.genereLe.slice(0, 10)} · périmètre : ${m.perimetre.join(", ") || "—"}`, "");
  l.push("## Synthèse", "", `**Risque global : ${m.risque.libelle}.** ${m.risque.explication}`, "", ...m.synthese.flatMap((p) => [p, ""]));
  l.push("| Gravité | Nombre |", "|---|---|", ...SEVERITES.map((s) => `| ${LIBELLE_SEVERITE[s]} | ${m.comptes[s]} |`), "");
  l.push("## Vulnérabilités", "");
  for (const c of m.constats) {
    l.push(`### ${md(c.titre)}`, "", `- Gravité : ${LIBELLE_SEVERITE[c.severite]}${c.cvss !== null ? ` (CVSS ${c.cvss})` : ""}`);
    if (c.vecteurCvss) l.push(`- Vecteur : ${c.vecteurCvss}`);
    l.push(`- Cible : ${c.cible}${c.pointEntree ? ` — ${md(c.pointEntree)}` : ""}`, `- Référence : ${c.ref}`);
    if (c.references.length) l.push(`- Classification : ${c.references.join(", ")}`);
    if (c.description) l.push(`- Description : ${md(c.description)}`);
    if (c.impact) l.push(`- Impact : ${md(c.impact)}`);
    if (c.remediation) l.push(`- Remédiation : ${md(c.remediation)}`);
    if (c.source === "pentest") l.push("- Preuve d'exploitation : consultable dans le rapport authentifié uniquement.");
    l.push("");
  }
  l.push("## Plan de remédiation", "", "| # | Constat | Gravité | Effort | Échéance suggérée |", "|---|---|---|---|---|");
  for (const e of m.plan) l.push(`| ${e.rang} | ${md(e.titre)} | ${LIBELLE_SEVERITE[e.severite]} | ${e.effort ? LIBELLE_EFFORT[e.effort] : "non estimé"} | ${e.echeance} |`);
  l.push("", "## Méthode et limites", "", ...m.methode.outils.map((o) => `- ${o}`), "", "Non testé :", ...m.methode.nonTeste.map((n) => `- ${n}`), "");
  return l.join("\n");
}

/** Cellule CSV : guillemets doublés, et neutralisation des formules (= + - @) pour les tableurs. */
export function celluleCsv(v: string | number | null): string {
  let s = v === null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function versCsv(m: ModeleRapport): string {
  const tete = ["ref", "source", "titre", "gravite", "cvss", "vecteur_cvss", "cible", "point_entree", "owasp", "effort", "echeance", "statut", "description", "impact", "remediation", "references"];
  const lignes = m.constats.map((c) =>
    [
      c.ref,
      c.source,
      c.titre,
      LIBELLE_SEVERITE[c.severite],
      c.cvss,
      c.vecteurCvss,
      c.cible,
      c.pointEntree,
      c.owasp ? c.owasp.code : null,
      c.effort,
      c.echeance,
      c.statut,
      c.description,
      c.impact,
      c.remediation,
      c.references.join(" "),
    ]
      .map(celluleCsv)
      .join(",")
  );
  return [tete.join(","), ...lignes].join("\r\n");
}
