import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { ensurePersonalOrg } from "@/lib/orgs";
import { upsertInstallation } from "@/lib/ghinstall";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * Callback de fin d'installation de la GitHub App. GitHub redirige ici avec `installation_id`.
 * On relie l'installation au compte Sentinel connecté, puis on renvoie vers la page intégrations.
 */
export async function GET(req: Request) {
  const session = await getSession();
  const url = new URL(req.url);
  const installationId = Number(url.searchParams.get("installation_id"));

  if (!session)
    return NextResponse.redirect(
      new URL(`/login?next=/dashboard/integrations`, url.origin)
    );
  if (!dbConfigured || !installationId)
    return NextResponse.redirect(new URL(`/dashboard/integrations`, url.origin));

  const orgId = await ensurePersonalOrg(session.id, session.name || session.email).catch(
    () => null
  );
  await upsertInstallation(installationId, null, orgId, session.id);
  await logAudit({
    orgId,
    actorId: session.id,
    actorEmail: session.email,
    action: "github.installed",
    target: String(installationId),
  });

  return NextResponse.redirect(new URL(`/dashboard/integrations?installed=1`, url.origin));
}
