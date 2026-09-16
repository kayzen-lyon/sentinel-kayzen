import { NextResponse } from "next/server";
import { sendEmail, emailConfigured } from "@/lib/email";
import { validateEmail } from "@/lib/password";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

const CONTACT_TO = process.env.CONTACT_TO || "contact@kayzen-lyon.fr";

function esc(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Formulaire de contact conforme RGPD :
 * - honeypot anti-bot (champ `website` invisible) ;
 * - consentement explicite requis ;
 * - minimisation : aucune donnée stockée, seul un e-mail est transmis ;
 * - rate-limiting best-effort (3 envois/h/IP).
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  try {
    const rl = await checkRateLimit(`contact:${ip}`, 3, 3600);
    if (!rl.allowed)
      return NextResponse.json(
        { error: `Trop de demandes. Réessayez dans ${rl.retryAfter ?? 60}s.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } }
      );
  } catch {
    /* base indisponible : on n'empêche pas l'envoi (honeypot + validation protègent) */
  }

  let body: {
    name?: string;
    email?: string;
    company?: string;
    message?: string;
    consent?: boolean;
    website?: string; // honeypot
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  // Honeypot : un bot remplit ce champ caché. On simule un succès sans rien envoyer.
  if (body.website) return NextResponse.json({ ok: true });

  const name = (body.name || "").trim();
  const email = (body.email || "").trim();
  const company = (body.company || "").trim().slice(0, 120);
  const message = (body.message || "").trim();

  if (!body.consent)
    return NextResponse.json(
      { error: "Vous devez accepter le traitement de vos données pour être recontacté." },
      { status: 400 }
    );
  if (name.length < 2 || name.length > 120)
    return NextResponse.json({ error: "Nom invalide." }, { status: 400 });
  if (!validateEmail(email))
    return NextResponse.json({ error: "E-mail invalide." }, { status: 400 });
  if (message.length < 10 || message.length > 5000)
    return NextResponse.json({ error: "Message trop court (10 caractères minimum)." }, { status: 400 });

  if (!emailConfigured)
    return NextResponse.json(
      { error: "L'envoi d'e-mail n'est pas configuré. Écrivez-nous à contact@kayzen-lyon.fr." },
      { status: 503 }
    );

  const html = `<div style="font-family:system-ui,sans-serif;max-width:640px;margin:auto;color:#111">
    <h2 style="color:#b74831">Nouveau message — Sentinel by Kayzen</h2>
    <p><strong>Nom :</strong> ${esc(name)}<br>
       <strong>E-mail :</strong> ${esc(email)}<br>
       ${company ? `<strong>Société :</strong> ${esc(company)}<br>` : ""}
       <strong>IP :</strong> ${esc(ip)}</p>
    <p style="white-space:pre-wrap;background:#f6f7f9;padding:12px;border-radius:8px">${esc(message)}</p>
    <p style="color:#666;font-size:12px">Répondez directement à ${esc(email)}.</p>
  </div>`;

  const sent = await sendEmail(CONTACT_TO, `Contact site — ${name}`, html);
  if (!sent)
    return NextResponse.json({ error: "L'envoi a échoué. Réessayez plus tard." }, { status: 502 });

  return NextResponse.json({ ok: true });
}
