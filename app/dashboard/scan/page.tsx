import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { listScans } from "@/lib/scans";
import DashboardClient from "@/components/dashboard/DashboardClient";

export const metadata: Metadata = {
  title: "Scanner",
  robots: { index: false, follow: false },
};

export default async function ScanPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/scan");

  let initialScans: Awaited<ReturnType<typeof listScans>> = [];
  if (dbConfigured) {
    try {
      initialScans = await listScans(session.id);
    } catch {
      initialScans = [];
    }
  }

  return (
    <DashboardClient
      dbConfigured={dbConfigured}
      initialScans={initialScans.map((s) => ({
        id: s.id,
        target_url: s.target_url,
        grade: s.grade,
        score: s.score,
        status: s.status,
        created_at: s.created_at,
      }))}
    />
  );
}
