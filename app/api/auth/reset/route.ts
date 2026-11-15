import { NextResponse } from "next/server";
import { dbConfigured } from "@/lib/db";
import { getUserById, markEmailVerified, updatePassword } from "@/lib/users";
import { hashPassword, validatePassword } from "@/lib/password";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";
import { consumeAuthToken } from "@/lib/authtokens";
import { ensurePersonalOrg } from "@/lib/orgs";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!dbConfigured)
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });

  const rl = await checkRateLimit(`reset:${clientIp(req)}`, 10, 3600);
  if (!rl.allowed)
    return NextResponse.json({ error: "Trop de tentatives. Réessayez plus tard." }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as { token?: string; password?: string };
  // Validation du mot de passe AVANT de consommer le jeton : une erreur de saisie
  // ne doit pas « brûler » le lien.
  const pwErr = validatePassword(body.password || "");
  if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 });

  const userId = await consumeAuthToken(body.token || "", "reset");
  if (!userId)
    return NextResponse.json(
      { error: "Lien invalide, expiré ou déjà utilisé. Refaites une demande." },
      { status: 400 }
    );

  await updatePassword(userId, await hashPassword(body.password!));
  // Recevoir le lien prouve l'accès à la boîte mail.
  await markEmailVerified(userId);

  const user = await getUserById(userId);
  const orgId = user
    ? await ensurePersonalOrg(user.id, user.name || user.email).catch(() => null)
    : null;
  await logAudit({
    orgId,
    actorId: userId,
    actorEmail: user?.email ?? null,
    action: "auth.password_reset",
  });
  return NextResponse.json({ ok: true });
}
