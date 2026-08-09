import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AccountForm from "@/components/dashboard/AccountForm";
import ApiKeysPanel from "@/components/dashboard/ApiKeysPanel";

export const metadata: Metadata = {
  title: "Compte",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/account");

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="container-x flex h-[64px] items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-muted hover:text-fg">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Retour à la console
          </Link>
        </div>
      </header>
      <main className="container-x py-10">
        <h1 className="font-heading text-3xl font-bold text-fg">Mon compte</h1>
        <div className="mt-6">
          <AccountForm email={session.email} />
        </div>
        <div className="mt-10">
          <ApiKeysPanel />
        </div>
      </main>
    </div>
  );
}
