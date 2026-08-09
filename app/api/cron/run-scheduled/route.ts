import { NextResponse } from "next/server";
import { dbConfigured } from "@/lib/db";
import { runDueScheduledScans } from "@/lib/scheduled";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Point d'entrée Cron (Vercel) : exécute les surveillances planifiées dues.
 * Sécurisé par `CRON_SECRET` (Vercel envoie `Authorization: Bearer <CRON_SECRET>`).
 * Sans secret configuré, l'endpoint est fermé (503) pour éviter tout déclenchement public.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return NextResponse.json({ error: "Cron non configuré (CRON_SECRET)." }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  if (!dbConfigured)
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });

  const result = await runDueScheduledScans();
  return NextResponse.json({ ok: true, ...result });
}
