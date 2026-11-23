import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { chargerRapport } from "@/lib/rapports";
import { versCsv, versJson, versMarkdown } from "@/lib/rapport";

export const runtime = "nodejs";

const FORMATS = {
  md: { type: "text/markdown; charset=utf-8", ext: "md", rendre: versMarkdown },
  json: { type: "application/json; charset=utf-8", ext: "json", rendre: versJson },
  csv: { type: "text/csv; charset=utf-8", ext: "csv", rendre: versCsv },
} as const;

/** Exports Markdown, JSON et CSV : authentifiés, sans aucune preuve d'exploitation. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new Response("Non authentifié.", { status: 401 });
  if (!dbConfigured) return new Response("Base non configurée.", { status: 503 });
  const format = new URL(req.url).searchParams.get("format") || "md";
  if (!(format in FORMATS)) return new Response("Format inconnu (md, json, csv).", { status: 400 });
  const { id } = await params;
  const r = await chargerRapport(session.id, id);
  if (!r) return new Response("Introuvable.", { status: 404 });
  const f = FORMATS[format as keyof typeof FORMATS];
  const corps = f.rendre(r.modele);
  return new Response(format === "csv" ? "﻿" + corps : corps, {
    headers: {
      "content-type": f.type,
      "content-disposition": `attachment; filename="rapport-pentest-${id.slice(0, 8)}.${f.ext}"`,
      "cache-control": "private, no-store",
    },
  });
}
