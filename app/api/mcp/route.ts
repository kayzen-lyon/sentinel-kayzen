import { NextResponse } from "next/server";
import { dbConfigured } from "@/lib/db";
import { verifyApiKey } from "@/lib/apikeys";
import { getUserById } from "@/lib/users";
import { validateTargetUrl } from "@/lib/ssrf";
import { runScan } from "@/lib/scanner";
import { createScanRecord, completeScan, listScans } from "@/lib/scans";
import { isHostVerified } from "@/lib/domains";
import { createJob, getJob, listFindings } from "@/lib/jobs";
import { canManage, ensurePersonalOrg, getOrg, getRole } from "@/lib/orgs";
import { getPlaybook, PLAYBOOKS } from "@/lib/playbooks";
import { appBaseUrl, dispatchWorkerRun, githubConfigured } from "@/lib/github";
import { checkRateLimit } from "@/lib/ratelimit";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Serveur MCP (Model Context Protocol) exposant le moteur Sentinel à un client IA
 * (Claude Desktop, Cursor…) via JSON-RPC 2.0 sur HTTP. Authentifié par clé API
 * (`Authorization: Bearer sntl_…`). Outils : passive_scan, list_scans, launch_pentest, get_pentest.
 */

const SERVER_INFO = { name: "sentinel-by-kayzen", version: "1.0.0" };
const PROTOCOL_VERSION = "2024-11-05";

type Json = Record<string, unknown>;
type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

const text = (v: unknown): ToolResult => ({
  content: [{ type: "text", text: typeof v === "string" ? v : JSON.stringify(v, null, 2) }],
});

const TOOLS = [
  {
    name: "passive_scan",
    description:
      "Analyse passive et non-intrusive de la posture de sécurité d'une URL (en-têtes, TLS, " +
      "cookies, CORS, expositions). Renvoie une note A→F, un score /100 et les findings.",
    inputSchema: {
      type: "object",
      properties: { url: { type: "string", description: "URL cible (http/https)" } },
      required: ["url"],
    },
  },
  {
    name: "list_scans",
    description: "Liste les scans passifs récents de l'utilisateur.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "launch_pentest",
    description:
      "Lance un pentest autonome (moteur Strix) sur un DOMAINE VÉRIFIÉ. Optionnellement un " +
      "playbook (" +
      PLAYBOOKS.map((p) => p.id).join(", ") +
      "). Renvoie l'identifiant de job.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL cible (domaine vérifié)" },
        playbook: { type: "string", description: "Identifiant de playbook (optionnel)" },
      },
      required: ["url"],
    },
  },
  {
    name: "get_pentest",
    description: "Statut et findings d'un pentest autonome par identifiant de job.",
    inputSchema: {
      type: "object",
      properties: { jobId: { type: "string" } },
      required: ["jobId"],
    },
  },
];

