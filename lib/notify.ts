import { ensureSchema, query } from "./db";
import { safeFetch, validateTargetUrl } from "./ssrf";
import { open, seal } from "./secretbox";

/** Intégrations de notification sortantes par organisation (Slack + webhook générique). */

export type OrgIntegrations = {
  slack_url: string | null;
  webhook_url: string | null;
};

/** URLs déchiffrées — usage serveur uniquement, ne jamais les renvoyer au navigateur (voir hint()). */
export async function getIntegrations(orgId: string): Promise<OrgIntegrations> {
  await ensureSchema();
  const rows = await query<OrgIntegrations>(
    `SELECT slack_url, webhook_url FROM org_integrations WHERE org_id = $1`,
    [orgId]
  );
  const r = rows[0];
  return { slack_url: open(r?.slack_url), webhook_url: open(r?.webhook_url) };
}

/** Valide une URL de webhook (https + hôte public, anti-SSRF). Retourne un message d'erreur ou null. */
async function validateWebhook(url: string): Promise<string | null> {
  if (!url) return null;
  if (!/^https:\/\//i.test(url)) return "Le webhook doit être en HTTPS.";
  const check = await validateTargetUrl(url);
  if (!check.ok) return `URL de webhook refusée : ${check.reason}`;
  return null;
}

/**
 * Met à jour les webhooks. Pour chaque champ : `undefined` = conserver l'actuel,
 * `""` = supprimer, sinon nouvelle URL (validée anti-SSRF puis chiffrée).
 */
export async function setIntegrations(
  orgId: string,
  slackUrl: string | undefined,
  webhookUrl: string | undefined
): Promise<string | null> {
  await ensureSchema();
  const err =
    (await validateWebhook(slackUrl || "")) || (await validateWebhook(webhookUrl || ""));
  if (err) return err;
  const current = await getIntegrations(orgId);
  const slack = slackUrl === undefined ? current.slack_url : slackUrl;
  const hook = webhookUrl === undefined ? current.webhook_url : webhookUrl;
  await query(
    `INSERT INTO org_integrations (org_id, slack_url, webhook_url, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (org_id) DO UPDATE
       SET slack_url = EXCLUDED.slack_url, webhook_url = EXCLUDED.webhook_url, updated_at = now()`,
    [orgId, seal(slack), seal(hook)]
  );
  return null;
}

async function post(url: string, body: unknown): Promise<void> {
  // Re-validation anti-SSRF à l'envoi (le DNS a pu changer depuis l'enregistrement)
  // et aucune redirection suivie. Notifications best-effort : un échec est ignoré.
  await safeFetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    redirect: "manual",
    timeoutMs: 8000,
  });
}

export type NotifyPayload = {
  event: string;
  text: string;
  data?: Record<string, unknown>;
};

/** Envoie une notification aux intégrations configurées de l'organisation (best-effort). */
export async function notifyOrg(orgId: string | null, payload: NotifyPayload): Promise<void> {
  if (!orgId) return;
  try {
    const integ = await getIntegrations(orgId);
    const tasks: Promise<void>[] = [];
    if (integ.slack_url) tasks.push(post(integ.slack_url, { text: payload.text }));
    if (integ.webhook_url)
      tasks.push(
        post(integ.webhook_url, {
          event: payload.event,
          text: payload.text,
          ...payload.data,
        })
      );
    await Promise.all(tasks);
  } catch {
    /* best-effort */
  }
}
