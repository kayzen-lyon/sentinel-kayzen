/**
 * Rapport de test d'intrusion : fonctions PURES (aucun accès réseau ni base), testées dans
 * tests/rapport.test.ts.
 *
 * Règle impérative : un rapport ne s'assemble qu'à partir d'identifiants de scans et de pentests
 * enregistrés côté serveur, appartenant au demandeur et datant de 7 jours au plus
 * (verifierSources). Aucun chiffre envoyé par le navigateur n'y entre.
 */
import { masquerSecrets } from "./masquage";

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

// ---------- Assemblage ----------

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

export type Constat = {
  ref: string;
  source: "pentest" | "scan";
  titre: string;
  severite: Severite;
  cvss: number | null;
  cible: string;
  description: string;
  remediation: string;
  effort: "rapide" | "moyen" | "important" | null;
  references: string[];
  statut: string;
  /** Preuve d'exploitation (masquée) : document authentifié seulement, jamais dans les exports. */
  preuve: string | null;
};

export type EtapePlan = { rang: number; ref: string; titre: string; severite: Severite; effort: Constat["effort"]; echeance: string };

export type ModeleRapport = {
  titre: string;
  genereLe: string;
  perimetre: string[];
  periode: { debut: string; fin: string } | null;
  comptes: Record<Severite, number>;
  risque: { niveau: "critique" | "eleve" | "modere" | "faible" | "aucun"; libelle: string; explication: string };
  constats: Constat[];
  plan: EtapePlan[];
  methode: {
    outils: string[];
    scans: { id: string; cible: string; date: string; approfondi: boolean; score: number | null }[];
    pentests: { id: string; cible: string; mode: string; debut: string | null; fin: string | null }[];
    nonTeste: string[];
  };
};

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
  if (typeof v === "string") return masquerSecrets(v);
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string").map((x) => masquerSecrets(x as string)).join(" ");
  return "";
}

function preuveTexte(p: Record<string, unknown> | null): string | null {
  if (!p) return null;
  const parties = Object.entries(p)
    .map(([k, v]) => `${k} :\n${typeof v === "string" ? v : JSON.stringify(v, null, 2)}`)
    .join("\n\n");
  return parties ? masquerSecrets(parties) : null;
}

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

const ECHEANCE: Record<Severite, string> = {
  critical: "Immédiat (sous 72 h)",
  high: "Sous 2 semaines",
  medium: "Sous 3 mois",
  low: "Prochain cycle de maintenance",
  info: "À l'appréciation de l'équipe",
};
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
    .map((c, i) => ({ rang: i + 1, ref: c.ref, titre: c.titre, severite: c.severite, effort: c.effort, echeance: ECHEANCE[c.severite] }));
}

const NON_TESTE_TOUJOURS = [
  "Déni de service et tests de charge (exclus pour ne pas perturber le service).",
  "Ingénierie sociale, hameçonnage et sécurité physique.",
  "Infrastructure interne non exposée sur Internet.",
  "Hôtes hors du périmètre autorisé par écrit.",
];

export function construireRapport(
  titre: string,
  scans: ScanSource[],
  pentests: PentestSource[],
  maintenant: Date
): ModeleRapport {
  const constats: Constat[] = [];
  for (const p of pentests) {
    for (const f of p.findings) {
      if (f.status === "false_positive" || f.status === "fixed") continue;
      const pl = f.payload ?? {};
      constats.push({
        ref: `P-${p.id.slice(0, 4)}-${f.native_id}`.slice(0, 32),
        source: "pentest",
        titre: masquerSecrets(f.title || f.native_id),
        severite: sev(f.severity),
        cvss: typeof f.cvss === "number" ? f.cvss : null,
        cible: hote(p.target_url),
        description: texte(pl.description) || texte(pl.impact),
        remediation: texte(pl.remediation) || texte(pl.remediation_steps),
        effort: null,
        references: [texte(pl.cwe), texte(pl.cve)].filter(Boolean),
        statut: f.status,
        preuve:
          preuveTexte(f.preuves) ??
          (f.aPreuve ? "Preuve chiffrée présente mais illisible : la clé de chiffrement (PREUVES_KEY) a changé depuis son enregistrement." : null),
      });
    }
  }
  for (const s of scans) {
    for (const f of s.findings) {
      if (f.state !== "fail" && f.state !== "warn") continue;
      constats.push({
        ref: `S-${s.id.slice(0, 4)}-${f.id}`.slice(0, 32),
        source: "scan",
        titre: masquerSecrets(f.title),
        severite: sev(f.severity),
        cvss: null,
        cible: hote(s.target_url),
        description: masquerSecrets(f.detail || ""),
        remediation: masquerSecrets(f.recommendation || ""),
        effort: f.effort === "rapide" || f.effort === "moyen" || f.effort === "important" ? f.effort : null,
        references: [f.owasp, f.cwe].filter((x): x is string => Boolean(x)),
        statut: "open",
        preuve: null,
      });
    }
  }
  constats.sort((a, b) => RANG[b.severite] - RANG[a.severite] || (b.cvss ?? -1) - (a.cvss ?? -1));

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

  return {
    titre,
    genereLe: maintenant.toISOString(),
    perimetre: [...new Set([...scans.map((s) => hote(s.target_url)), ...pentests.map((p) => hote(p.target_url))])].sort(),
    periode: dates.length ? { debut: dates[0], fin: dates[dates.length - 1] } : null,
    comptes,
    risque: risqueGlobal(comptes),
    constats,
    plan: planRemediation(constats),
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
  l.push(`# ${m.titre}`, "", `Généré le ${m.genereLe.slice(0, 10)} · périmètre : ${m.perimetre.join(", ") || "—"}`, "");
  l.push("## Synthèse", "", `**Risque global : ${m.risque.libelle}.** ${m.risque.explication}`, "");
  l.push("| Gravité | Nombre |", "|---|---|", ...SEVERITES.map((s) => `| ${LIBELLE_SEVERITE[s]} | ${m.comptes[s]} |`), "");
  l.push("## Vulnérabilités", "");
  for (const c of m.constats) {
    l.push(`### ${md(c.titre)}`, "", `- Gravité : ${LIBELLE_SEVERITE[c.severite]}${c.cvss !== null ? ` (CVSS ${c.cvss})` : ""}`, `- Cible : ${c.cible}`, `- Référence : ${c.ref}`);
    if (c.description) l.push(`- Description : ${md(c.description)}`);
    if (c.remediation) l.push(`- Remédiation : ${md(c.remediation)}`);
    if (c.source === "pentest") l.push("- Preuve d'exploitation : consultable dans le rapport authentifié uniquement.");
    l.push("");
  }
  l.push("## Plan de remédiation", "", "| # | Constat | Gravité | Effort | Échéance suggérée |", "|---|---|---|---|---|");
  for (const e of m.plan) l.push(`| ${e.rang} | ${md(e.titre)} | ${LIBELLE_SEVERITE[e.severite]} | ${e.effort ?? "non estimé"} | ${e.echeance} |`);
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
  const tete = ["ref", "source", "titre", "gravite", "cvss", "cible", "effort", "statut", "description", "remediation", "references"];
  const lignes = m.constats.map((c) =>
    [c.ref, c.source, c.titre, LIBELLE_SEVERITE[c.severite], c.cvss, c.cible, c.effort, c.statut, c.description, c.remediation, c.references.join(" ")]
      .map(celluleCsv)
      .join(",")
  );
  return [tete.join(","), ...lignes].join("\r\n");
}
