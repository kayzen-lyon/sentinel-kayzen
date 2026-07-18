import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { getUserById, updatePassword } from "@/lib/users";
import { hashPassword, verifyPassword, validatePassword } from "@/lib/password";
import { checkRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured)
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });

  const rl = await checkRateLimit(`pwd:${session.id}`, 10, 3600);
  if (!rl.allowed)
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez plus tard." },
      { status: 429 }
    );

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const pwErr = validatePassword(body.newPassword || "");
  if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 });

  const user = await getUserById(session.id);
  if (!user) return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });

  if (!(await verifyPassword(body.currentPassword || "", user.password_hash)))
    return NextResponse.json(
      { error: "Mot de passe actuel incorrect." },
      { status: 401 }
    );

  await updatePassword(session.id, await hashPassword(body.newPassword!));
  return NextResponse.json({ ok: true });
}
