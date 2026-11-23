import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { getActiveOrg } from "@/lib/activeorg";
import { checkRateLimit } from "@/lib/ratelimit";
import { logAudit } from "@/lib/audit";
import { creerRapport, listRapports, sourcesEligibles, supprimerRapport } from "@/lib/rapports";

export const runtime = "nodejs";

/** Rapports de l'utilisateur et sources éligibles (scans et pentests terminés depuis 7 jours au plus). */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ rapports: [], sources: { scans: [], pentests: [] } });
  const [rapports, sources] = await Promise.all([listRapports(session.id), sourcesEligibles(session.id)]);
  return NextResponse.json({ rapports, sources });
}

/**
 * Crée un rapport à partir d'IDENTIFIANTS seulement : tout chiffre est relu côté serveur.
 * Corps : { titre, scanIds: string[], jobIds: string[] }.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  const rl = await checkRateLimit(`rapport:${session.id}`, 30, 3600);
  if (!rl.allowed) return NextResponse.json({ error: "Trop de demandes. Réessayez plus tard." }, { status: 429 });
  let body: { titre?: unknown; scanIds?: unknown; jobIds?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  const { orgId } = await getActiveOrg(session);
  const r = await creerRapport(session.id, orgId, {
    titre: typeof body.titre === "string" ? body.titre : "",
    scanIds: ids(body.scanIds),
    jobIds: ids(body.jobIds),
  });
  if ("erreurs" in r) return NextResponse.json({ error: r.erreurs.join(" ") }, { status: 400 });
  await logAudit({ orgId, actorId: session.id, actorEmail: session.email, action: "rapport.create", target: r.id }).catch(() => {});
  return NextResponse.json({ id: r.id });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id") || "";
  const ok = dbConfigured && (await supprimerRapport(session.id, id));
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Introuvable." }, { status: 404 });
}
