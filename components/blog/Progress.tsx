"use client";

import { useSyncExternalStore } from "react";
import { doneSet, onProgress } from "./progressStore";

/** Lecture réactive de la progression locale (vide côté serveur). */
function useDone(): Set<string> {
  const snapshot = useSyncExternalStore(
    onProgress,
    () => [...doneSet()].sort().join(","),
    () => ""
  );
  return new Set(snapshot ? snapshot.split(",") : []);
}

/** Pastille « Terminé » d'un cours. */
export function DoneBadge({ slug }: { slug: string }) {
  const done = useDone();
  if (!done.has(slug)) return null;
  return (
    <span className="rounded-full px-2 py-0.5 text-[0.68rem] font-semibold" data-tint="soft" data-tone="safe">
      ✓ Terminé
    </span>
  );
}

/** Barre de progression d'un parcours. */
export function TrackProgress({ slugs }: { slugs: string[] }) {
  const done = useDone();
  const n = slugs.filter((s) => done.has(s)).length;
  if (!n) return null;
  const pct = Math.round((n / slugs.length) * 100);
  return (
    <div className="mt-3" aria-label={`Progression : ${n} cours terminés sur ${slugs.length}`}>
      <div className="flex justify-between text-xs text-subtle">
        <span>Votre progression</span>
        <span className="tabular-nums">{n}/{slugs.length}</span>
      </div>
      <svg viewBox="0 0 100 4" preserveAspectRatio="none" className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-hover" aria-hidden="true">
        <rect x="0" y="0" height="4" width={pct} data-tint="fill" data-tone="safe" />
      </svg>
    </div>
  );
}
