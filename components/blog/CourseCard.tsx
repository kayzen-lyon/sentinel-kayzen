import Link from "next/link";
import { LEVEL_LABEL, type Course } from "@/lib/courseParser";
import { DoneBadge } from "./Progress";

/** Carte d'un cours dans une liste. */
export default function CourseCard({ c, index }: { c: Course; index?: number }) {
  return (
    <li>
      <Link
        href={`/blog/${c.slug}`}
        className="group flex h-full gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-border-strong"
      >
        {index !== undefined && (
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full font-heading text-sm font-bold" data-tint="soft" data-tone="brand">
            {index}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2 text-xs text-subtle">
            <span>{LEVEL_LABEL[c.level]}</span>
            <span aria-hidden="true">·</span>
            <span>{c.minutes} min</span>
            <span aria-hidden="true">·</span>
            <span>{c.quiz.length} questions</span>
            <DoneBadge slug={c.slug} />
          </span>
          <span className="mt-1 block font-heading text-base font-semibold text-fg group-hover:text-brand">{c.title}</span>
          <span className="mt-1 block text-sm text-muted">{c.description}</span>
        </span>
      </Link>
    </li>
  );
}
