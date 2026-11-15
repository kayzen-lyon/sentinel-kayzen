import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AccountForm from "@/components/dashboard/AccountForm";
import ApiKeysPanel from "@/components/dashboard/ApiKeysPanel";
import AccountData from "@/components/dashboard/AccountData";

export const metadata: Metadata = {
  title: "Compte",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/account");

  return (
    <div className="min-h-screen">
      <main className="container-x py-10">
        <h1 className="font-heading text-3xl font-bold text-fg">Mon compte</h1>
        <div className="mt-6">
          <AccountForm email={session.email} />
        </div>
        <div className="mt-10">
          <ApiKeysPanel />
        </div>
        <div className="mt-10">
          <AccountData />
        </div>
      </main>
    </div>
  );
}
