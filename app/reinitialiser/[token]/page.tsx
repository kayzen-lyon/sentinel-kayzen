import type { Metadata } from "next";
import Link from "next/link";
import { dbConfigured } from "@/lib/db";
import { peekAuthToken } from "@/lib/authtokens";
import { ResetPasswordForm } from "@/components/auth/PasswordResetForms";

export const metadata: Metadata = {
  title: "Nouveau mot de passe",
  robots: { index: false, follow: false },
  // Le jeton est dans l'URL : ne pas le transmettre aux liens sortants.
  referrer: "no-referrer",
};

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = dbConfigured ? await peekAuthToken(token, "reset").catch(() => false) : false;

  return (
    <main id="contenu" className="grid min-h-screen place-items-center bg-sunken px-6 py-16">
      <div className="card w-full max-w-md p-8 sm:p-10">
        <h1 className="font-heading text-2xl font-bold text-fg">Nouveau mot de passe</h1>
        {valid ? (
          <ResetPasswordForm token={token} />
        ) : (
          <>
            <p className="mt-3 text-muted">
              Ce lien est invalide, a expiré ou a déjà été utilisé.
            </p>
            <Link href="/mot-de-passe-oublie" className="btn btn-primary mt-6 w-full">
              Refaire une demande
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
