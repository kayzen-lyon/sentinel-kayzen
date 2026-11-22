import fs from "node:fs";
import path from "node:path";
import { parseCourse, TRACKS, type Course, type Track } from "./courseParser";

/**
 * Accès aux cours du blog (fichiers content/cours/*.md), lus au moment de la construction
 * des pages statiques. Mis en cache pour la durée du processus.
 */

const DIR = path.join(process.cwd(), "content", "cours");
let cache: Course[] | null = null;

export function allCourses(): Course[] {
  if (cache) return cache;
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".md") && f !== "FORMAT.md");
  const trackOrder = Object.keys(TRACKS);
  cache = files
    // Noms issus du dossier du dépôt lui-même (pas d'entrée utilisateur).
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    .map((f) => parseCourse(f.replace(/\.md$/, ""), fs.readFileSync(path.join(DIR, f), "utf8")))
    .sort((a, b) => trackOrder.indexOf(a.track) - trackOrder.indexOf(b.track) || a.order - b.order);
  return cache;
}

export function getCourse(slug: string): Course | undefined {
  return allCourses().find((c) => c.slug === slug);
}

export function coursesOfTrack(track: Track): Course[] {
  return allCourses().filter((c) => c.track === track);
}

/** Cours précédent et suivant dans le même parcours. */
export function neighbours(c: Course): { prev?: Course; next?: Course } {
  const list = coursesOfTrack(c.track);
  const i = list.findIndex((x) => x.slug === c.slug);
  return { prev: list[i - 1], next: list[i + 1] };
}
