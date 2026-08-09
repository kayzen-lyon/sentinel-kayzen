import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import TeamPanel from "@/components/dashboard/TeamPanel";

export const metadata: Metadata = {
  title: "Équipe & audit",
  robots: { index: false, follow: false },
};

export default async function TeamPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/team");
  return <TeamPanel />;
}
