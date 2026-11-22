import { ensureSchema, query } from "./db";
import { redactDeep, redactSecrets } from "./redact";

/** Journal d'audit : trace horodatée des actions sensibles (conformité / gouvernance). */

export type AuditRow = {
  id: string;
  org_id: string | null;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  target: string | null;
  meta: unknown;
  created_at: string;
};

export type AuditEvent = {
  orgId?: string | null;
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  target?: string | null;
  meta?: Record<string, unknown>;
};

/** Enregistre un évènement d'audit (best-effort : ne fait jamais échouer l'action métier). */
export async function logAudit(e: AuditEvent): Promise<void> {
  try {
    await ensureSchema();
    await query(
      `INSERT INTO audit_log (org_id, actor_id, actor_email, action, target, meta)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        e.orgId ?? null,
        e.actorId ?? null,
        e.actorEmail ?? null,
        e.action,
        // Le journal ne doit jamais conserver un secret en clair.
        redactSecrets(e.target ?? null),
        e.meta ? JSON.stringify(redactDeep(e.meta)) : null,
      ]
    );
  } catch {
    /* journalisation best-effort */
  }
}

/** Derniers évènements d'audit d'une organisation. */
export async function listAudit(orgId: string, limit = 100): Promise<AuditRow[]> {
  await ensureSchema();
  return query<AuditRow>(
    `SELECT * FROM audit_log WHERE org_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [orgId, limit]
  );
}
