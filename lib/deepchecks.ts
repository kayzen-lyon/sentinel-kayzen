import type { Finding } from "./scanner";
import { safeFetch } from "./ssrf";

const UA =
  "SentinelByKayzen/1.0 (+https://sentinel.kayzen-lyon.com; passive security posture scan)";

async function fetchText(url: string, timeoutMs = 8000): Promise<string | null> {
  // Suivi de redirections durci anti-SSRF (cf. lib/ssrf.ts).
  const r = await safeFetch(url, { headers: { "user-agent": UA }, timeoutMs });
  if (!r || !r.ok) return null;
  return r.text().catch(() => null);
}

/** Contrôles approfondis, réservés aux domaines dont la propriété est vérifiée. */
export async function deepChecks(target: URL): Promise<Finding[]> {
  const out: Finding[] = [];
  const host = target.hostname;
  const origin = target.origin;
  const isHttps = target.protocol === "https:";

  // Certificat TLS et SPF/DMARC : désormais analysés en détail pour tous les scans
  // (lib/insights/tls.ts et lib/insights/dns.ts).

  // --- robots.txt / sitemap.xml ---
  const robots = await fetchText(`${origin}/robots.txt`, 6000);
  out.push(
    robots
      ? {
          id: "robots",
          category: "Bonnes pratiques",
          title: "robots.txt présent",
          severity: "info",
          state: "pass",
          detail: /sitemap:/i.test(robots)
            ? "robots.txt trouvé, avec référence au sitemap."
            : "robots.txt trouvé.",
        }
      : {
          id: "robots",
          category: "Bonnes pratiques",
          title: "robots.txt absent",
          severity: "low",
          state: "warn",
          detail: "Aucun fichier robots.txt.",
          recommendation: "Publiez un robots.txt et référencez-y votre sitemap.",
        }
  );

  // --- Contenu mixte (ressources http:// sur une page https) ---
  if (isHttps) {
    const html = await fetchText(origin, 9000);
    if (html) {
      const mixed = /(?:src|href)\s*=\s*["']http:\/\/[^"']+/gi.test(html);
      if (mixed) {
        out.push({
          id: "mixed-content",
          category: "Transport",
          title: "Contenu mixte détecté",
          severity: "medium",
          state: "fail",
          detail: "La page charge des ressources en http:// depuis une page https.",
          recommendation:
            "Servez toutes les ressources en HTTPS et ajoutez upgrade-insecure-requests à la CSP.",
        });
      }
    }
  }

  return out;
}
