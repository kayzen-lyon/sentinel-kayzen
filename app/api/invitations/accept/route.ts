import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { checkRateLimit } from "@/lib/ratelimit";
import { acceptInvitation } from "@/lib/invitations";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });

  const rl = await checkRateLimit(`invite-accept:${session.id}`, 10, 3600);
  if (!rl.allowed) return NextResponse.json({ error: "Trop de tentatives." }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as { token?: string };
  const res = await acceptInvitation(body.token || "", session);
  if (res.error || !res.orgId)
    return NextResponse.json({ error: res.error || "Échec." }, { status: 400 });

  await logAudit({
    orgId: res.orgId,
    actorId: session.id,
    actorEmail: session.email,
    action: "team.invite_accepted",
    target: session.email,
  });
  return NextResponse.json({ ok: true });
}
