import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { findInvitation } from "@/lib/invitations";
import AcceptInvitation from "@/components/auth/AcceptInvitation";

export const metadata: Metadata = {
  title: "Invitation d'équipe",
  robots: { index: false, follow: false },
  // Le jeton est dans l'URL : ne pas le transmettre aux liens sortants.
  referrer: "no-referrer",
};

const ROLE_FR: Record<string, string> = { admin: "Admin", member: "Membre", viewer: "Lecteur" };

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [session, inv] = await Promise.all([
    getSession(),
    dbConfigured ? findInvitation(token).catch(() => null) : null,
  ]);
  const here = `/invitation/${encodeURIComponent(token)}`;

  return (
    <main id="contenu" className="grid min-h-screen place-items-center bg-sunken px-6 py-16">
      <div className="card w-full max-w-md p-8">
        <h1 className="font-heading text-2xl font-bold text-heading">Invitation d&apos;équipe</h1>

        {!inv ? (
          <>
            <p className="mt-3 text-muted">
              Cette invitation est invalide, a expiré ou a déjà été utilisée. Demandez à la
              personne qui vous a invité de vous en envoyer une nouvelle.
            </p>
            <Link href="/" className="btn mt-6 w-full">Retour à l&apos;accueil</Link>
          </>
        ) : (
          <>
            <p className="mt-3 text-fg">
              Vous êtes invité à rejoindre <strong>{inv.org_name}</strong> avec le rôle{" "}
              <strong>{ROLE_FR[inv.role] || inv.role}</strong>.
            </p>
            <p className="mt-2 text-sm text-muted">
              Invitation destinée à <strong>{inv.email}</strong>.
            </p>

            {session ? (
              session.email.toLowerCase() === inv.email ? (
                <AcceptInvitation token={token} />
              ) : (
                <p role="alert" className="mt-6 rounded-lg border border-warn/30 bg-warn/10 px-4 py-2.5 text-sm text-fg">
                  Vous êtes connecté en tant que {session.email}. Déconnectez-vous puis
                  reconnectez-vous avec {inv.email} pour accepter.
                </p>
              )
            ) : (
              <div className="mt-6 flex flex-col gap-3">
                <Link
                  href={`/signup?next=${encodeURIComponent(here)}&email=${encodeURIComponent(inv.email)}`}
                  className="btn btn-primary w-full"
                >
                  Créer mon compte
                </Link>
                <Link
                  href={`/login?next=${encodeURIComponent(here)}&email=${encodeURIComponent(inv.email)}`}
                  className="btn w-full"
                >
                  J&apos;ai déjà un compte
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
