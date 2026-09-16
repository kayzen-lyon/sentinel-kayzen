import Header from "@/components/Header";
import Link from "next/link";
import Footer from "@/components/Footer";

export default function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main id="contenu" className="pt-[72px]">
        <div className="container-x max-w-3xl py-16">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Retour à l'accueil
          </Link>
          <h1 className="mt-6 font-heading text-4xl font-bold text-fg">{title}</h1>
          {updated && (
            <p className="mt-2 text-sm text-subtle">Dernière mise à jour : {updated}</p>
          )}
          <div className="prose mt-10">{children}</div>
        </div>
      </main>
      <Footer />
    </>
  );
}
