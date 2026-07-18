import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AuthCard from "@/components/auth/AuthCard";

export const metadata: Metadata = {
  title: "Créer un compte",
  robots: { index: false, follow: false },
};

export default async function SignupPage() {
  if (await getSession()) redirect("/dashboard");
  return (
    <main className="grid min-h-screen place-items-center px-6 py-16">
      <Suspense>
        <AuthCard mode="signup" />
      </Suspense>
    </main>
  );
}
