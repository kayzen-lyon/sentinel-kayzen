import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { listDomains, requestVerification } from "@/lib/domains";
import { checkRateLimit } from "@/lib/ratelimit";
import { canLaunch } from "@/lib/orgs";
import { getActiveOrg } from "@/lib/activeorg";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ domains: [] });
  const { orgId } = await getActiveOrg(session);
  const domains = await listDomains(orgId);
  return NextResponse.json({ domains });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured)
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });

  const rl = await checkRateLimit(`domain:${session.id}`, 20, 3600);
  if (!rl.allowed)
    return NextResponse.json(
      { error: "Trop de demandes. Réessayez plus tard." },
      { status: 429 }
    );

  let body: { domain?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  try {
    const { orgId, role } = await getActiveOrg(session);
    if (!canLaunch(role))
      return NextResponse.json(
        { error: "Votre rôle (Lecteur) ne permet pas d'ajouter un domaine à cette organisation." },
        { status: 403 }
      );
    const { domain, token } = await requestVerification(orgId, session.id, body.domain || "");
    return NextResponse.json({
      domain,
      token,
      instructions: {
        dns: {
          type: "TXT",
          name: `_sentinel-verify.${domain}`,
          value: token,
        },
        file: {
          url: `https://${domain}/.well-known/sentinel-verify.txt`,
          content: token,
        },
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur." },
      { status: 400 }
    );
  }
}
