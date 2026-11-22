import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogShell, { breadcrumbLd, SITE } from "@/components/blog/BlogShell";
import CourseCard from "@/components/blog/CourseCard";
import { TrackProgress } from "@/components/blog/Progress";
import { coursesOfTrack } from "@/lib/blog";
import { LEVEL_LABEL, TRACKS, type Track } from "@/lib/courseParser";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(TRACKS).map((track) => ({ track }));
}

export async function generateMetadata({ params }: { params: Promise<{ track: string }> }): Promise<Metadata> {
  const { track } = await params;
  const t = TRACKS[track as Track];
  if (!t) return {};
  return {
    title: `${t.label} — parcours de cours`,
    description: t.pitch,
    alternates: { canonical: `/blog/parcours/${track}` },
  };
}

export default async function TrackPage({ params }: { params: Promise<{ track: string }> }) {
  const { track } = await params;
  const t = TRACKS[track as Track];
  if (!t) notFound();
  const list = coursesOfTrack(track as Track);
  const minutes = list.reduce((n, c) => n + c.minutes, 0);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumbLd([
        { label: "Accueil", href: "/" },
        { label: "Cours", href: "/blog" },
        { label: t.label, href: `/blog/parcours/${track}` },
      ]),
      {
        "@type": "ItemList",
        name: t.label,
        itemListElement: list.map((c, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/blog/${c.slug}`, name: c.title })),
      },
    ],
  };
  return (
    <BlogShell crumbs={[{ label: "Accueil", href: "/" }, { label: "Cours", href: "/blog" }, { label: t.label }]} jsonLd={jsonLd}>
      <header className="mt-6 max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-subtle">
          Parcours · {LEVEL_LABEL[t.level]} · {list.length} cours · environ {Math.round(minutes / 6) / 10} h
        </p>
        <h1 className="mt-3 font-heading font-bold text-fg" data-size="4xl">{t.label}</h1>
        <p className="mt-4 text-lg text-muted">{t.pitch}</p>
        <div className="max-w-sm">
          <TrackProgress slugs={list.map((c) => c.slug)} />
        </div>
      </header>
      <ol className="mt-10 grid max-w-3xl gap-4">
        {list.map((c, i) => (
          <CourseCard key={c.slug} c={c} index={i + 1} />
        ))}
      </ol>
    </BlogShell>
  );
}
