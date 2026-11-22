import type { Finding, ScanResult } from "./scanner";
import type { ScanInsights } from "./insights/types";

/**
 * Alertes de surveillance (module pur) : compare un scan au précédent de la même cible.
 * - échéance franchie : le certificat ou le domaine passe sous 30, 14, 7 ou 3 jours
 *   (franchissement de seuil : pas de répétition à chaque exécution) ;
 * - nouveau problème critique ou élevé absent du scan précédent.
 * Items 94 à 96 de docs/AMELIORATIONS-SCAN-DASHBOARD.md.
 */

const THRESHOLDS = [30, 14, 7, 3];

/** Seuil franchi entre deux mesures (le plus bas atteint), ou null. */
export function crossedThreshold(prev: number | undefined, now: number | undefined): number | null {
  if (now === undefined) return null;
  const crossed = THRESHOLDS.filter((t) => now < t && (prev === undefined || prev >= t));
  // Sans mesure précédente, on n'alerte que si l'échéance est réellement proche.
  if (prev === undefined && now >= 14) return null;
  return crossed.length ? Math.min(...crossed) : null;
}

export type Previous = { findings: Finding[] | null; insights?: ScanInsights | null } | null;

export function monitoringAlerts(host: string, result: ScanResult, prev: Previous): string[] {
  const out: string[] = [];
  const i = result.insights;
  const p = prev?.insights ?? undefined;

  const cert = i?.tls?.cert?.daysRemaining;
  if (crossedThreshold(p?.tls?.cert?.daysRemaining, cert) !== null)
    out.push(`le certificat TLS de ${host} expire dans ${cert} jour(s)`);

  const dom = i?.domain?.daysToExpiry;
  if (crossedThreshold(p?.domain?.daysToExpiry, dom) !== null)
    out.push(`le nom de domaine de ${host} expire dans ${dom} jour(s)`);

  if (prev?.findings) {
    const before = new Set(prev.findings.filter((f) => f.state === "fail" || f.state === "warn").map((f) => f.id));
    const fresh = result.findings.filter(
      (f) => f.state === "fail" && (f.severity === "critical" || f.severity === "high") && !before.has(f.id)
    );
    for (const f of fresh.slice(0, 5)) out.push(`nouveau problème ${f.severity === "critical" ? "critique" : "élevé"} sur ${host} : ${f.title}`);
  }
  return out;
}
