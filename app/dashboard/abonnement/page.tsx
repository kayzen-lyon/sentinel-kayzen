import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import BillingPanel from "@/components/dashboard/BillingPanel";

export const metadata: Metadata = {
  title: "Abonnement & utilisation",
  robots: { index: false, follow: false },
};

export default async function BillingPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/abonnement");
  return (
    <Suspense>
      <BillingPanel />
    </Suspense>
  );
}
