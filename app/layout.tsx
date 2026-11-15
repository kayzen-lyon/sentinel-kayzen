import type { Metadata, Viewport } from "next";
import { jakarta, outfit } from "./fonts";
import { ToastProvider } from "@/components/ui/Toast";
import CookieBanner from "@/components/CookieBanner";
import { THEME_INIT_SCRIPT } from "@/components/ui/ThemeToggle";
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${jakarta.variable} ${outfit.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-white"
        >
          Aller au contenu principal
        </a>
        <ToastProvider>{children}</ToastProvider>
        <CookieBanner />
      </body>
    </html>
  );
}
