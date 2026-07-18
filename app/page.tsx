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
  "@type": "Service",
  name: "Sentinel by Kayzen",
  serviceType: "Pentest IA autonome & cybersécurité offensive",
  provider: {
    "@type": "Organization",
    name: "Kayzen Web",
    url: "https://kayzen-lyon.fr",
    areaServed: "FR",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Lyon",
      addressCountry: "FR",
    },
  },
  description:
    "Des agents IA autonomes qui trouvent, exploitent et prouvent vos vulnérabilités par des PoC réels. Audit managé et plateforme self-service intégrée à la CI/CD.",
  url: "https://sentinel.kayzen-lyon.fr",
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
