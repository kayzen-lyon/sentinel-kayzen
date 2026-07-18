import { NextResponse } from "next/server";
import { dbConfigured } from "@/lib/db";
import { findUserByEmail } from "@/lib/users";
import { verifyPassword, validateEmail } from "@/lib/password";
import {
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!dbConfigured) {
    return NextResponse.json(
      { error: "Base de données non configurée. Ajoutez DATABASE_URL (Neon)." },
      { status: 503 }
    );
  }

  const rl = await checkRateLimit(`login:${clientIp(req)}`, 12, 600);
  if (!rl.allowed)
    return NextResponse.json(
      { error: "Trop de tentatives de connexion. Réessayez plus tard." },
      { status: 429 }
    );
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  if (!validateEmail(email) || !password)
    return NextResponse.json(
      { error: "E-mail ou mot de passe manquant." },
      { status: 400 }
    );

  try {
    const user = await findUserByEmail(email);
    // Message générique (pas d'énumération de comptes)
    const invalid = NextResponse.json(
      { error: "E-mail ou mot de passe incorrect." },
      { status: 401 }
    );
    if (!user) return invalid;
    if (!(await verifyPassword(password, user.password_hash))) return invalid;

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
    });
    const res = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
    });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
