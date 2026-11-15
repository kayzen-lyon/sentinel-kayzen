/**
 * Envoi d'e-mails via Resend (tier gratuit, 100 e-mails/jour). Aucune dépendance : appel HTTP.
 * No-op silencieux si `RESEND_API_KEY` n'est pas configuré (l'app reste fonctionnelle sans e-mail).
 *
 * Variables : RESEND_API_KEY, RESEND_FROM (ex. "Sentinel <notifications@votre-domaine.fr>").
 */

export const emailConfigured = Boolean(process.env.RESEND_API_KEY);

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return false;
  const from = process.env.RESEND_FROM || "Sentinel by Kayzen <onboarding@resend.dev>";
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
      signal: ctrl.signal,
    });
    return r.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Gabarit HTML d'un rapport de pentest (résumé + findings). */
export function pentestReportEmail(opts: {
  host: string;
  status: string;
  findings: { title: string | null; severity: string | null; cvss: number | null }[];
  reportMd?: string | null;
}): string {
  const rows = opts.findings
    .map(
      (f) =>
        `<tr>
           <td style="padding:6px 10px;border-bottom:1px solid #eee">${esc(f.title || "")}</td>
           <td style="padding:6px 10px;border-bottom:1px solid #eee;text-transform:uppercase">${esc(f.severity || "")}</td>
           <td style="padding:6px 10px;border-bottom:1px solid #eee">${f.cvss ?? ""}</td>
         </tr>`
    )
    .join("");
  return `<div style="font-family:system-ui,sans-serif;max-width:640px;margin:auto;color:#111">
    <h2 style="color:#2563EB">Sentinel by Kayzen — Rapport de pentest</h2>
    <p>Cible : <strong>${esc(opts.host)}</strong> · Statut : <strong>${esc(opts.status)}</strong>
       · ${opts.findings.length} vulnérabilité(s).</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px">
      <thead><tr>
        <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #111">Vulnérabilité</th>
        <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #111">Sévérité</th>
        <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #111">CVSS</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="3" style="padding:10px">Aucune vulnérabilité.</td></tr>'}</tbody>
    </table>
    ${
      opts.reportMd
        ? `<h3 style="margin-top:24px">Rapport exécutif</h3>
           <pre style="white-space:pre-wrap;font-family:inherit;font-size:13px;background:#f6f7f9;padding:12px;border-radius:8px">${esc(
             opts.reportMd.slice(0, 8000)
           )}</pre>`
        : ""
    }
    <p style="margin-top:24px;color:#666;font-size:12px">Envoyé par Sentinel by Kayzen.</p>
  </div>`;
}

/** Gabarit HTML d'une invitation d'équipe. */
export function invitationEmail(opts: {
  orgName: string;
  inviterEmail: string;
  role: string;
  url: string;
  days: number;
}): string {
  return `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto;color:#111">
    <h2 style="color:#b7481f">Invitation à rejoindre « ${esc(opts.orgName)} » sur Sentinel</h2>
    <p>${esc(opts.inviterEmail)} vous invite à rejoindre son équipe sur Sentinel by Kayzen
       avec le rôle <strong>${esc(opts.role)}</strong>.</p>
    <p style="margin:24px 0">
      <a href="${esc(opts.url)}" style="background:#b7481f;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">Accepter l'invitation</a>
    </p>
    <p style="color:#666;font-size:13px">Ce lien est valable ${opts.days} jours et ne fonctionne qu'avec cette adresse e-mail.
       Si vous n'attendiez pas cette invitation, ignorez ce message.</p>
    <p style="margin-top:24px;color:#666;font-size:12px">Envoyé par Sentinel by Kayzen.</p>
  </div>`;
}

function actionEmail(title: string, intro: string, cta: string, url: string, footer: string): string {
  return `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto;color:#111">
    <h2 style="color:#b7481f">${esc(title)}</h2>
    <p>${esc(intro)}</p>
    <p style="margin:24px 0">
      <a href="${esc(url)}" style="background:#b7481f;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">${esc(cta)}</a>
    </p>
    <p style="color:#666;font-size:13px">${esc(footer)}</p>
    <p style="margin-top:24px;color:#666;font-size:12px">Envoyé par Sentinel by Kayzen.</p>
  </div>`;
}

export function resetPasswordEmail(url: string, minutes: number): string {
  return actionEmail(
    "Réinitialisation de votre mot de passe",
    "Une demande de réinitialisation du mot de passe de votre compte Sentinel a été faite.",
    "Choisir un nouveau mot de passe",
    url,
    `Ce lien est valable ${minutes} minutes et ne fonctionne qu'une fois. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.`
  );
}

export function verifyEmailEmail(url: string): string {
  return actionEmail(
    "Confirmez votre adresse e-mail",
    "Bienvenue sur Sentinel by Kayzen. Confirmez votre adresse pour pouvoir lancer des pentests.",
    "Confirmer mon adresse",
    url,
    "Ce lien est valable 48 heures. Si vous n'avez pas créé de compte Sentinel, ignorez ce message."
  );
}
