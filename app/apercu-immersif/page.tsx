/* APERÇU ISOLÉ de la mise en scène « immersive » — étape 2 de la feuille de route.
   Servi uniquement par le serveur de développement (404 partout ailleurs), jamais
   indexé, absent du plan du site. Les vraies pages ne sont pas modifiées : cette
   page réutilise le vrai menu, les vraies sections et le vrai pied de page, et
   n'ajoute que quatre mises en scène (fichiers de ce dossier). */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Problem from "@/components/Problem";
import Features from "@/components/Features";
import Engines from "@/components/Engines";
import Integrations from "@/components/Integrations";
import Offers from "@/components/Offers";
import Coverage from "@/components/Coverage";
import Pricing from "@/components/Pricing";
import Group from "@/components/Group";
import Faq from "@/components/Faq";
import CtaFinal from "@/components/CtaFinal";
import Footer from "@/components/Footer";
import HeroImmersif from "./HeroImmersif";
import DerouleScene from "./DerouleScene";
import GroupeReel from "./GroupeReel";
import { FooterFiligrane, FooterOuverture } from "./FooterImmersif";
import "./apercu.css";

export const metadata: Metadata = {
  title: "Aperçu immersif (non publié)",
  robots: { index: false, follow: false },
};

export default function ApercuImmersif() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <div className="apv">
      <Header />
      <main>
        <HeroImmersif />
        <Problem />
        <Engines />
        <Features />
        <DerouleScene />
        <Integrations />
        <Offers />
        <Coverage />
        <Pricing />
        <Group />
        <GroupeReel />
        <Faq />
        <CtaFinal />
      </main>
      <FooterOuverture />
      <Footer />
      <FooterFiligrane />
    </div>
  );
}
