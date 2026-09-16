"use client";

import { useEffect } from "react";
import Link from "next/link";

/** Frontière d'erreur propre au segment /dashboard : une erreur dans un panneau
 *  n'affiche plus l'erreur globale mais un repli contextualisé avec réessai. */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-[60vh] place-items-center px-6 text-center">
      <div>
        <p className="font-heading text-4xl font-bold text-risk">Oups</p>
        <h1 className="mt-3 font-heading text-lg font-semibold text-fg">
          Ce panneau du tableau de bord a rencontré une erreur
        </h1>
        <p className="mt-2 text-sm text-muted">
          Vos données sont en sécurité. Réessayez, ou revenez au tableau de bord.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-subtle">Référence : {error.digest}</p>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button onClick={reset} className="btn btn-primary">
            Réessayer
          </button>
          <Link href="/dashboard" className="btn btn-ghost">
            Tableau de bord
          </Link>
        </div>
      </div>
    </main>
  );
}
