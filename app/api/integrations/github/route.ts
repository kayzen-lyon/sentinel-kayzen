import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { listInstallationsForUser } from "@/lib/ghinstall";
import { appInstallUrl, githubAppConfigured } from "@/lib/githubApp";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const installations = dbConfigured ? await listInstallationsForUser(session.id) : [];
  return NextResponse.json({
    configured: githubAppConfigured,
    installUrl: appInstallUrl(),
    installations,
  });
}
