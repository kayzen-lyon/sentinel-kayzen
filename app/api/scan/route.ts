import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { validateTargetUrl } from "@/lib/ssrf";
import { runScan } from "@/lib/scanner";
import { createScanRecord, completeScan, failScan, listScans } from "@/lib/scans";

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

  const check = await validateTargetUrl(body.url || "");
  if (!check.ok)
    return NextResponse.json({ error: check.reason }, { status: 400 });

  const persist = dbConfigured;
  let scanId: string | null = null;
  if (persist) {
    try {
      scanId = await createScanRecord(session.id, check.url.toString());
    } catch {
      // on continue même si la persistance échoue
    }
  }

  try {
    const result = await runScan(check.url);
    if (scanId) await completeScan(scanId, result).catch(() => {});
    return NextResponse.json({ id: scanId, result });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Échec du scan de la cible.";
    if (scanId) await failScan(scanId, message).catch(() => {});
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
