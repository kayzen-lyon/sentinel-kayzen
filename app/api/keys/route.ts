import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { checkRateLimit } from "@/lib/ratelimit";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/apikeys";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ keys: [] });
  return NextResponse.json({ keys: await listApiKeys(session.id) });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });

  const rl = await checkRateLimit(`apikey:${session.id}`, 10, 3600);
  if (!rl.allowed) return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const created = await createApiKey(session.id, (body.name || "").trim() || null);
  // Le token complet n'est renvoyé qu'ici, une seule fois.
  return NextResponse.json({ token: created.token, keys: await listApiKeys(session.id) });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as { id?: string };
  if (!body.id) return NextResponse.json({ error: "id requis." }, { status: 400 });
  await revokeApiKey(body.id, session.id);
  return NextResponse.json({ ok: true, keys: await listApiKeys(session.id) });
}
