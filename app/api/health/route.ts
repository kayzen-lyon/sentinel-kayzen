import { NextResponse } from "next/server";
import { dbConfigured, query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sonde de santé pour supervision / load-balancer.
 * 200 si l'app répond et que la base (si configurée) est joignable, 503 sinon.
 */
export async function GET() {
  const startedAt = Date.now();
  let db: "ok" | "unconfigured" | "error" = "unconfigured";
  if (dbConfigured) {
    try {
      await query("SELECT 1");
      db = "ok";
    } catch {
      db = "error";
    }
  }
  const healthy = db !== "error";
  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      db,
      uptimeSeconds: Math.round(process.uptime()),
      responseMs: Date.now() - startedAt,
      time: new Date().toISOString(),
    },
    {
      status: healthy ? 200 : 503,
      headers: { "cache-control": "no-store" },
    }
  );
}
