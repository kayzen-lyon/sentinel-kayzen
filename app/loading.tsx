export default function Loading() {
  return (
    <div className="grid min-h-screen place-items-center">
      <span
        className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-brand/30 border-t-brand"
        aria-label="Chargement"
      />
    </div>
  );
}
