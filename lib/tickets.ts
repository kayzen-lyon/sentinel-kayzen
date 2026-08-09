import { ensureSchema, query } from "./db";
import { validateTargetUrl } from "./ssrf";

/** Création de tickets Jira / Linear à partir des findings d'un pentest. */

export type TicketConfig = {
  jira_base_url: string | null;
  jira_email: string | null;
  jira_token: string | null;
  jira_project: string | null;
  linear_key: string | null;
  linear_team: string | null;
};

export async function getTicketConfig(orgId: string): Promise<TicketConfig> {
  await ensureSchema();
  const rows = await query<TicketConfig>(
    `SELECT jira_base_url, jira_email, jira_token, jira_project, linear_key, linear_team
     FROM org_integrations WHERE org_id = $1`,
    [orgId]
  );
  return (
    rows[0] ?? {
      jira_base_url: null,
      jira_email: null,
      jira_token: null,
      jira_project: null,
      linear_key: null,
      linear_team: null,
    }
  );
}

export type TicketSettings = {
  jiraBaseUrl?: string;
  jiraEmail?: string;
  jiraToken?: string;
  jiraProject?: string;
  linearKey?: string;
  linearTeam?: string;
};

/** Enregistre la config tickets (valide l'URL Jira anti-SSRF). Retourne une erreur ou null. */
export async function setTicketConfig(
  orgId: string,
  s: TicketSettings
): Promise<string | null> {
  await ensureSchema();
  if (s.jiraBaseUrl) {
    if (!/^https:\/\//i.test(s.jiraBaseUrl)) return "L'URL Jira doit être en HTTPS.";
    const check = await validateTargetUrl(s.jiraBaseUrl);
    if (!check.ok) return `URL Jira refusée : ${check.reason}`;
  }
  await query(
    `INSERT INTO org_integrations
       (org_id, jira_base_url, jira_email, jira_token, jira_project, linear_key, linear_team, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now())
     ON CONFLICT (org_id) DO UPDATE SET
       jira_base_url = EXCLUDED.jira_base_url, jira_email = EXCLUDED.jira_email,
       jira_token = EXCLUDED.jira_token, jira_project = EXCLUDED.jira_project,
       linear_key = EXCLUDED.linear_key, linear_team = EXCLUDED.linear_team, updated_at = now()`,
    [
      orgId,
      s.jiraBaseUrl?.replace(/\/$/, "") || null,
      s.jiraEmail || null,
      s.jiraToken || null,
      s.jiraProject || null,
      s.linearKey || null,
      s.linearTeam || null,
    ]
  );
  return null;
}

export type TicketResult = { url?: string; id?: string; error?: string };

async function createJira(
  c: TicketConfig,
  title: string,
  description: string
): Promise<TicketResult> {
  if (!c.jira_base_url || !c.jira_email || !c.jira_token || !c.jira_project)
    return { error: "Jira non configuré." };
  const auth = Buffer.from(`${c.jira_email}:${c.jira_token}`).toString("base64");
  try {
    const r = await fetch(`${c.jira_base_url}/rest/api/3/issue`, {
      method: "POST",
      headers: {
        authorization: `Basic ${auth}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        fields: {
          project: { key: c.jira_project },
          issuetype: { name: "Bug" },
          summary: title.slice(0, 240),
          description: {
            type: "doc",
            version: 1,
            content: [
              { type: "paragraph", content: [{ type: "text", text: description.slice(0, 30000) }] },
            ],
          },
        },
      }),
    });
    if (!r.ok) return { error: `Jira a répondu ${r.status}.` };
    const data = (await r.json()) as { key?: string };
    return { id: data.key, url: data.key ? `${c.jira_base_url}/browse/${data.key}` : undefined };
  } catch {
    return { error: "Appel Jira échoué." };
  }
}

async function createLinear(
  c: TicketConfig,
  title: string,
  description: string
): Promise<TicketResult> {
  if (!c.linear_key || !c.linear_team) return { error: "Linear non configuré." };
  const mutation = `mutation($t:String!,$d:String,$team:String!){
    issueCreate(input:{title:$t, description:$d, teamId:$team}){ success issue { identifier url } }
  }`;
  try {
    const r = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: { authorization: c.linear_key, "content-type": "application/json" },
      body: JSON.stringify({
        query: mutation,
        variables: { t: title.slice(0, 240), d: description.slice(0, 30000), team: c.linear_team },
      }),
    });
    if (!r.ok) return { error: `Linear a répondu ${r.status}.` };
    const data = (await r.json()) as {
      data?: { issueCreate?: { success?: boolean; issue?: { identifier?: string; url?: string } } };
    };
    const issue = data.data?.issueCreate?.issue;
    return issue ? { id: issue.identifier, url: issue.url } : { error: "Création Linear refusée." };
  } catch {
    return { error: "Appel Linear échoué." };
  }
}

export async function createTicket(
  orgId: string,
  system: "jira" | "linear",
  title: string,
  description: string
): Promise<TicketResult> {
  const cfg = await getTicketConfig(orgId);
  return system === "jira"
    ? createJira(cfg, title, description)
    : createLinear(cfg, title, description);
}
