import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { getJob, listFindings } from "@/lib/jobs";
import { latestSurface } from "@/lib/scans";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });

  const { id } = await params;
  const job = await getJob(id, session.id);
  if (!job) return NextResponse.json({ error: "Job introuvable." }, { status: 404 });
  const findings = await listFindings(id);
  // Carte de surface du dernier scan approfondi de la cible : base du registre de couverture.
  let surface = null;
  try {
    surface = await latestSurface(session.id, job.org_id, new URL(job.target_url).hostname);
  } catch {
    surface = null;
  }
  return NextResponse.json({ job, findings, surface });
}
