import type { Metadata } from "next";
import Link from "next/link";
import BlogShell, { breadcrumbLd, SITE } from "@/components/blog/BlogShell";
import CourseCard from "@/components/blog/CourseCard";
import { TrackProgress } from "@/components/blog/Progress";
import { allCourses, coursesOfTrack } from "@/lib/blog";
import { LEVEL_LABEL, TRACKS, type Track } from "@/lib/courseParser";

export const metadata: Metadata = {
  title: "Cours de cybersécurité gratuits",
  description:
    "Des cours gratuits et en français pour apprendre la cybersécurité : bons réflexes, protection de l'entreprise, sécurité des sites web et développement sécurisé. Quiz inclus.",
  alternates: { canonical: "/blog" },
  openGraph: {
    url: "/blog",
    title: "Cours de cybersécurité gratuits — Sentinel by Kayzen",
    description: "Apprendre à se protéger en ligne, du grand public aux développeurs. Quiz à la fin de chaque cours.",
  },
};

export default function BlogHome() {
  const courses = allCourses();
  const minutes = courses.reduce((n, c) => n + c.minutes, 0);
  const questions = courses.reduce((n, c) => n + c.quiz.length, 0);
  const tracks = Object.keys(TRACKS) as Track[];
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumbLd([
        { label: "Accueil", href: "/" },
        { label: "Cours", href: "/blog" },
      ]),
      {
        "@type": "ItemList",
        name: "Cours de cybersécurité Sentinel",
        itemListElement: courses.map((c, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/blog/${c.slug}`, name: c.title })),
      },
    ],
  };

  return (
    <BlogShell crumbs={[{ label: "Accueil", href: "/" }, { label: "Cours" }]} jsonLd={jsonLd}>
      <header className="mt-6 max-w-3xl">
        <span className="eyebrow">Former et sensibiliser</span>
        <h1 className="mt-4 font-heading font-bold text-fg" data-size="4xl">
          Cours de cybersécurité, gratuits et en français
        </h1>
        <p className="mt-4 text-lg text-muted">
          Apprenez à vous protéger en ligne, à sécuriser votre entreprise et vos sites web, ou à écrire du code
          sûr. Chaque cours se lit en quelques minutes et se termine par un quiz pour vérifier vos acquis.
        </p>
        <dl className="mt-6 flex flex-wrap gap-6 text-sm">
          {[
            { k: "Cours", v: courses.length },
            { k: "Parcours", v: tracks.length },
            { k: "Questions de quiz", v: questions },
            { k: "Heures de lecture", v: Math.round(minutes / 60) },
          ].map((s) => (
            <div key={s.k}>
              <dt className="text-subtle">{s.k}</dt>
              <dd className="font-heading text-2xl font-semibold tabular-nums text-fg">{s.v}</dd>
            </div>
          ))}
        </dl>
      </header>

      <section aria-labelledby="parcours" className="mt-12">
        <h2 id="parcours" className="font-heading text-2xl font-semibold text-fg">Choisissez votre parcours</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {tracks.map((t) => {
            const list = coursesOfTrack(t);
            return (
              <article key={t} className="card flex flex-col p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-subtle">
                  {LEVEL_LABEL[TRACKS[t].level]} · {list.length} cours
                </p>
                <h3 className="mt-2 font-heading text-xl font-semibold text-fg">
                  <Link href={`/blog/parcours/${t}`} className="hover:text-brand">{TRACKS[t].label}</Link>
                </h3>
                <p className="mt-2 text-sm text-muted">{TRACKS[t].pitch}</p>
                <TrackProgress slugs={list.map((c) => c.slug)} />
                <ul className="mt-4 flex-1 space-y-1.5 text-sm">
                  {list.slice(0, 5).map((c) => (
                    <li key={c.slug}>
                      <Link href={`/blog/${c.slug}`} className="text-fg hover:text-brand hover:underline">{c.title}</Link>
                    </li>
                  ))}
                </ul>
                <Link href={`/blog/parcours/${t}`} className="mt-4 text-sm font-medium text-brand-light hover:underline">
                  Voir les {list.length} cours du parcours →
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="tous" className="mt-14">
        <h2 id="tous" className="font-heading text-2xl font-semibold text-fg">Tous les cours</h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {courses.map((c) => (
            <CourseCard key={c.slug} c={c} />
          ))}
        </ul>
      </section>
    </BlogShell>
  );
}
