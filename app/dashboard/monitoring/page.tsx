import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import MonitoringPanel from "@/components/dashboard/MonitoringPanel";

export const metadata: Metadata = {
  title: "Surveillance planifiée",
  robots: { index: false, follow: false },
};

export default async function MonitoringPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/monitoring");
  return <MonitoringPanel />;
}
