import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { validateTargetUrl } from "@/lib/ssrf";
import { runScan } from "@/lib/scanner";
import { createScanRecord, completeScan, failScan, listScans } from "@/lib/scans";
import { isHostVerified } from "@/lib/domains";
import { checkRateLimit } from "@/lib/ratelimit";
import { canLaunch } from "@/lib/orgs";
import { getActiveOrg } from "@/lib/activeorg";
import { refusSansAutorisation } from "@/lib/autorisations";
import { checkQuota } from "@/lib/plans";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ scans: [] });
  const scans = await listScans(session.id);
  return NextResponse.json({ scans });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  // Rate-limiting : 8 scans / 10 min par utilisateur
  const rl = await checkRateLimit(`scan:${session.id}`, 8, 600);
  if (!rl.allowed)
    return NextResponse.json(
      {
        error: `Limite de scans atteinte. Réessayez dans ${rl.retryAfter ?? 60}s.`,
      },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } }
    );

  const check = await validateTargetUrl(body.url || "");
  if (!check.ok)
    return NextResponse.json({ error: check.reason }, { status: 400 });

  // Scan approfondi uniquement si le domaine est vérifié dans l'organisation active
  // (et pas pour un Lecteur : les contrôles approfondis sondent activement la cible).
  let deep = false;
  let scanOrgId: string | null = null;
  if (dbConfigured) {
    const active = await getActiveOrg(session).catch(() => null);
    if (active) {
      scanOrgId = active.orgId;
      const quota = await checkQuota(active.orgId, "passiveScans").catch(() => null);
      if (quota) return NextResponse.json({ error: quota }, { status: 402 });
    }
    // Approfondi = test actif : propriété vérifiée ET autorisation écrite du client en cours.
    deep = active
      ? canLaunch(active.role) &&
        (await isHostVerified(active.orgId, check.url.hostname).catch(() => false)) &&
        !(await refusSansAutorisation(active.orgId, check.url.hostname).catch(() => "erreur"))
      : false;
  }

  const persist = dbConfigured;
  let scanId: string | null = null;
  if (persist) {
    try {
      scanId = await createScanRecord(session.id, check.url.toString(), deep, scanOrgId);
    } catch {
      // on continue même si la persistance échoue
    }
  }

  try {
    const result = await runScan(check.url, { deep });
    if (scanId) await completeScan(scanId, result).catch(() => {});
    return NextResponse.json({ id: scanId, result, deep });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Échec du scan de la cible.";
    if (scanId) await failScan(scanId, message).catch(() => {});
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
