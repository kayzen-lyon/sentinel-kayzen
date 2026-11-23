import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { chargerRapport, dureeConservationJours } from "@/lib/rapports";
import DocumentRapport from "@/components/rapport/DocumentRapport";
import OutilsRapport from "@/components/rapport/OutilsRapport";

export const metadata: Metadata = {
  title: "Rapport de test d'intrusion",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/** Rapport authentifié : membres du compte seulement, réassemblé côté serveur à chaque consultation. */
export default async function RapportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(`/login?next=/dashboard/rapports/${encodeURIComponent(id)}`);
  if (!dbConfigured) notFound();
  const r = await chargerRapport(session.id, id);
  if (!r) notFound();
  return (
    <main className="py-8">
      <DocumentRapport m={r.modele} outils={<OutilsRapport id={id} />} conservation={dureeConservationJours()} />
    </main>
  );
}
