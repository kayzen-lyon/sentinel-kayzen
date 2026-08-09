import { NextResponse } from "next/server";
import { dbConfigured } from "@/lib/db";
import { createUser, findUserByEmail } from "@/lib/users";
import {
  hashPassword,
  validateEmail,
  validatePassword,
} from "@/lib/password";
import {
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";
import { ensurePersonalOrg } from "@/lib/orgs";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!dbConfigured) {
    return NextResponse.json(
      { error: "Base de données non configurée. Ajoutez DATABASE_URL (Neon)." },
      { status: 503 }
    );
  }

  const rl = await checkRateLimit(`signup:${clientIp(req)}`, 6, 3600);
  if (!rl.allowed)
    return NextResponse.json(
      { error: "Trop de créations de compte. Réessayez plus tard." },
      { status: 429 }
    );
  let body: { email?: string; password?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  const name = (body.name || "").trim() || null;

  if (!validateEmail(email))
    return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
  const pwErr = validatePassword(password);
  if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 });

  try {
    if (await findUserByEmail(email))
      return NextResponse.json(
        { error: "Un compte existe déjà avec cet e-mail." },
        { status: 409 }
      );
    const user = await createUser(email, await hashPassword(password), name);
    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
    });
    const res = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
    });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    const orgId = await ensurePersonalOrg(user.id, user.name || user.email).catch(() => null);
    await logAudit({
      orgId,
      actorId: user.id,
      actorEmail: user.email,
      action: "auth.signup",
    });
    return res;
  } catch (e) {
    return NextResponse.json(
      { error: "Erreur serveur lors de l'inscription." },
      { status: 500 }
    );
  }
}
