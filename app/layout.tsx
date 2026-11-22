import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { atkinson, jakarta, outfit } from "./fonts";
import { ToastProvider } from "@/components/ui/Toast";
import CookieBanner from "@/components/CookieBanner";
import { INIT_SCRIPT } from "@/lib/initScripts";
import AccessibilityToggle from "@/components/AccessibilityToggle";
import BackToTop from "@/components/BackToTop";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://sentinel.kayzen-lyon.com"),
  title: {
    default: "Sentinel by Kayzen — Pentest IA autonome & cybersécurité offensive",
    template: "%s | Sentinel by Kayzen",
  },
  description:
    "Sentinel déploie des agents IA qui pensent comme de vrais hackers : ils exécutent votre code, trouvent les failles et les prouvent par des PoC réels. Audit managé + plateforme self-service. Une entité du groupe Kayzen (Lyon).",
  keywords: [
    "pentest IA",
    "test d'intrusion automatisé",
    "cybersécurité",
    "audit de sécurité",
    "OWASP Top 10",
    "bug bounty",
    "DevSecOps",
    "Kayzen",
    "Lyon",
  ],
  authors: [{ name: "Kayzen Web", url: "https://www.kayzen-lyon.com" }],
  creator: "Kayzen Web",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    title: "Sentinel by Kayzen — Pentest IA autonome",
    description:
      "Des agents IA qui trouvent, exploitent et prouvent vos vulnérabilités. Audit managé + plateforme self-service. Groupe Kayzen.",
    siteName: "Sentinel by Kayzen",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Sentinel by Kayzen — Pentest IA autonome",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sentinel by Kayzen — Pentest IA autonome",
    description:
      "Des agents IA qui trouvent, exploitent et prouvent vos vulnérabilités. Groupe Kayzen.",
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Nonce CSP de la requête (posé par proxy.ts) pour le script d'initialisation en ligne.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="fr" className={`${jakarta.variable} ${outfit.variable} ${atkinson.variable}`} suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: INIT_SCRIPT }} />
      </head>
      <body>
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-[rgb(var(--on-brand))]"
        >
          Aller au contenu principal
        </a>
        <ToastProvider>{children}</ToastProvider>
        {/* Barre de progression de lecture (décorative, CSS pur). */}
        <div className="scroll-progress-bar no-print fixed inset-x-0 top-0 z-[80] h-0.5 bg-brand" aria-hidden="true" />
        <AccessibilityToggle />
        <BackToTop />
        <CookieBanner />
      </body>
    </html>
  );
}
