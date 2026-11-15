/**
 * Formats d'export et déduplication des findings, partagés entre le scan passif
 * et le pentest autonome. Forme normalisée commune pour n'écrire chaque format
 * (CSV, JUnit, SARIF) qu'une fois.
 */

export type NormFinding = {
  id: string;
  title: string;
  severity: string | null;
  category?: string | null;
  detail?: string | null;
  recommendation?: string | null;
  cvss?: number | null;
  status?: string | null;
};

const SEVERITY_RANK: Record<string, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

function rank(sev: string | null | undefined): number {
  return SEVERITY_RANK[(sev || "").toLowerCase()] ?? 0;
}

/**
 * Regroupe les findings identiques (même titre + même gravité, insensible à la
 * casse) : garde le premier, ajoute « (×N) » au titre quand il se répète. Rend
 * les rapports lisibles quand un moteur remonte plusieurs fois la même faille.
 */
export function dedupeFindings<T extends NormFinding>(findings: T[]): (T & { occurrences: number })[] {
  const byKey = new Map<string, T & { occurrences: number }>();
  for (const f of findings) {
    const key = `${(f.severity || "").toLowerCase()}|${(f.title || f.id).trim().toLowerCase()}`;
    const existing = byKey.get(key);
    if (existing) existing.occurrences += 1;
    else byKey.set(key, { ...f, occurrences: 1 });
  }
  return [...byKey.values()].sort((a, b) => rank(b.severity) - rank(a.severity));
}

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV : une ligne d'en-tête puis une ligne par finding (BOM pour Excel). */
export function findingsToCsv(findings: NormFinding[]): string {
  const header = ["id", "titre", "gravite", "categorie", "cvss", "statut", "detail", "recommandation"];
  const lines = [header.join(",")];
  for (const f of findings) {
    lines.push(
      [f.id, f.title, f.severity, f.category, f.cvss, f.status, f.detail, f.recommendation]
        .map(csvCell)
        .join(",")
    );
  }
  return "﻿" + lines.join("\r\n");
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * JUnit XML : chaque finding est un `testcase`. Les gravités critique/élevée/moyenne
 * deviennent des `failure` (fait échouer un job CI), les autres passent. Format lu
 * par GitHub Actions, GitLab CI, Jenkins… pour afficher les failles comme des tests.
 */
export function findingsToJUnit(suite: string, target: string, findings: NormFinding[]): string {
  const isFailure = (sev: string | null | undefined) => rank(sev) >= 3;
  const failures = findings.filter((f) => isFailure(f.severity)).length;
  const cases = findings
    .map((f) => {
      const name = xmlEscape(`[${(f.severity || "info").toUpperCase()}] ${f.title || f.id}`);
      const classname = xmlEscape(f.category || "security");
      if (!isFailure(f.severity)) return `    <testcase name="${name}" classname="${classname}" />`;
      const msg = xmlEscape(f.title || f.id);
      const body = xmlEscape([f.detail, f.recommendation].filter(Boolean).join("\n\n"));
      return `    <testcase name="${name}" classname="${classname}">\n      <failure message="${msg}">${body}</failure>\n    </testcase>`;
    })
    .join("\n");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<testsuites>\n` +
    `  <testsuite name="${xmlEscape(suite)}" hostname="${xmlEscape(target)}" tests="${findings.length}" failures="${failures}">\n` +
    `${cases}\n` +
    `  </testsuite>\n` +
    `</testsuites>\n`
  );
}
