/** @type {import('next').NextConfig} */
// CSP des PAGES : posée par proxy.ts avec un nonce par requête (plus de 'unsafe-inline'
// sur les scripts). Ici, seulement la CSP des réponses d'API : du JSON, rien à exécuter.
const apiCsp = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'";

const securityHeaders = [
  // Vercel ajoute « Access-Control-Allow-Origin: * » aux pages prérendues : on le restreint
  // à notre propre origine (aucune autre origine n'a à lire ces réponses).
  { key: "Access-Control-Allow-Origin", value: "https://sentinel.kayzen-lyon.com" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), browsing-topics=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Ajoutés suite au scan Nuclei (en-têtes signalés manquants) — sûrs car le site
  // ne sert que ses propres ressources (img-src 'self' data: blob:).
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
];

const nextConfig = {
  // Les cours du blog sont lus sur disque à l'exécution : on les embarque dans les fonctions.
  outputFileTracingIncludes: {
    "/blog": ["./content/cours/**/*.md"],
    "/blog/[slug]": ["./content/cours/**/*.md"],
    "/blog/parcours/[track]": ["./content/cours/**/*.md"],
    "/sitemap.xml": ["./content/cours/**/*.md"],
  },
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/api/:path*",
        headers: [{ key: "Content-Security-Policy", value: apiCsp }],
      },
    ];
  },
};

export default nextConfig;
