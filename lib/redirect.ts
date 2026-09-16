/**
 * Nettoie une destination de redirection issue d'un paramètre d'URL (`?next=`).
 * N'accepte qu'un chemin interne : tout ce qui pourrait sortir du site
 * (URL absolue, `//evil.tld`, `/\evil.tld`) retombe sur `fallback`.
 */
export function safeInternalPath(next: string | null, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/")) return fallback;
  // `//host` et `/\host` sont interprétés comme des URL protocol-relative.
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (next.includes("\\")) return fallback;
  return next;
}
