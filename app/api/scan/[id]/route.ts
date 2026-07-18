import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { getScan } from "@/lib/scans";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!dbConfigured)
    return NextResponse.json({ error: "Historique indisponible." }, { status: 503 });
  const { id } = await params;
  const scan = await getScan(session.id, id);
  if (!scan)
    return NextResponse.json({ error: "Scan introuvable." }, { status: 404 });
  return NextResponse.json({ scan });
}
