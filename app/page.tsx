import Header from "@/components/Header";
import Hero from "@/components/Hero";
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
import { FAQ } from "@/lib/faq";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    url: "/",
    title: "Sentinel by Kayzen — Pentest IA autonome",
    description:
      "Des agents IA qui trouvent, exploitent et prouvent vos vulnérabilités par des PoC réels. Audit managé + plateforme self-service.",
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
        acceptedAnswer: { "@type": "Answer", text: item.a },
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

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml }}
      />
      <Header />
      <main>
        <Hero />
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
