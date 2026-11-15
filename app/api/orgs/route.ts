import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { getRole, listUserOrgs } from "@/lib/orgs";
import { getActiveOrg, ORG_COOKIE, orgCookieOptions } from "@/lib/activeorg";

export const runtime = "nodejs";

/** Organisations de l'utilisateur + organisation active (sélecteur de la console). */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ orgs: [], activeOrgId: null });
  const active = await getActiveOrg(session);
  const orgs = await listUserOrgs(session.id);
  return NextResponse.json({ orgs, activeOrgId: active.orgId });
}

/** Change d'organisation active (uniquement vers une organisation dont on est membre). */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as { orgId?: string };
  const orgId = body.orgId || "";
  if (!(await getRole(orgId, session.id).catch(() => null)))
    return NextResponse.json({ error: "Organisation introuvable." }, { status: 404 });

  const res = NextResponse.json({ ok: true, activeOrgId: orgId });
  res.cookies.set(ORG_COOKIE, orgId, orgCookieOptions());
  return res;
}
