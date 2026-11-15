import WithdrawalLink from "@/components/WithdrawalLink";
import VerifyEmailBanner from "@/components/dashboard/VerifyEmailBanner";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { emailConfigured } from "@/lib/email";
import { isEmailVerified } from "@/lib/users";
import { getActiveOrg } from "@/lib/activeorg";
import { getOrgPlan, PLANS } from "@/lib/plans";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  // Sans session, chaque page redirige elle-même vers /login : pas de coque à afficher.
  if (!session) return <>{children}</>;

  // Bandeau de confirmation d'e-mail : seulement si l'envoi est activé (sinon rien à confirmer).
  const unverified =
    dbConfigured && emailConfigured
      ? !(await isEmailVerified(session.id).catch(() => true))
      : false;

  let planLabel: string | null = null;
  if (dbConfigured) {
    try {
      const { orgId } = await getActiveOrg(session);
      planLabel = PLANS[(await getOrgPlan(orgId)).plan].label;
    } catch {
      planLabel = null;
    }
  }

  return (
    <>
      <DashboardShell
        user={{ email: session.email, name: session.name ?? null }}
        planLabel={planLabel}
        banner={unverified ? <VerifyEmailBanner email={session.email} /> : null}
      >
        {children}
        <WithdrawalLink />
      </DashboardShell>
    </>
  );
}
