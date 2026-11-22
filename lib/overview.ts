import type { Finding, Severity } from "./scanner";
import type { CategoryKey, ScanInsights } from "./insights/types";
import { categoryOf } from "./insights/scoring";
import { complianceSummary, type ComplianceRow } from "./compliance";

/**
 * Agrégats de la vue d'ensemble : à partir du dernier scan de chaque cible, calcule
 * l'inventaire, les échéances, la posture e-mail, les problèmes les plus fréquents, etc.
 * Module pur (items 81 à 89 de docs/AMELIORATIONS-SCAN-DASHBOARD.md).
 */

export type ScanLite = {
  id: string;
  target_url: string;
  final_url?: string | null;
  grade: string | null;
  score: number | null;
  created_at: string;
  findings: Finding[] | null;
  insights?: ScanInsights | null;
};

export type TargetRow = {
  host: string;
  scanId: string;
  grade: string | null;
  score: number | null;
  delta: number | null;
  lastScan: string;
  problems: number;
  urgent: number;
  certDays?: number;
  certIssuer?: string;
  domainDays?: number;
  emailScore?: number;
  spf?: string;
  dmarc?: string;
  dkim?: boolean;
};

export type Overview = {
  targets: TargetRow[];
  categoryAverages: Partial<Record<CategoryKey, number>>;
  topProblems: { title: string; severity: Severity; hosts: string[]; effort?: string }[];
  quickWins: { title: string; hosts: number }[];
  byCategory: { key: CategoryKey; problems: number }[];
  compliance: ComplianceRow[];
  totals: { targets: number; problems: number; urgent: number; checks: number };
};

const RANK: Record<Severity, number> = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };

export function hostOf(u: string): string {
  try {
    return new URL(u).host;
  } catch {
    return u;
  }
}

const isProblem = (f: Finding) => f.state === "fail" || f.state === "warn";

/** `scans` : du plus récent au plus ancien. */
export function buildOverview(scans: ScanLite[]): Overview {
  const latest = new Map<string, ScanLite>();
  const previous = new Map<string, ScanLite>();
  for (const s of scans) {
    if (s.score === null) continue;
    const h = hostOf(s.final_url || s.target_url);
    if (!latest.has(h)) latest.set(h, s);
    else if (!previous.has(h)) previous.set(h, s);
  }

  const targets: TargetRow[] = [];
  const catSum: Partial<Record<CategoryKey, { sum: number; n: number }>> = {};
  const probs = new Map<string, { title: string; severity: Severity; hosts: string[]; effort?: string; priority: number }>();
  const wins = new Map<string, number>();
  const cat = new Map<CategoryKey, number>();
  const comp: { id: string; category: string; failing: boolean }[] = [];
  let checks = 0;

  for (const [host, s] of latest) {
    const findings = s.findings ?? [];
    const problems = findings.filter(isProblem);
    const i = s.insights ?? undefined;
    const prev = previous.get(host);
    checks += findings.length;
    targets.push({
      host,
      scanId: s.id,
      grade: s.grade,
      score: s.score,
      delta: prev && prev.score !== null && s.score !== null ? s.score - prev.score : null,
      lastScan: s.created_at,
      problems: problems.length,
      urgent: problems.filter((f) => f.severity === "critical" || f.severity === "high").length,
      certDays: i?.tls?.cert?.daysRemaining,
      certIssuer: i?.tls?.cert?.issuer,
      domainDays: i?.domain?.daysToExpiry,
      emailScore: i?.email?.score,
      spf: i?.email ? (i.email.spf?.all ?? "absent") : undefined,
      dmarc: i?.email ? (i.email.dmarc?.policy ?? "absent") : undefined,
      dkim: i?.email ? i.email.dkimSelectors.length > 0 : undefined,
    });
    for (const [k, v] of Object.entries(i?.categoryScores ?? {}) as [CategoryKey, number][]) {
      const c = (catSum[k] ??= { sum: 0, n: 0 });
      c.sum += v;
      c.n++;
    }
    for (const f of problems) {
      const key = f.id.startsWith("cve-") || f.id.startsWith("takeover-") ? f.id : f.title;
      const p = probs.get(key) ?? { title: f.title, severity: f.severity, hosts: [], effort: f.effort, priority: 0 };
      p.hosts.push(host);
      p.priority = Math.max(p.priority, f.priority ?? RANK[f.severity] * 10);
      probs.set(key, p);
      cat.set(categoryOf(f), (cat.get(categoryOf(f)) ?? 0) + 1);
      comp.push({ id: f.id, category: f.category, failing: true });
    }
    for (const q of i?.quickWins ?? []) wins.set(q, (wins.get(q) ?? 0) + 1);
  }

  const categoryAverages: Partial<Record<CategoryKey, number>> = {};
  for (const [k, v] of Object.entries(catSum) as [CategoryKey, { sum: number; n: number }][])
    categoryAverages[k] = Math.round(v.sum / v.n);

  targets.sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
  return {
    targets,
    categoryAverages,
    topProblems: [...probs.values()]
      .sort((a, b) => b.priority - a.priority || b.hosts.length - a.hosts.length)
      .slice(0, 10)
      .map(({ title, severity, hosts, effort }) => ({ title, severity, hosts, effort })),
    quickWins: [...wins.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([title, hosts]) => ({ title, hosts })),
    byCategory: [...cat.entries()].map(([key, problems]) => ({ key, problems })).sort((a, b) => b.problems - a.problems),
    compliance: complianceSummary(comp),
    totals: {
      targets: targets.length,
      problems: targets.reduce((n, t) => n + t.problems, 0),
      urgent: targets.reduce((n, t) => n + t.urgent, 0),
      checks,
    },
  };
}
