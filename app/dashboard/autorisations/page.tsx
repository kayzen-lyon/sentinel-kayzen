import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AutorisationsPanel from "@/components/dashboard/AutorisationsPanel";

export const metadata: Metadata = {
  title: "Autorisations de test",
  robots: { index: false, follow: false },
};

export default async function AutorisationsPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/autorisations");
  return (
    <main className="container-x py-8 lg:py-10">
      <h1 className="font-heading text-3xl font-bold text-fg">Autorisations de test</h1>
      <div className="mt-6">
        <AutorisationsPanel />
      </div>
    </main>
  );
}
