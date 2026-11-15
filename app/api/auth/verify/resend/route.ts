import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { checkRateLimit } from "@/lib/ratelimit";
import { isEmailVerified } from "@/lib/users";
import { sendVerificationEmail } from "@/lib/emailgate";
import { publicOrigin } from "@/lib/origin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });

  if (await isEmailVerified(session.id)) return NextResponse.json({ ok: true, alreadyVerified: true });

  const rl = await checkRateLimit(`verify-resend:${session.id}`, 3, 3600);
  if (!rl.allowed)
    return NextResponse.json({ error: "Trop de demandes. Réessayez dans une heure." }, { status: 429 });

  const sent = await sendVerificationEmail(session.id, session.email, publicOrigin(req));
  if (!sent)
    return NextResponse.json({ error: "L'e-mail n'a pas pu être envoyé." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
