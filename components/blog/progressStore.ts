/**
 * Progression du lecteur, conservée uniquement dans son navigateur (aucune donnée envoyée).
 * Commodité locale : si le stockage est indisponible, le site fonctionne normalement.
 */

const KEY = "sentinel_cours_termines";
const EVENT = "sentinel-progress";

export function doneSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function markDone(slug: string): void {
  try {
    const s = doneSet();
    s.add(slug);
    localStorage.setItem(KEY, JSON.stringify([...s]));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* stockage indisponible */
  }
}

export function onProgress(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
