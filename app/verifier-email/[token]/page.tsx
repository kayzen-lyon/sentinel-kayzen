import type { Metadata } from "next";
import Link from "next/link";
import { dbConfigured } from "@/lib/db";
import { consumeAuthToken } from "@/lib/authtokens";
import { markEmailVerified } from "@/lib/users";

export const metadata: Metadata = {
  title: "Confirmation de l'adresse e-mail",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

// Consomme le jeton à l'affichage : un clic sur le lien suffit. Si un antivirus de
// messagerie ouvre le lien avant l'utilisateur, l'adresse est confirmée quand même —
// l'e-mail a bien été reçu, ce qui est exactement ce qu'on veut prouver.
export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let ok = false;
  if (dbConfigured) {
    const userId = await consumeAuthToken(token, "verify").catch(() => null);
    if (userId) {
      await markEmailVerified(userId);
      ok = true;
    }
  }

  return (
    <main id="contenu" className="grid min-h-screen place-items-center bg-sunken px-6 py-16">
      <div className="card w-full max-w-md p-8 sm:p-10">
        <h1 className="font-heading text-2xl font-bold text-fg">
          {ok ? "Adresse confirmée" : "Lien invalide"}
        </h1>
        <p className="mt-3 text-muted">
          {ok
            ? "Merci ! Votre adresse e-mail est confirmée : vous pouvez lancer des pentests."
            : "Ce lien est invalide, a expiré ou a déjà été utilisé. Si votre adresse n'est pas encore confirmée, redemandez un lien depuis la console."}
        </p>
        <Link href="/dashboard" className="btn btn-primary mt-6 w-full">
          Aller à la console
        </Link>
      </div>
    </main>
  );
}
