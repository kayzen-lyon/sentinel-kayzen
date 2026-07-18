import { ensureSchema, query, dbConfigured } from "./db";

export type RateResult = { allowed: boolean; remaining: number; retryAfter?: number };

/**
 * Rate-limiting fenêtre glissante, stocké en Postgres (fiable entre instances serverless).
 * Si la base n'est pas configurée, on laisse passer (fail-open) — l'endpoint gère l'absence de DB.
 */
export async function checkRateLimit(
  bucket: string,
  limit: number,
  windowSec: number
): Promise<RateResult> {
  if (!dbConfigured) return { allowed: true, remaining: limit };
  try {
    await ensureSchema();
    const rows = await query<{ count: string; oldest: string | null }>(
      `SELECT count(*)::int AS count, min(created_at) AS oldest
         FROM rate_events
        WHERE bucket = $1 AND created_at > now() - ($2 || ' seconds')::interval`,
      [bucket, String(windowSec)]
    );
    const count = Number(rows[0]?.count ?? 0);
    if (count >= limit) {
      const oldest = rows[0]?.oldest ? new Date(rows[0].oldest).getTime() : Date.now();
      const retryAfter = Math.max(
        1,
        Math.ceil((oldest + windowSec * 1000 - Date.now()) / 1000)
      );
      return { allowed: false, remaining: 0, retryAfter };
    }
    await query(`INSERT INTO rate_events (bucket) VALUES ($1)`, [bucket]);
    // nettoyage opportuniste
    await query(
      `DELETE FROM rate_events WHERE bucket = $1 AND created_at < now() - ($2 || ' seconds')::interval`,
      [bucket, String(windowSec)]
    ).catch(() => {});
    return { allowed: true, remaining: limit - count - 1 };
  } catch {
    return { allowed: true, remaining: limit };
  }
}

/** Extrait une IP client raisonnable derrière le proxy Vercel. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
