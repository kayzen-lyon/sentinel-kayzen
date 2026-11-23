import { NextResponse } from "next/server";
import { dbConfigured } from "@/lib/db";
import { runDueScheduledScans } from "@/lib/scheduled";
import { runMaintenance } from "@/lib/maintenance";
import { controlerSurfacesDues } from "@/lib/attaque/surveillance";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
// 300 s : durée maximale par défaut des fonctions Vercel (Fluid Compute), y compris sur l'offre Hobby.
export const maxDuration = 300;

/**
 * Point d'entrée Cron (Vercel) : exécute les surveillances planifiées dues.
 * Sécurisé par `CRON_SECRET` (Vercel envoie `Authorization: Bearer <CRON_SECRET>`).
 * Sans secret configuré, l'endpoint est fermé (503) pour éviter tout déclenchement public.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return NextResponse.json({ error: "Cron non configuré (CRON_SECRET)." }, { status: 503 });
  if (!bearerOk(req.headers.get("authorization"), secret))
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  if (!dbConfigured)
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });

  const debut = Date.now();
  const result = await runDueScheduledScans();
  // Surface d'attaque : budget de temps restant (marge de 30 s), plus anciennes d'abord.
  const surface = await controlerSurfacesDues(Math.max(0, 270_000 - (Date.now() - debut))).catch(() => null);
  const maintenance = await runMaintenance().catch(() => null);
  return NextResponse.json({ ok: true, ...result, surface, maintenance });
}

/** Comparaison en temps constant (évite de deviner le secret à la milliseconde près). */
function bearerOk(header: string | null, secret: string): boolean {
  if (!header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}
