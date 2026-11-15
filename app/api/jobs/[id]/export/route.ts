import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { getJob, listFindings, type JobFindingRow } from "@/lib/jobs";
import { dedupeFindings, findingsToCsv, findingsToJUnit, type NormFinding } from "@/lib/findingsFormat";

export const runtime = "nodejs";

function sarifLevel(sev: string | null): string {
  switch ((sev || "").toLowerCase()) {
    case "critical":
    case "high":
      return "error";
    case "medium":
      return "warning";
    default:
      return "note";
  }
}

function toSarif(target: string, findings: JobFindingRow[]): string {
  return JSON.stringify(
    {
      $schema: "https://json.schemastore.org/sarif-2.1.0.json",
      version: "2.1.0",
      runs: [
        {
          tool: {
            driver: {
              name: "Sentinel by Kayzen",
              informationUri: "https://sentinel.kayzen-lyon.com",
              rules: [],
            },
          },
          results: findings.map((f) => ({
            ruleId: f.native_id,
            level: sarifLevel(f.severity),
            message: { text: f.title || f.native_id },
            properties: { severity: f.severity, cvss: f.cvss, status: f.status, target },
          })),
        },
      ],
    },
    null,
    2
  );
}

/** Findings d'un pentest sous la forme normalisée commune (puis dédupliqués). */
function normalize(findings: JobFindingRow[]): NormFinding[] {
  return dedupeFindings(
    findings.map((f) => ({
      id: f.native_id,
      title: f.title || f.native_id,
      severity: f.severity,
      cvss: f.cvss,
      status: f.status,
    }))
  );
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });

  const { id } = await params;
  const job = await getJob(id, session.id);
  if (!job) return NextResponse.json({ error: "Job introuvable." }, { status: 404 });

  const findings = await listFindings(id);
  const format = new URL(req.url).searchParams.get("format") || "json";
  const base = `sentinel-pentest-${id.slice(0, 8)}`;

  if (format === "sarif")
    return new Response(toSarif(job.target_url, findings), {
      headers: {
        "content-type": "application/sarif+json; charset=utf-8",
        "content-disposition": `attachment; filename="${base}.sarif"`,
      },
    });
  if (format === "csv")
    return new Response(findingsToCsv(normalize(findings)), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${base}.csv"`,
      },
    });
  if (format === "junit")
    return new Response(findingsToJUnit("Sentinel pentest", job.target_url, normalize(findings)), {
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "content-disposition": `attachment; filename="${base}.junit.xml"`,
      },
    });
  return new Response(JSON.stringify({ job, findings }, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${base}.json"`,
    },
  });
}
