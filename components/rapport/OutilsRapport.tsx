"use client";

import Link from "next/link";

/** Barre d'outils du rapport (masquée à l'impression) : retour, impression en PDF, exports. */
export default function OutilsRapport({ id }: { id: string }) {
  return (
    <>
      <Link href="/dashboard/rapports" className="btn btn-ghost !py-2 text-sm">
        ← Tous les rapports
      </Link>
      <div className="actions">
        <button type="button" onClick={() => window.print()} className="btn btn-primary !py-2 text-sm">
          Imprimer / enregistrer en PDF
        </button>
        <a href={`/api/rapports/${id}/export?format=md`} className="btn btn-ghost !py-2 text-sm">
          Markdown
        </a>
        <a href={`/api/rapports/${id}/export?format=json`} className="btn btn-ghost !py-2 text-sm">
          JSON
        </a>
        <a href={`/api/rapports/${id}/export?format=csv`} className="btn btn-ghost !py-2 text-sm">
          CSV
        </a>
      </div>
    </>
  );
}
