import Header from "@/components/Header";
import Hero from "@/components/Hero";
import OnThisPage from "@/components/OnThisPage";
import Problem from "@/components/Problem";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import Engines from "@/components/Engines";
import Integrations from "@/components/Integrations";
import Offers from "@/components/Offers";
import Coverage from "@/components/Coverage";
import Pricing from "@/components/Pricing";
import Group from "@/components/Group";
import GroupReel from "@/components/GroupReel";
import Faq from "@/components/Faq";
import CtaFinal from "@/components/CtaFinal";
import Footer from "@/components/Footer";
import { FAQ, faqPlain } from "@/lib/faq";
import type { Metadata } from "next";
import { headers } from "next/headers";

// Mot-clé cible dans le title (≤ 60 caractères) et la description (120 à 160).
const HOME_TITLE = "Pentest IA et test d'intrusion | Sentinel by Kayzen";
const HOME_DESCRIPTION =
  "Pentest IA et test d'intrusion automatisé : des agents exploitent vos failles et les prouvent par un PoC. Scan passif gratuit, audit managé par Kayzen à Lyon.";

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    url: "/",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://sentinel.kayzen-lyon.com/#org",
      name: "Sentinel by Kayzen",
      url: "https://sentinel.kayzen-lyon.com",
      logo: "https://sentinel.kayzen-lyon.com/logo-mark.png",
      parentOrganization: { "@type": "Organization", name: "Kayzen Web", url: "https://www.kayzen-lyon.com" },
      areaServed: "FR",
      address: { "@type": "PostalAddress", addressLocality: "Lyon", addressCountry: "FR" },
      email: "contact@kayzen-lyon.fr",
    },
    {
      "@type": "WebSite",
      "@id": "https://sentinel.kayzen-lyon.com/#website",
      url: "https://sentinel.kayzen-lyon.com",
      name: "Sentinel by Kayzen",
      inLanguage: "fr-FR",
      publisher: { "@id": "https://sentinel.kayzen-lyon.com/#org" },
    },
    {
      "@type": "Service",
      name: "Sentinel by Kayzen",
      serviceType: "Scan de sécurité IA & pentest",
      provider: { "@id": "https://sentinel.kayzen-lyon.com/#org" },
      description:
        "Scanner de posture de sécurité en self-service (en-têtes, TLS, CSP, expositions) et audit managé par les experts Kayzen.",
      url: "https://sentinel.kayzen-lyon.com",
      offers: {
        "@type": "Offer",
        priceCurrency: "EUR",
        price: "0",
        description: "Scan de sécurité initial gratuit.",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: faqPlain(item.a) },
      })),
    },
  ],
};

// `JSON.stringify` n'échappe pas le HTML : un `<` dans les données sortirait
// du <script>. On neutralise les caractères à risque avant l'injection.
const jsonLdHtml = JSON.stringify(jsonLd)
  .replace(/</g, "\\u003c")
  .replace(/>/g, "\\u003e")
  .replace(/&/g, "\\u0026");

export default async function Page() {
  // Nonce CSP de la requête (posé par proxy.ts), comme pour le script d'initialisation du layout.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: jsonLdHtml }}
      />
      <Header />
      <main>
        <Hero />
        <OnThisPage />
        <Problem />
        <Engines />
        <Features />
        <HowItWorks />
        <Integrations />
        <Offers />
        <Coverage />
        <Pricing />
        <Group />
        <GroupReel />
        <Faq />
        <CtaFinal />
      </main>
      <Footer />
    </>
  );
}
