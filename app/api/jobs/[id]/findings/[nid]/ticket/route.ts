import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { getJob, listFindings } from "@/lib/jobs";
import { createTicket } from "@/lib/tickets";
import { checkRateLimit } from "@/lib/ratelimit";
import { logAudit } from "@/lib/audit";
import { canLaunch, getRole } from "@/lib/orgs";
import { redactSecrets } from "@/lib/redact";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; nid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });

  const { id, nid } = await params;
  const job = await getJob(id, session.id);
  if (!job) return NextResponse.json({ error: "Job introuvable." }, { status: 404 });
  if (!job.org_id)
    return NextResponse.json({ error: "Aucune organisation associée." }, { status: 400 });
  // Créer un ticket chez Jira/Linear avec les identifiants de l'organisation : pas pour un Lecteur.
  if (!canLaunch(await getRole(job.org_id, session.id).catch(() => null)))
    return NextResponse.json({ error: "Droits insuffisants (Lecteur)." }, { status: 403 });

  const rl = await checkRateLimit(`ticket:${session.id}`, 30, 3600);
  if (!rl.allowed) return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as { system?: string };
  const system = body.system === "linear" ? "linear" : "jira";

  const findings = await listFindings(id);
  const f = findings.find((x) => x.native_id === nid);
  if (!f) return NextResponse.json({ error: "Finding introuvable." }, { status: 404 });

  const p = (f.payload || {}) as Record<string, unknown>;
  const str = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : "");
  const host = (() => {
    try {
      return new URL(job.target_url).host;
    } catch {
      return job.target_url;
    }
  })();

  const title = `[${(f.severity || "info").toUpperCase()}] ${f.title || f.native_id} — ${host}`;
  const description = [
    `Cible : ${job.target_url}`,
    f.cvss ? `CVSS : ${f.cvss}` : "",
    "",
    str("description") || str("impact"),
    "",
    str("remediation") ||
      (Array.isArray(p.remediation_steps) ? (p.remediation_steps as string[]).join("\n") : ""),
    "",
    "— Généré par Sentinel by Kayzen",
  ]
    .filter((l) => l !== undefined)
    .join("\n");

  // Le ticket part chez un tiers (Jira/Linear) : aucune preuve, secrets masqués.
  const result = await createTicket(job.org_id, system, redactSecrets(title), redactSecrets(description));
  if (result.error) return NextResponse.json({ error: result.error }, { status: 502 });

  await logAudit({
    orgId: job.org_id,
    actorId: session.id,
    actorEmail: session.email,
    action: "ticket.created",
    target: nid,
    meta: { system, url: result.url },
  });
  return NextResponse.json({ ok: true, url: result.url, id: result.id });
}
