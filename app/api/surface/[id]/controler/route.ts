import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { getActiveOrg } from "@/lib/activeorg";
import { canLaunch } from "@/lib/orgs";
import { checkRateLimit } from "@/lib/ratelimit";
import { controlerCible, listCibles } from "@/lib/attaque/surveillance";

export const runtime = "nodejs";
export const maxDuration = 90;

/** « Contrôler maintenant » : un passage immédiat (autorisation écrite revérifiée côté serveur). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  const { orgId, role } = await getActiveOrg(session);
  if (!canLaunch(role)) return NextResponse.json({ error: "Rôle insuffisant." }, { status: 403 });
  const rl = await checkRateLimit(`surface-now:${session.id}`, 6, 3600);
  if (!rl.allowed) return NextResponse.json({ error: "Six contrôles manuels par heure au plus." }, { status: 429 });
  const { id } = await params;
  const cible = (await listCibles(orgId)).find((c) => c.id === id);
  if (!cible) return NextResponse.json({ error: "Cible introuvable." }, { status: 404 });
  const r = await controlerCible(cible, "manuel");
  return NextResponse.json(r);
}
