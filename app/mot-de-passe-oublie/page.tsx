import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/PasswordResetForms";

export const metadata: Metadata = {
  title: "Mot de passe oublié",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <main id="contenu" className="grid min-h-screen place-items-center bg-sunken px-6 py-16">
      <div className="card w-full max-w-md p-8 sm:p-10">
        <h1 className="font-heading text-2xl font-bold text-fg">Mot de passe oublié</h1>
        <p className="mt-1.5 text-sm text-muted">
          Saisissez l&apos;adresse de votre compte : nous vous enverrons un lien pour choisir un
          nouveau mot de passe.
        </p>
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
