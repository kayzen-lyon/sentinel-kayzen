/**
 * Relecture contradictoire des findings du pentest autonome.
 *
 * Après le run Strix, le worker (worker/github-actions/validate_findings.py) soumet chaque
 * finding à un second modèle chargé de le RÉFUTER à partir de la seule preuve fournie (aucune
 * requête vers la cible). Son verdict et sa gravité recalibrée sont joints au payload sous
 * `_sentinel_validation`. Principe repris du validateur adversarial de Claude-BugHunter
 * (Sachin Sharma, MIT — voir NOTICE). Module pur.
 */

export type ValidationVerdict = "confirmed" | "doubtful" | "rejected";

export type Validation = {
  verdict: ValidationVerdict;
  severity?: string;
  reason?: string;
};

export const VALIDATION_LABEL: Record<ValidationVerdict, { label: string; tone: string }> = {
  confirmed: { label: "Preuve confirmée", tone: "safe" },
  doubtful: { label: "Preuve à vérifier", tone: "warn" },
  rejected: { label: "Preuve réfutée", tone: "risk" },
};

const SEVERITIES = new Set(["critical", "high", "medium", "low", "info"]);

/** Verdict de relecture porté par le payload d'un finding, s'il existe. */
export function validationOf(payload: unknown): Validation | null {
  if (!payload || typeof payload !== "object") return null;
  const v = (payload as Record<string, unknown>)._sentinel_validation;
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  if (r.verdict !== "confirmed" && r.verdict !== "doubtful" && r.verdict !== "rejected") return null;
  const sev = typeof r.severity === "string" ? r.severity.toLowerCase() : undefined;
  return {
    verdict: r.verdict,
    severity: sev && SEVERITIES.has(sev) ? sev : undefined,
    reason: typeof r.reason === "string" ? r.reason.slice(0, 400) : undefined,
  };
}
