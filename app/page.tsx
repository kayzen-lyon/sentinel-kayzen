import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Problem from "@/components/Problem";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import Offers from "@/components/Offers";
import Coverage from "@/components/Coverage";
import Pricing from "@/components/Pricing";
import Group from "@/components/Group";
import Faq from "@/components/Faq";
import CtaFinal from "@/components/CtaFinal";
import Footer from "@/components/Footer";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://sentinel.kayzen-lyon.fr/#org",
      name: "Sentinel by Kayzen",
      url: "https://sentinel.kayzen-lyon.fr",
      logo: "https://sentinel.kayzen-lyon.fr/logo-mark.png",
      parentOrganization: { "@type": "Organization", name: "Kayzen Web", url: "https://kayzen-lyon.fr" },
      areaServed: "FR",
      address: { "@type": "PostalAddress", addressLocality: "Lyon", addressCountry: "FR" },
      email: "contact@kayzen-lyon.fr",
    },
    {
      "@type": "WebSite",
      "@id": "https://sentinel.kayzen-lyon.fr/#website",
      url: "https://sentinel.kayzen-lyon.fr",
      name: "Sentinel by Kayzen",
      inLanguage: "fr-FR",
      publisher: { "@id": "https://sentinel.kayzen-lyon.fr/#org" },
    },
    {
      "@type": "Service",
      name: "Sentinel by Kayzen",
      serviceType: "Scan de sécurité IA & pentest",
      provider: { "@id": "https://sentinel.kayzen-lyon.fr/#org" },
      description:
        "Scanner de posture de sécurité en self-service (en-têtes, TLS, CSP, expositions) et audit managé par les experts Kayzen.",
      url: "https://sentinel.kayzen-lyon.fr",
      offers: {
        "@type": "Offer",
        priceCurrency: "EUR",
        price: "0",
        description: "Scan de sécurité initial gratuit.",
      },
    },
  ],
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main>
        <Hero />
        <Problem />
        <Features />
        <HowItWorks />
        <Offers />
        <Coverage />
        <Pricing />
        <Group />
        <Faq />
        <CtaFinal />
      </main>
      <Footer />
    </>
  );
}
