import { ensureSchema, query } from "./db";
import type { ScanResult } from "./scanner";
import type { SurfaceItem } from "./surface";

export type ScanRow = {
  id: string;
  target_url: string;
  final_url: string | null;
  status: string;
  grade: string | null;
  score: number | null;
  deep: boolean | null;
  summary: ScanResult["summary"] | null;
  findings: ScanResult["findings"] | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
};

export async function createScanRecord(
  userId: string,
  targetUrl: string,
  deep = false,
  /** Organisation qui consomme le scan (quota mensuel). Absent : non décompté (surveillances). */
  orgId: string | null = null
): Promise<string> {
  await ensureSchema();
  const rows = await query<{ id: string }>(
    `INSERT INTO scans (user_id, target_url, status, deep, org_id) VALUES ($1, $2, 'running', $3, $4) RETURNING id`,
    [userId, targetUrl, deep, orgId]
  );
  return rows[0].id;
}

export async function completeScan(
  id: string,
  result: ScanResult
): Promise<void> {
  await query(
    `UPDATE scans SET status='done', final_url=$2, grade=$3, score=$4,
       summary=$5, findings=$6, completed_at=now() WHERE id=$1`,
    [
      id,
      result.summary.finalUrl,
      result.grade,
      result.score,
      JSON.stringify(result.summary),
      JSON.stringify(result.findings),
    ]
  );
}

export async function failScan(id: string, message: string): Promise<void> {
  await query(
    `UPDATE scans SET status='error', error=$2, completed_at=now() WHERE id=$1`,
    [id, message]
  );
}

export async function listScans(userId: string): Promise<ScanRow[]> {
  await ensureSchema();
  return query<ScanRow>(
    `SELECT id, target_url, final_url, status, grade, score, deep, summary, error, created_at, completed_at
       FROM scans WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`,
    [userId]
  );
}

export async function getScan(
  userId: string,
  id: string
): Promise<ScanRow | null> {
  await ensureSchema();
  const rows = await query<ScanRow>(
    `SELECT * FROM scans WHERE id=$1 AND user_id=$2`,
    [id, userId]
  );
  return rows[0] ?? null;
}

/**
 * Carte de surface du dernier scan approfondi terminé d'un hôte, dans une organisation
 * (ou, à défaut, pour l'utilisateur). Sert à cibler le pentest autonome et à calculer sa couverture.
 */
export async function latestSurface(
  userId: string,
  orgId: string | null,
  hostname: string
): Promise<SurfaceItem[] | null> {
  await ensureSchema();
  const rows = await query<{ final_url: string | null; target_url: string; findings: ScanResult["findings"] | null }>(
    `SELECT final_url, target_url, findings FROM scans
      WHERE status = 'done' AND deep = true
        AND (($2::uuid IS NOT NULL AND org_id = $2) OR user_id = $1)
      ORDER BY created_at DESC LIMIT 20`,
    [userId, orgId]
  );
  const host = hostname.toLowerCase();
  for (const r of rows) {
    let h = "";
    try {
      h = new URL(r.final_url || r.target_url).hostname.toLowerCase();
    } catch {
      continue;
    }
    if (h !== host) continue;
    const f = (r.findings || []).find((x) => x.id === "attack-surface");
    if (f?.surface?.length) return f.surface;
  }
  return null;
}
