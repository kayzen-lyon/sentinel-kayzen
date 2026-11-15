import type { Metadata } from "next";
import Link from "next/link";
import LegalShell from "@/components/LegalShell";
import WithdrawalForm from "@/components/WithdrawalForm";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Rétractation",
  description: "Se rétracter d'un contrat conclu avec Sentinel by Kayzen, en ligne, sans motif.",
  alternates: { canonical: "/retractation" },
};

/**
 * Fonction de rétractation en ligne (C. conso L. 221-21 et D. 221-5).
 * Accessible sans connexion ; pré-remplie (modifiable) si l'utilisateur est connecté.
 */
export default async function RetractationPage() {
  const session = await getSession().catch(() => null);
  return (
    <LegalShell title="Se rétracter d'un contrat">
      <p>
        Si vous êtes un consommateur, vous pouvez vous rétracter d&apos;un contrat conclu avec
        Sentinel by Kayzen pendant le délai de rétractation, sans avoir à donner de motif. Les
        conditions et exceptions sont décrites à l&apos;article 10 des{" "}
        <Link href="/cgv">conditions générales de vente</Link>.
      </p>
      <p>
        Cette fonction en ligne s&apos;ajoute aux autres moyens : vous pouvez aussi nous adresser
        toute déclaration dénuée d&apos;ambiguïté, par exemple par courriel à{" "}
        <a href="mailto:contact@kayzen-lyon.fr">contact@kayzen-lyon.fr</a>.
      </p>
      <div className="mt-8">
        <WithdrawalForm
          prefill={session ? { name: session.name ?? "", email: session.email } : {}}
        />
      </div>
    </LegalShell>
  );
}
