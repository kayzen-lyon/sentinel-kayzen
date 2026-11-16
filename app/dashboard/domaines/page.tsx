import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import DomainsPanel from "@/components/dashboard/DomainsPanel";

export const metadata: Metadata = {
  title: "Domaines",
  robots: { index: false, follow: false },
};

export default async function DomainsPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/domaines");
  return (
    <main className="container-x py-8 lg:py-10">
      <h1 className="font-heading text-3xl font-bold text-fg">Domaines</h1>
      <div className="mt-6">
        <DomainsPanel />
      </div>
    </main>
  );
}
