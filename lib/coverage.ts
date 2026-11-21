import type { AttackClass, SurfaceItem } from "./surface";

/**
 * Registre de couverture d'un pentest : pour chaque point d'entrée de la carte de surface et
 * chaque classe d'attaque indiquée, une vulnérabilité a-t-elle été remontée ?
 *
 * Volontairement prudent : « aucune remontée » ne signifie PAS « testé et sain » — le moteur
 * autonome ne publie pas de journal de tests par point d'entrée. Le registre montre où portent
 * les résultats et où un approfondissement manuel est utile. Inspiré du « coverage ledger » de
 * Claude-BugHunter (Sachin Sharma, MIT — voir NOTICE). Module pur.
 */

const CLASS_HINT: Record<AttackClass, RegExp> = {
  "open-redirect": /redirect|redirection/i,
  lfi: /path traversal|traversal|file inclusion|\blfi\b|inclusion de fichier/i,
  ssrf: /ssrf|server[- ]side request/i,
  idor: /idor|insecure direct|access control|authori[sz]ation|contrôle d'accès|bola/i,
  sqli: /sql/i,
  xss: /xss|cross[- ]site scripting/i,
  ssti: /ssti|template injection|injection de gabarit/i,
  graphql: /graphql/i,
  "llm-ai": /prompt injection|\bllm\b|\bia\b/i,
  "auth-bypass": /auth|session|jwt|login|credential|mot de passe/i,
  websocket: /websocket/i,
  "info-leak": /disclosure|leak|exposure|exposed|fuite|divulgation/i,
  "shadow-api": /undocumented|shadow|non documentée/i,
  "forgot-password": /password reset|reset|réinitialisation/i,
  "file-upload": /upload|téléversement/i,
};

export type CoverageFinding = { title: string | null; payload: unknown; status?: string };

export type CoverageRow = {
  item: SurfaceItem;
  cells: { cls: AttackClass; hits: string[] }[];
};

export type Coverage = {
  rows: CoverageRow[];
  points: number;
  pairs: number;
  pairsWithFinding: number;
};

function str(p: unknown, k: string): string {
  if (!p || typeof p !== "object") return "";
  const v = (p as Record<string, unknown>)[k];
  return typeof v === "string" ? v : "";
}

function endpointPath(p: unknown): string {
  const e = str(p, "endpoint") || str(p, "target");
  if (!e) return "";
  try {
    return new URL(e, "https://x.invalid").pathname.toLowerCase();
  } catch {
    return e.toLowerCase();
  }
}

/** Croise la carte de surface et les findings remontés (hors faux positifs). */
export function buildCoverage(surface: SurfaceItem[], findings: CoverageFinding[]): Coverage {
  const live = findings.filter((f) => f.status !== "false_positive");
  const rows: CoverageRow[] = surface.map((item) => {
    const path = item.path.toLowerCase().replace("/…", "");
    const onPoint = live.filter((f) => {
      const ep = endpointPath(f.payload);
      return ep !== "" && path !== "/" && (ep === path || ep.startsWith(`${path}/`));
    });
    return {
      item,
      cells: item.classes.map((cls) => ({
        cls,
        hits: onPoint
          .filter((f) => CLASS_HINT[cls].test(`${f.title || ""} ${str(f.payload, "cwe")} ${str(f.payload, "description")}`))
          .map((f) => f.title || "Finding"),
      })),
    };
  });
  const pairs = rows.reduce((n, r) => n + r.cells.length, 0);
  const pairsWithFinding = rows.reduce((n, r) => n + r.cells.filter((c) => c.hits.length).length, 0);
  return { rows, points: rows.length, pairs, pairsWithFinding };
}
