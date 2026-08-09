import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { getJob, listFindings } from "@/lib/jobs";
import { emailConfigured, pentestReportEmail, sendEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  if (!emailConfigured)
    return NextResponse.json(
      { error: "Envoi d'e-mail non configuré (RESEND_API_KEY)." },
      { status: 503 }
    );

  const rl = await checkRateLimit(`email:${session.id}`, 10, 3600);
  if (!rl.allowed) return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });

  const { id } = await params;
  const job = await getJob(id, session.id);
  if (!job) return NextResponse.json({ error: "Job introuvable." }, { status: 404 });

  const findings = await listFindings(id);
  const host = (() => {
    try {
      return new URL(job.target_url).host;
    } catch {
      return job.target_url;
    }
  })();

  const ok = await sendEmail(
    session.email,
    `Sentinel — rapport de pentest ${host}`,
    pentestReportEmail({
      host,
      status: job.status,
      findings: findings.map((f) => ({
        title: f.title,
        severity: f.severity,
        cvss: f.cvss,
      })),
      reportMd: job.report_md,
    })
  );
  if (!ok) return NextResponse.json({ error: "Échec de l'envoi." }, { status: 502 });
  return NextResponse.json({ ok: true, sentTo: session.email });
}
