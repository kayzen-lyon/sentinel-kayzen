import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/jwt";

/**
 * 1. Content-Security-Policy des pages, avec un nonce par requête : les scripts en ligne
 *    ne sont plus autorisés par 'unsafe-inline' mais par ce nonce ('strict-dynamic' étend
 *    la confiance aux scripts que Next charge lui-même). Contrepartie assumée : les pages
 *    sont rendues à la demande (le nonce change à chaque requête).
 *    Les styles en ligne sont interdits eux aussi (plus aucun 'unsafe-inline' dans la CSP,
 *    hors mode développement où Next en injecte pour le rechargement à chaud).
 * 2. Protection des routes /dashboard (session requise).
 */
function buildCsp(nonce: string): string {
  const dev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "frame-src 'none'",
    "child-src 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "media-src 'self'",
    // Images servies comme fichiers : ni data: ni blob: (ANSSI WEB R15).
    "img-src 'self'",
    "font-src 'self'",
    // Styles : feuilles du site uniquement, aucun style en ligne (ni balise, ni attribut).
    dev ? "style-src 'self' 'unsafe-inline'" : "style-src 'self'",
    // 'unsafe-eval' en développement uniquement (outils de débogage de React).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "connect-src 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export async function proxy(req: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);

  if (req.nextUrl.pathname.startsWith("/dashboard")) {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    const session = token ? await verifySessionToken(token) : null;
    if (!session) {
      const url = new URL("/login", req.url);
      url.searchParams.set("next", req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }

  // Next lit le nonce dans l'en-tête CSP de la REQUÊTE pour l'apposer sur ses scripts ;
  // x-nonce sert au script d'initialisation du thème (app/layout.tsx).
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export const config = {
  matcher: [
    // Toutes les pages ; pas les API, ni les fichiers statiques, ni les préchargements.
    {
      source: "/((?!api/|_next/static|_next/image|qr/|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml|vcf|webmanifest|json)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
