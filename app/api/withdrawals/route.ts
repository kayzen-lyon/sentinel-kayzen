import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { dbConfigured, ensureSchema, query } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getSession } from "@/lib/auth";
import { validateEmail } from "@/lib/password";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";
import { STATEMENT_TEXT, formatReceivedAt } from "@/lib/withdrawal";

export const runtime = "nodejs";

const OPERATOR_TO = process.env.CONTACT_TO || "contact@kayzen-lyon.fr";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Reçoit une déclaration de rétractation en ligne.
 * 1. Revalide les trois champs (nom, contrat, e-mail) — rien d'autre n'est exigé.
 * 2. Enregistre la déclaration avec l'heure de réception du serveur (preuve du délai).
 * 3. Envoie l'accusé de réception sur support durable (e-mail reprenant le contenu,
 *    la date et l'heure) et prévient l'exploitant.
 * Sans base de données, rien n'est enregistré : on renvoie une erreur (jamais un faux succès).
 */
export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json"))
    return NextResponse.json({ error: "Requête invalide." }, { status: 415 });

  try {
    const rl = await checkRateLimit(`withdrawal:${clientIp(req)}`, 10, 3600);
    if (!rl.allowed)
      return NextResponse.json(
        { error: "Trop de demandes. Réessayez dans quelques minutes." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } }
      );
  } catch {
    /* base indisponible : l'insertion ci-dessous échouera proprement */
  }

  let body: { name?: unknown; contractId?: unknown; email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const name = String(body.name ?? "").trim();
  const contractId = String(body.contractId ?? "").trim();
  const email = String(body.email ?? "").trim();
  if (!name || name.length > 200 || !contractId || contractId.length > 200 || !validateEmail(email))
    return NextResponse.json({ error: "Déclaration incomplète." }, { status: 400 });

  if (!dbConfigured)
    return NextResponse.json({ error: "Enregistrement indisponible." }, { status: 503 });

  const reference = `RET-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
  const session = await getSession().catch(() => null);
  let receivedAt: string;
  try {
    await ensureSchema();
    const rows = await query<{ received_at: Date }>(
      `INSERT INTO withdrawals (reference, name, contract_id, email, user_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING received_at`,
      [reference, name, contractId, email, session?.id ?? null]
    );
    receivedAt = new Date(rows[0].received_at).toISOString();
  } catch {
    return NextResponse.json({ error: "Enregistrement impossible." }, { status: 500 });
  }

  const when = formatReceivedAt(receivedAt);
  const content = `<p>${esc(STATEMENT_TEXT)}</p>
    <table cellpadding="6" style="border-collapse:collapse">
      <tr><th align="left">Nom</th><td>${esc(name)}</td></tr>
      <tr><th align="left">Contrat concerné</th><td>${esc(contractId)}</td></tr>
      <tr><th align="left">Adresse pour la confirmation</th><td>${esc(email)}</td></tr>
    </table>`;

  const ackSent = await sendEmail(
    email,
    `Accusé de réception de votre rétractation — ${reference}`,
    `<div style="font-family:system-ui,sans-serif;max-width:640px;margin:auto;color:#111">
      <h1 style="font-size:20px">Accusé de réception de votre rétractation</h1>
      <p>Nous avons reçu votre déclaration de rétractation le <strong>${esc(when)}</strong>.</p>
      <p>Référence : <strong>${esc(reference)}</strong></p>
      <h2 style="font-size:16px">Contenu de votre déclaration</h2>
      ${content}
      <p>Conservez ce message : il fait foi de la date et de l'heure de votre rétractation.</p>
      <p style="color:#555;font-size:13px">Sentinel by Kayzen — Kayzen Web, Tarek BELHADJ (EI) — contact@kayzen-lyon.fr</p>
    </div>`
  );
  if (ackSent)
    await query(`UPDATE withdrawals SET ack_sent = true WHERE reference = $1`, [reference]).catch(() => {});

  await sendEmail(
    OPERATOR_TO,
    `Rétractation reçue — ${reference}`,
    `<div style="font-family:system-ui,sans-serif">
      <p>Rétractation reçue le ${esc(when)} (référence ${esc(reference)}).
      Accusé de réception au consommateur : ${ackSent ? "envoyé" : "<strong>NON envoyé — à envoyer manuellement</strong>"}.</p>
      ${content}
    </div>`
  );

  return NextResponse.json({ receivedAt, reference, ackSent });
}
