import { NextResponse } from "next/server";
import { getSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { getUserById } from "@/lib/users";
import { verifyPassword } from "@/lib/password";
import { checkRateLimit } from "@/lib/ratelimit";
import { deleteAccount } from "@/lib/account";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

/** Suppression de son compte (RGPD art. 17). Mot de passe exigé : action irréversible. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });

  const rl = await checkRateLimit(`delete-account:${session.id}`, 5, 3600);
  if (!rl.allowed)
    return NextResponse.json({ error: "Trop de tentatives. Réessayez plus tard." }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as { password?: string };
  const user = await getUserById(session.id);
  if (!user) return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
  if (!(await verifyPassword(body.password || "", user.password_hash)))
    return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });

  const err = await deleteAccount(session.id);
  if (err) return NextResponse.json({ error: err }, { status: 409 });

  // Trace sans donnée personnelle : le compte n'existe plus.
  await logAudit({ action: "account.deleted" });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
  return res;
}
