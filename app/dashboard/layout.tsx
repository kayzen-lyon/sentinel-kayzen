import WithdrawalLink from "@/components/WithdrawalLink";
import VerifyEmailBanner from "@/components/dashboard/VerifyEmailBanner";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { emailConfigured } from "@/lib/email";
import { isEmailVerified } from "@/lib/users";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Bandeau de confirmation d'e-mail : seulement si l'envoi est activé (sinon rien à confirmer).
  const session = dbConfigured && emailConfigured ? await getSession() : null;
  const unverified = session ? !(await isEmailVerified(session.id).catch(() => true)) : false;

  return (
    <>
      {unverified && session && <VerifyEmailBanner email={session.email} />}
      {children}
      <WithdrawalLink />
    </>
  );
}
