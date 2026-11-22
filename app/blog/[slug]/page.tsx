import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BlogShell, { breadcrumbLd, SITE } from "@/components/blog/BlogShell";
import CourseBlocks, { Inlines } from "@/components/blog/CourseBlocks";
import Quiz from "@/components/blog/Quiz";
import { allCourses, getCourse, neighbours } from "@/lib/blog";
import { LEVEL_LABEL, TRACKS, plain } from "@/lib/courseParser";

export const dynamicParams = false;

export function generateStaticParams() {
  return allCourses().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = getCourse(slug);
  if (!c) return {};
  return {
    title: c.title,
    description: c.description,
    keywords: c.tags,
    alternates: { canonical: `/blog/${c.slug}` },
    openGraph: { type: "article", url: `/blog/${c.slug}`, title: c.title, description: c.description, modifiedTime: c.updated },
  };
}

function frDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getCourse(slug);
  if (!c) notFound();
  const track = TRACKS[c.track];
  const { prev, next } = neighbours(c);
  const toc = c.body.filter((b) => b.t === "h2") as { t: "h2"; id: string; text: string }[];
  const crumbs = [
    { label: "Accueil", href: "/" },
    { label: "Cours", href: "/blog" },
    { label: track.label, href: `/blog/parcours/${c.track}` },
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumbLd([...crumbs, { label: c.title, href: `/blog/${c.slug}` }]),
      {
        "@type": "Article",
        headline: c.title,
        description: c.description,
        inLanguage: "fr-FR",
        dateModified: c.updated,
        datePublished: c.updated,
        keywords: c.tags.join(", "),
        wordCount: c.words,
        url: `${SITE}/blog/${c.slug}`,
        author: { "@type": "Organization", name: "Sentinel by Kayzen", url: SITE },
        publisher: { "@type": "Organization", name: "Sentinel by Kayzen", url: SITE, logo: { "@type": "ImageObject", url: `${SITE}/logo-mark.png` } },
        educationalLevel: LEVEL_LABEL[c.level],
        teaches: c.objectives.map(plain),
        isAccessibleForFree: true,
      },
    ],
  };

  return (
    <BlogShell crumbs={[...crumbs, { label: c.title }]} jsonLd={jsonLd}>
      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <article className="min-w-0 max-w-3xl">
          <header>
            <p className="flex flex-wrap items-center gap-2 text-sm text-subtle">
              <Link href={`/blog/parcours/${c.track}`} className="font-medium text-brand-light hover:underline">{track.label}</Link>
              <span aria-hidden="true">·</span>
              <span>{LEVEL_LABEL[c.level]}</span>
              <span aria-hidden="true">·</span>
              <span>{c.minutes} min de lecture</span>
              <span aria-hidden="true">·</span>
              <span>Mis à jour le {frDate(c.updated)}</span>
            </p>
            <h1 className="mt-3 font-heading font-bold leading-tight text-fg" data-size="4xl">{c.title}</h1>
          </header>

          <div className="prose mt-6 blog-prose">
            <CourseBlocks blocks={c.intro} />
          </div>

          {c.objectives.length > 0 && (
            <section aria-labelledby="objectifs" className="mt-6 rounded-xl border border-border bg-sunken p-5">
              <h2 id="objectifs" className="font-heading text-lg font-semibold text-fg">Ce que vous allez apprendre</h2>
              <ul className="mt-3 space-y-1.5 text-sm text-fg">
                {c.objectives.map((o, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-safe" aria-hidden="true">✓</span>
                    <span><Inlines inl={o} /></span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="prose mt-4 blog-prose">
            <CourseBlocks blocks={c.body} />
          </div>

          {c.takeaways.length > 0 && (
            <section aria-labelledby="retenir" className="mt-10 rounded-xl border border-border bg-card p-6" data-tint="outline" data-tone="brand">
              <h2 id="retenir" className="font-heading text-xl font-semibold text-fg">À retenir</h2>
              <ul className="mt-3 space-y-2 text-[0.95rem] text-fg">
                {c.takeaways.map((o, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span aria-hidden="true">→</span>
                    <span><Inlines inl={o} /></span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {c.quiz.length > 0 && <Quiz slug={c.slug} questions={c.quiz} />}

          <nav aria-label="Cours suivant et précédent" className="mt-10 grid gap-4 sm:grid-cols-2">
            {prev ? (
              <Link href={`/blog/${prev.slug}`} className="rounded-xl border border-border p-4 hover:border-border-strong">
                <span className="text-xs text-subtle">← Cours précédent</span>
                <span className="mt-1 block font-medium text-fg">{prev.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link href={`/blog/${next.slug}`} className="rounded-xl border border-border p-4 text-right hover:border-border-strong">
                <span className="text-xs text-subtle">Cours suivant →</span>
                <span className="mt-1 block font-medium text-fg">{next.title}</span>
              </Link>
            )}
          </nav>

          <aside className="mt-10 rounded-2xl bg-navy-deep p-6 text-white sm:p-8">
            <p className="font-heading text-xl font-semibold">Passez de la théorie à la pratique</p>
            <p className="mt-2 text-sm text-white/80">
              Analysez gratuitement la sécurité de votre site : note de A à F, problèmes classés par priorité et
              corrections prêtes à copier.
            </p>
            <Link href="/dashboard/scan" className="btn btn-primary mt-5">Scanner mon site gratuitement</Link>
          </aside>

          {c.tags.length > 0 && (
            <p className="mt-8 flex flex-wrap gap-2 text-xs">
              {c.tags.map((t) => (
                <span key={t} className="rounded-full border border-border px-2.5 py-1 text-muted">{t}</span>
              ))}
            </p>
          )}
        </article>

        {toc.length > 0 && (
          <aside className="hidden lg:block">
            <nav aria-label="Sommaire du cours" className="sticky top-28 text-sm">
              <p className="font-semibold text-fg">Sommaire</p>
              <ol className="mt-3 space-y-2 border-l border-border pl-4">
                {toc.map((h) => (
                  <li key={h.id}>
                    <a href={`#${h.id}`} className="text-muted hover:text-fg">{h.text}</a>
                  </li>
                ))}
                <li><a href="#retenir" className="text-muted hover:text-fg">À retenir</a></li>
                {c.quiz.length > 0 && <li><a href="#quiz" className="text-muted hover:text-fg">Quiz</a></li>}
              </ol>
            </nav>
          </aside>
        )}
      </div>
    </BlogShell>
  );
}
