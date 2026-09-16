/** Skeleton instantané pendant le chargement serveur des pages du dashboard —
 *  meilleure performance perçue que le spinner global générique. */
export default function DashboardLoading() {
  return (
    <div className="min-h-screen" aria-busy="true" aria-label="Chargement du tableau de bord">
      <div className="border-b border-border">
        <div className="container-x flex h-16 items-center justify-between">
          <div className="skeleton h-7 w-32" />
          <div className="flex gap-2">
            <div className="skeleton h-8 w-20" />
            <div className="skeleton h-8 w-20" />
          </div>
        </div>
      </div>
      <div className="container-x py-10">
        <div className="skeleton h-9 w-64" />
        <div className="skeleton mt-3 h-4 w-96 max-w-full" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-28 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
