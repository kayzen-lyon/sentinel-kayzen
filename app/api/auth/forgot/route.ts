import { NextResponse } from "next/server";
import { dbConfigured } from "@/lib/db";
import { findUserByEmail } from "@/lib/users";
import { validateEmail } from "@/lib/password";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";
import { issueAuthToken, TOKEN_TTL_MINUTES } from "@/lib/authtokens";
import { emailConfigured, resetPasswordEmail, sendEmail } from "@/lib/email";
import { publicOrigin } from "@/lib/origin";

export const runtime = "nodejs";

/**
 * Demande de réinitialisation. Réponse identique que le compte existe ou non
 * (pas d'énumération des comptes). `emailConfigured` indique seulement si l'envoi
 * d'e-mails est activé sur le service, pour un message honnête côté interface.
 */
export async function POST(req: Request) {
  if (!dbConfigured)
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });

  const rl = await checkRateLimit(`forgot:${clientIp(req)}`, 5, 3600);
  if (!rl.allowed)
    return NextResponse.json({ error: "Trop de demandes. Réessayez plus tard." }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const email = (body.email || "").trim().toLowerCase();
  if (!validateEmail(email))
    return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });

  // Limite par adresse aussi : évite d'inonder une boîte mail depuis plusieurs IP.
  const perEmail = await checkRateLimit(`forgot-mail:${email}`, 3, 3600);
  if (perEmail.allowed && emailConfigured) {
    const user = await findUserByEmail(email);
    if (user) {
      const token = await issueAuthToken(user.id, "reset");
      await sendEmail(
        user.email,
        "Réinitialisation de votre mot de passe Sentinel",
        resetPasswordEmail(`${publicOrigin(req)}/reinitialiser/${token}`, TOKEN_TTL_MINUTES.reset)
      );
    }
  }
  return NextResponse.json({ ok: true, emailConfigured });
}
