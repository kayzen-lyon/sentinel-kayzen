/** Squelette de la zone de contenu pendant le chargement serveur (la coque reste en place). */
export default function DashboardLoading() {
  return (
    <div className="container-x py-10" aria-busy="true" aria-label="Chargement">
      <div className="skeleton h-9 w-64" />
      <div className="skeleton mt-3 h-4 w-96 max-w-full" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-28 w-full" />
        ))}
      </div>
      <div className="skeleton mt-6 h-64 w-full" />
    </div>
  );
}
