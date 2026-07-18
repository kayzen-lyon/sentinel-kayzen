import { ensureSchema, query } from "./db";
import type { ScanResult } from "./scanner";

export type ScanRow = {
  id: string;
  target_url: string;
  final_url: string | null;
  status: string;
  grade: string | null;
  score: number | null;
  summary: ScanResult["summary"] | null;
  findings: ScanResult["findings"] | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
};

export async function createScanRecord(
  userId: string,
  targetUrl: string
): Promise<string> {
  await ensureSchema();
  const rows = await query<{ id: string }>(
    `INSERT INTO scans (user_id, target_url, status) VALUES ($1, $2, 'running') RETURNING id`,
    [userId, targetUrl]
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
    `SELECT id, target_url, final_url, status, grade, score, summary, error, created_at, completed_at
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
