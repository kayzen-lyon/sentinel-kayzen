import type { MetadataRoute } from "next";
import { allCourses } from "@/lib/blog";
import { TRACKS } from "@/lib/courseParser";

const BASE = "https://sentinel.kayzen-lyon.com";

// Date figée : évite de signaler un changement à chaque déploiement,
// ce qui diluerait la priorité de crawl des pages stables.
const LAST_MODIFIED = new Date("2026-09-16");

export default function sitemap(): MetadataRoute.Sitemap {
  const now = LAST_MODIFIED;
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/retractation`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/blog`, lastModified: new Date("2026-11-22"), changeFrequency: "weekly", priority: 0.8 },
    ...Object.keys(TRACKS).map((t) => ({
      url: `${BASE}/blog/parcours/${t}`,
      lastModified: new Date("2026-11-22"),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...allCourses().map((c) => ({
      url: `${BASE}/blog/${c.slug}`,
      lastModified: new Date(c.updated),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
