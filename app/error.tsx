"use client";

import { useEffect } from "react";

export default function Error({
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
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="font-heading text-5xl font-bold text-risk">Oups</p>
        <h1 className="mt-3 font-heading text-xl font-semibold text-fg">
          Une erreur inattendue est survenue
        </h1>
        <p className="mt-2 text-muted">
          Réessayez dans un instant. Si le problème persiste, contactez-nous.
        </p>
        <button onClick={reset} className="btn btn-primary mt-6">
          Réessayer
        </button>
      </div>
    </main>
  );
}
