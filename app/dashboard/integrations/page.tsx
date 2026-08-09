import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import IntegrationsPanel from "@/components/dashboard/IntegrationsPanel";

export const metadata: Metadata = {
  title: "Intégrations",
  robots: { index: false, follow: false },
};

export default async function IntegrationsPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/integrations");
  return <IntegrationsPanel />;
}
