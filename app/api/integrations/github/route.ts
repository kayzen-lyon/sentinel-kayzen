import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { confirmerInstallation, listInstallationsForUser } from "@/lib/ghinstall";
import { logAudit } from "@/lib/audit";
import { moteurIaActif } from "@/lib/github";
import { appInstallUrl, githubAppConfigured } from "@/lib/githubApp";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const installations = dbConfigured ? await listInstallationsForUser(session.id) : [];
  return NextResponse.json({
    configured: githubAppConfigured,
    installUrl: appInstallUrl(),
    installations,
    analysePr: moteurIaActif(),
  });
}

/** Le responsable confirme qu'il peut faire analyser les dépôts de son installation. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  const body = (await req.json().catch(() => ({}))) as { installationId?: unknown; confirme?: unknown };
  const id = Number(body.installationId);
  if (!Number.isSafeInteger(id) || id <= 0 || body.confirme !== true)
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  const inst = await confirmerInstallation(id, session.id);
  if (!inst) return NextResponse.json({ error: "Installation introuvable." }, { status: 404 });
  await logAudit({
    orgId: inst.org_id,
    actorId: session.id,
    actorEmail: session.email,
    action: "github.confirmed",
    target: String(id),
  });
  return NextResponse.json({ ok: true, confirme_le: inst.confirme_le });
}
