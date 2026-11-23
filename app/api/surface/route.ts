import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { getActiveOrg } from "@/lib/activeorg";
import { canLaunch } from "@/lib/orgs";
import { checkRateLimit } from "@/lib/ratelimit";
import { ajouterCible, journal, listCibles, marquerLu, nonLus, retirerCible } from "@/lib/attaque/surveillance";

export const runtime = "nodejs";

/** Cibles surveillées, journal des changements (300 au plus) et nombre de changements non lus. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ cibles: [], journal: [], nonLus: 0 });
  const { orgId } = await getActiveOrg(session);
  const [cibles, j, n] = await Promise.all([listCibles(orgId), journal(orgId), nonLus(orgId)]);
  return NextResponse.json({ cibles, journal: j, nonLus: n });
}

/** { hote } : ajoute une cible ; { lu: true } : marque le journal comme lu. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  let body: { hote?: unknown; lu?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const { orgId, role } = await getActiveOrg(session);
  if (body.lu === true) {
    await marquerLu(orgId);
    return NextResponse.json({ ok: true });
  }
  if (!canLaunch(role)) return NextResponse.json({ error: "Votre rôle (Lecteur) ne permet pas d'ajouter une cible." }, { status: 403 });
  const rl = await checkRateLimit(`surface-add:${session.id}`, 30, 3600);
  if (!rl.allowed) return NextResponse.json({ error: "Trop de demandes." }, { status: 429 });
  const r = await ajouterCible(orgId, session.id, typeof body.hote === "string" ? body.hote : "");
  return "erreur" in r ? NextResponse.json({ error: r.erreur }, { status: 400 }) : NextResponse.json(r);
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  const { orgId, role } = await getActiveOrg(session);
  if (!canLaunch(role)) return NextResponse.json({ error: "Rôle insuffisant." }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  await retirerCible(orgId, id);
  return NextResponse.json({ ok: true });
}
