import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

/** Coque des pages du blog : en-tête du site, fil d'Ariane, pied de page. */
export default function BlogShell({
  crumbs,
  jsonLd,
  children,
}: {
  crumbs: { label: string; href?: string }[];
  jsonLd?: object;
  children: React.ReactNode;
}) {
  // JSON-LD échappé (aucune balise ne peut s'échapper du bloc de données).
  const ld = jsonLd
    ? JSON.stringify(jsonLd).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026")
    : null;
  return (
    <>
      {ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />}
      <Header />
      <main id="contenu" className="pt-20">
        <div className="container-x py-10 lg:py-14">
          <nav aria-label="Fil d'Ariane" className="text-sm text-muted">
            <ol className="flex flex-wrap items-center gap-1.5">
              {crumbs.map((c, i) => (
                <li key={c.label} className="flex items-center gap-1.5">
                  {i > 0 && <span aria-hidden="true" className="text-subtle">›</span>}
                  {c.href ? (
                    <Link href={c.href} className="hover:text-fg">{c.label}</Link>
                  ) : (
                    <span aria-current="page" className="text-fg">{c.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}

export const SITE = "https://sentinel.kayzen-lyon.com";

/** Données structurées du fil d'Ariane. */
export function breadcrumbLd(crumbs: { label: string; href: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, item: `${SITE}${c.href}` })),
  };
}
