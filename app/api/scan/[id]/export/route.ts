import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { getScan } from "@/lib/scans";
import { findingsToCsv, findingsToJUnit, type NormFinding } from "@/lib/findingsFormat";

export const runtime = "nodejs";

/** Un scan ne retient que les contrôles en échec ou en alerte pour l'export. */
function normalize(scan: { findings: { id: string; title: string; severity: string; state: string; category?: string; detail?: string; recommendation?: string }[] | null }): NormFinding[] {
  return (scan.findings || [])
    .filter((f) => f.state === "fail" || f.state === "warn")
    .map((f) => ({
      id: f.id,
      title: f.title,
      severity: f.severity,
      category: f.category ?? null,
      detail: f.detail ?? null,
      recommendation: f.recommendation ?? null,
    }));
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Historique indisponible." }, { status: 503 });

  const { id } = await params;
  const scan = await getScan(session.id, id);
  if (!scan) return NextResponse.json({ error: "Scan introuvable." }, { status: 404 });

  const format = new URL(req.url).searchParams.get("format") || "json";
  const base = `sentinel-scan-${id.slice(0, 8)}`;
  const target = scan.final_url || scan.target_url;

  if (format === "csv")
    return new Response(findingsToCsv(normalize(scan)), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${base}.csv"`,
      },
    });
  if (format === "junit")
    return new Response(findingsToJUnit("Sentinel scan", target, normalize(scan)), {
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "content-disposition": `attachment; filename="${base}.junit.xml"`,
      },
    });
  return new Response(JSON.stringify({ scan }, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${base}.json"`,
    },
  });
}
