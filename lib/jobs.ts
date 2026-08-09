import { ensureSchema, query } from "./db";

export type JobStatus =
  | "pending_approval"
  | "queued"
  | "running"
  | "done"
  | "error"
  | "cancelled";
export type JobMode = "standard" | "deep";

export type JobRow = {
  id: string;
  user_id: string;
  org_id: string | null;
  target_url: string;
  mode: JobMode;
  status: JobStatus;
  run_name: string | null;
  cost_usd: number | null;
  report_md: string | null;
  error: string | null;
  agents_graph: unknown;
  playbook: string | null;
  instruction: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

export type FindingStatus = "open" | "fixed" | "accepted" | "false_positive";

export type JobFindingRow = {
  id: string;
  job_id: string;
  native_id: string;
  title: string | null;
  severity: string | null;
  cvss: number | null;
  status: FindingStatus;
  payload: unknown;
  created_at: string;
};

export type IngestFinding = {
  nativeId: string;
  title?: string;
  severity?: string;
  cvss?: number;
  payload?: unknown;
};

export async function createJob(
  userId: string,
  targetUrl: string,
  mode: JobMode,
  orgId: string | null,
  status: JobStatus = "queued",
  playbook: string | null = null,
  instruction: string | null = null
): Promise<string> {
  await ensureSchema();
  const rows = await query<{ id: string }>(
    `INSERT INTO jobs (user_id, target_url, mode, status, org_id, playbook, instruction)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [userId, targetUrl, mode, status, orgId, playbook, instruction]
  );
  return rows[0].id;
}

/** Jobs visibles par l'utilisateur : les siens + ceux des organisations dont il est membre. */
export async function listJobs(userId: string): Promise<JobRow[]> {
  await ensureSchema();
  return query<JobRow>(
    `SELECT * FROM jobs
     WHERE user_id = $1
        OR org_id IN (SELECT org_id FROM org_members WHERE user_id = $1)
     ORDER BY created_at DESC LIMIT 50`,
    [userId]
  );
}

/** Accès à un job si l'utilisateur en est propriétaire ou membre de son organisation. */
export async function getJob(id: string, userId: string): Promise<JobRow | null> {
  await ensureSchema();
  const rows = await query<JobRow>(
    `SELECT * FROM jobs
     WHERE id = $1
       AND (user_id = $2
            OR org_id IN (SELECT org_id FROM org_members WHERE user_id = $2))`,
    [id, userId]
  );
  return rows[0] ?? null;
}

/** Change le statut d'un finding (open/fixed/accepted/false_positive). */
export async function setFindingStatus(
  jobId: string,
  nativeId: string,
  status: FindingStatus
): Promise<void> {
  await ensureSchema();
  await query(
    `UPDATE job_findings SET status = $3 WHERE job_id = $1 AND native_id = $2`,
    [jobId, nativeId, status]
  );
}

/** Récupère un job par id seul (contexte worker, sans session utilisateur). */
export async function getJobSystem(id: string): Promise<JobRow | null> {
  await ensureSchema();
  const rows = await query<JobRow>(`SELECT * FROM jobs WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function listFindings(
  jobId: string,
  sinceIso?: string
): Promise<JobFindingRow[]> {
  await ensureSchema();
  if (sinceIso) {
    return query<JobFindingRow>(
      `SELECT * FROM job_findings WHERE job_id = $1 AND created_at > $2
       ORDER BY created_at ASC`,
      [jobId, sinceIso]
    );
  }
  return query<JobFindingRow>(
    `SELECT * FROM job_findings WHERE job_id = $1 ORDER BY created_at ASC`,
    [jobId]
  );
}

/** Met à jour l'état d'un job (contexte worker). */
export async function updateJobSystem(
  id: string,
  patch: {
    status?: JobStatus;
    runName?: string;
    costUsd?: number;
    reportMd?: string;
    error?: string;
    agentsGraph?: unknown;
  }
): Promise<void> {
  await ensureSchema();
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  const push = (col: string, val: unknown) => {
    sets.push(`${col} = $${i++}`);
    vals.push(val);
  };
  if (patch.status) {
    push("status", patch.status);
    if (patch.status === "running") sets.push("started_at = COALESCE(started_at, now())");
    if (patch.status === "done" || patch.status === "error" || patch.status === "cancelled")
      sets.push("completed_at = now()");
  }
  if (patch.runName !== undefined) push("run_name", patch.runName);
  if (patch.costUsd !== undefined) push("cost_usd", patch.costUsd);
  if (patch.reportMd !== undefined) push("report_md", patch.reportMd);
  if (patch.error !== undefined) push("error", patch.error);
  if (patch.agentsGraph !== undefined)
    push("agents_graph", JSON.stringify(patch.agentsGraph));
  if (!sets.length) return;
  vals.push(id);
  await query(`UPDATE jobs SET ${sets.join(", ")} WHERE id = $${i}`, vals);
}

/** Passe un job en file d'exécution (après approbation). */
export async function approveJob(id: string): Promise<void> {
  await ensureSchema();
  await query(`UPDATE jobs SET status = 'queued' WHERE id = $1 AND status = 'pending_approval'`, [
    id,
  ]);
}

/** Insère/actualise les findings d'un job (upsert idempotent par native_id, contexte worker). */
export async function upsertFindingsSystem(
  jobId: string,
  findings: IngestFinding[]
): Promise<number> {
  await ensureSchema();
  let inserted = 0;
  for (const f of findings) {
    if (!f.nativeId) continue;
    const rows = await query<{ id: string }>(
      `INSERT INTO job_findings (job_id, native_id, title, severity, cvss, payload)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (job_id, native_id) DO UPDATE
         SET title = EXCLUDED.title, severity = EXCLUDED.severity,
             cvss = EXCLUDED.cvss, payload = EXCLUDED.payload
       RETURNING (xmax = 0) AS id`,
      [
        jobId,
        f.nativeId,
        f.title ?? null,
        f.severity ?? null,
        typeof f.cvss === "number" ? f.cvss : null,
        f.payload ? JSON.stringify(f.payload) : null,
      ]
    );
    if (rows[0]?.id) inserted++;
  }
  return inserted;
}
