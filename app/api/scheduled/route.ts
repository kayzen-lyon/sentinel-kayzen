import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { validateTargetUrl } from "@/lib/ssrf";
import { canLaunch, ensurePersonalOrg } from "@/lib/orgs";
import { getActiveOrg } from "@/lib/activeorg";
import { checkQuota } from "@/lib/plans";
import { checkRateLimit } from "@/lib/ratelimit";
import {
  createSchedule,
  deleteSchedule,
  listSchedules,
  type Frequency,
} from "@/lib/scheduled";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ schedules: [] });
  return NextResponse.json({ schedules: await listSchedules(session.id) });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });

  const rl = await checkRateLimit(`sched:${session.id}`, 20, 3600);
  if (!rl.allowed) return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as { url?: string; frequency?: string };
  const check = await validateTargetUrl(body.url || "");
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 400 });
  const frequency: Frequency = body.frequency === "weekly" ? "weekly" : "daily";

  // Alertes envoyées à l'organisation active (Lecteur : à son espace personnel).
  const active = await getActiveOrg(session).catch(() => null);
  const orgId = active
    ? canLaunch(active.role)
      ? active.orgId
      : await ensurePersonalOrg(session.id, session.name || session.email).catch(() => null)
    : null;
  if (orgId) {
    const quota = await checkQuota(orgId, "schedules");
    if (quota) return NextResponse.json({ error: quota }, { status: 402 });
  }
  const id = await createSchedule(session.id, orgId, check.url.toString(), frequency);
  return NextResponse.json({ id, schedules: await listSchedules(session.id) });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as { id?: string };
  if (!body.id) return NextResponse.json({ error: "id requis." }, { status: 400 });
  await deleteSchedule(body.id, session.id);
  return NextResponse.json({ ok: true, schedules: await listSchedules(session.id) });
}
