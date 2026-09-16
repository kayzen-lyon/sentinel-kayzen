import type { MetadataRoute } from "next";

const BASE = "https://sentinel.kayzen-lyon.com";

// Date figée : évite de signaler un changement à chaque déploiement,
// ce qui diluerait la priorité de crawl des pages stables.
const LAST_MODIFIED = new Date("2026-09-16");

export default function sitemap(): MetadataRoute.Sitemap {
  const now = LAST_MODIFIED;
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];
}
