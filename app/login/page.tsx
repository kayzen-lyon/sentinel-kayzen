import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AuthCard from "@/components/auth/AuthCard";
import WithdrawalLink from "@/components/WithdrawalLink";

export const metadata: Metadata = {
  alternates: { canonical: "/login" },
  title: "Connexion",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  if (await getSession()) redirect("/dashboard");
  return (
    <>
    <main id="contenu" className="grid min-h-screen place-items-center bg-sunken px-6 py-16">
      <Suspense>
        <AuthCard mode="login" />
      </Suspense>
    </main>
    <WithdrawalLink />
    </>
  );
}
