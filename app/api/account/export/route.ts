import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { checkRateLimit } from "@/lib/ratelimit";
import { exportUserData } from "@/lib/account";

export const runtime = "nodejs";

/** Export de ses données (RGPD art. 15 et 20), en JSON téléchargeable. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });

  const rl = await checkRateLimit(`export:${session.id}`, 5, 3600);
  if (!rl.allowed)
    return NextResponse.json({ error: "Trop de demandes. Réessayez plus tard." }, { status: 429 });

  const data = await exportUserData(session.id);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="sentinel-mes-donnees-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
}
