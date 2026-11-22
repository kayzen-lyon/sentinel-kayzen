import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { checkRateLimit } from "@/lib/ratelimit";
import { checkScheduleNow, listSchedules } from "@/lib/scheduled";

export const runtime = "nodejs";
export const maxDuration = 60;

/** « Contrôler maintenant » : contrôle immédiat d'une cible surveillée par l'utilisateur. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as { id?: string };
  if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id))
    return NextResponse.json({ error: "id requis." }, { status: 400 });

  const rl = await checkRateLimit(`sched-check:${session.id}`, 6, 3600);
  if (!rl.allowed)
    return NextResponse.json(
      { error: "Trop de contrôles manuels. Réessayez plus tard." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 3600) } }
    );

  const found = await checkScheduleNow(body.id, session.id);
  if (!found) return NextResponse.json({ error: "Surveillance introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true, schedules: await listSchedules(session.id) });
}
