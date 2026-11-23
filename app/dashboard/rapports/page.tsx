import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import RapportsPanel from "@/components/dashboard/RapportsPanel";

export const metadata: Metadata = {
  title: "Rapports",
  robots: { index: false, follow: false },
};

export default async function RapportsPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/rapports");
  return (
    <main className="container-x py-8 lg:py-10">
      <h1 className="font-heading text-3xl font-bold text-fg">Rapports de test d&apos;intrusion</h1>
      <div className="mt-6">
        <RapportsPanel />
      </div>
    </main>
  );
}
