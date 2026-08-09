import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import CicdPanel from "@/components/dashboard/CicdPanel";

export const metadata: Metadata = {
  title: "CI/CD — scan sur PR",
  robots: { index: false, follow: false },
};

export default async function CicdPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/cicd");
  return <CicdPanel />;
}