async function callTool(
  userId: string,
  userEmail: string,
  req: Request,
  name: string,
  args: Json
): Promise<ToolResult> {
  switch (name) {
    case "passive_scan": {
      const check = await validateTargetUrl(String(args.url || ""));
      if (!check.ok) return { ...text(`Erreur : ${check.reason}`), isError: true };
      const deep = await isHostVerified(userId, check.url.hostname).catch(() => false);
      const scanId = await createScanRecord(userId, check.url.toString(), deep).catch(
        () => null
      );
      const result = await runScan(check.url, { deep });
      if (scanId) await completeScan(scanId, result).catch(() => {});
      return text({
        grade: result.grade,
        score: result.score,
        target: result.summary.finalUrl,
        counts: result.summary.counts,
        findings: result.findings
          .filter((f) => f.state === "fail" || f.state === "warn")
          .map((f) => ({ title: f.title, severity: f.severity, detail: f.detail })),
      });
    }

    case "list_scans": {
      const scans = await listScans(userId);
      return text(
        scans.map((s) => ({
          id: s.id,
          target: s.target_url,
          grade: s.grade,
          score: s.score,
          status: s.status,
          created_at: s.created_at,
        }))
      );
    }

    case "launch_pentest": {
      const check = await validateTargetUrl(String(args.url || ""));
      if (!check.ok) return { ...text(`Erreur : ${check.reason}`), isError: true };
      const verified = await isHostVerified(userId, check.url.hostname).catch(() => false);
      if (!verified)
        return {
          ...text(
            "Refusé : le pentest autonome n'est autorisé que sur un domaine dont la propriété " +
              "est vérifiée dans Sentinel."
          ),
          isError: true,
        };
      // Même quota que la voie web (2 lancements offensifs / heure).
      const rl = await checkRateLimit(`job:${userId}`, 2, 3600);
      if (!rl.allowed)
        return {
          ...text(
            `Limite de lancements atteinte. Réessayez dans ${rl.retryAfter ?? 60}s.`
          ),
          isError: true,
        };

      const playbook = getPlaybook(args.playbook ? String(args.playbook) : null);
      const mode = playbook ? playbook.mode : "standard";
      const instruction = playbook?.instruction ?? null;
      const orgId = await ensurePersonalOrg(userId, userEmail).catch(() => null);

      // Même verrou de gouvernance que la voie web : si l'organisation exige une approbation et
      // que le demandeur n'est pas gestionnaire, le run attend une validation (pas de dispatch).
      const org = orgId ? await getOrg(orgId).catch(() => null) : null;
      const role = orgId ? await getRole(orgId, userId).catch(() => null) : null;
      const needsApproval = Boolean(org?.require_approval) && !canManage(role);

      const jobId = await createJob(
        userId,
        check.url.toString(),
        mode,
        orgId,
        needsApproval ? "pending_approval" : "queued",
        playbook?.id ?? null,
        instruction
      );
      await logAudit({
        orgId,
        actorId: userId,
        actorEmail: userEmail,
        action: needsApproval ? "pentest.pending" : "pentest.launch",
        target: check.url.hostname,
        meta: { mode, jobId, via: "mcp" },
      });
      if (needsApproval)
        return text({
          jobId,
          status: "pending_approval",
          message:
            "Pentest en attente d'approbation par un administrateur de l'organisation avant exécution.",
        });
      if (githubConfigured) {
        await dispatchWorkerRun({
          jobId,
          target: check.url.toString(),
          mode,
          ingestUrl: `${appBaseUrl(req)}/api/jobs/ingest`,
          instruction: instruction ?? undefined,
        }).catch(() => {});
      }
      return text({ jobId, status: "queued", queuedOnly: !githubConfigured });
    }

    case "get_pentest": {
      const job = await getJob(String(args.jobId || ""), userId);
      if (!job) return { ...text("Job introuvable."), isError: true };
      const findings = await listFindings(job.id);
      return text({
        status: job.status,
        target: job.target_url,
        costUsd: job.cost_usd,
        findings: findings.map((f) => ({
          title: f.title,
          severity: f.severity,
          cvss: f.cvss,
          status: f.status,
        })),
      });
    }

    default:
      return { ...text(`Outil inconnu : ${name}`), isError: true };
  }
}

export async function POST(req: Request) {
  if (!dbConfigured)
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });

  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const userId = await verifyApiKey(token);
  if (!userId)
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32001, message: "Clé API invalide." } },
      { status: 401 }
    );

  let msg: { jsonrpc?: string; id?: unknown; method?: string; params?: Json };
  try {
    msg = await req.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error." } },
      { status: 400 }
    );
  }

  const { id, method, params } = msg;
  const reply = (result: unknown) => NextResponse.json({ jsonrpc: "2.0", id, result });
  const fail = (code: number, message: string) =>
    NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } });

  // Notifications (sans id) : pas de réponse.
  if (id === undefined || id === null) {
    return new Response(null, { status: 202 });
  }

  switch (method) {
    case "initialize":
      return reply({
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });
    case "ping":
      return reply({});
    case "tools/list":
      return reply({ tools: TOOLS });
    case "tools/call": {
      const p = (params || {}) as { name?: string; arguments?: Json };
      if (!p.name) return fail(-32602, "Nom d'outil manquant.");
      try {
        const email = (await getUserById(userId).catch(() => null))?.email || "";
        const result = await callTool(userId, email, req, p.name, p.arguments || {});
        return reply(result);
      } catch (e) {
        return reply({
          content: [
            { type: "text", text: `Erreur : ${e instanceof Error ? e.message : "échec"}` },
          ],
          isError: true,
        });
      }
    }
    default:
      return fail(-32601, `Méthode non supportée : ${method}`);
  }
}
