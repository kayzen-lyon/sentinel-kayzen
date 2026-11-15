import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured, query } from "@/lib/db";
import { getScan } from "@/lib/scans";
import { diffFindings } from "@/lib/scanDiff";

export const runtime = "nodejs";

/**
 * Compare un scan à un scan de référence du même utilisateur.
 * `?baseline=<id>` choisit la référence ; sans lui, c'est le scan terminé précédent
 * de la même cible.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Historique indisponible." }, { status: 503 });

  const { id } = await params;
  const current = await getScan(session.id, id);
  if (!current) return NextResponse.json({ error: "Scan introuvable." }, { status: 404 });

  let baselineId = new URL(req.url).searchParams.get("baseline");
  if (!baselineId) {
    const prev = await query<{ id: string }>(
      `SELECT id FROM scans
        WHERE user_id = $1 AND target_url = $2 AND status = 'done'
          AND created_at < $3 AND id <> $4
        ORDER BY created_at DESC LIMIT 1`,
      [session.id, current.target_url, current.created_at, current.id]
    );
    baselineId = prev[0]?.id ?? null;
  }
  if (!baselineId)
    return NextResponse.json({ error: "Aucun scan précédent de cette cible à comparer." }, { status: 404 });

  const baseline = await getScan(session.id, baselineId);
  if (!baseline) return NextResponse.json({ error: "Scan de référence introuvable." }, { status: 404 });

  const diff = diffFindings(baseline.findings || [], current.findings || []);
  return NextResponse.json({
    current: { id: current.id, created_at: current.created_at, score: current.score, grade: current.grade },
    baseline: { id: baseline.id, created_at: baseline.created_at, score: baseline.score, grade: baseline.grade },
    counts: { added: diff.added.length, fixed: diff.fixed.length, persisting: diff.persisting.length },
    ...diff,
  });
}
