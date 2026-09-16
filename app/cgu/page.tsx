import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = {
  alternates: { canonical: "/cgu" },
  title: "Conditions générales d'utilisation",
  robots: { index: false, follow: true },
};

export default function Page() {
  return (
    <LegalShell title="Conditions générales d'utilisation">
      <p>
        Les présentes conditions générales d'utilisation (CGU) encadrent l'accès et
        l'usage du site et du service <strong>Sentinel by Kayzen</strong>, édité par
        Kayzen Web.
      </p>

      <h2>1. Objet</h2>
      <p>
        Sentinel propose des services de test d'intrusion assisté par IA (audit managé
        et plateforme self-service). Les présentes CGU définissent les conditions dans
        lesquelles l'utilisateur peut accéder à ces services.
      </p>

      <h2>2. Autorisation et périmètre des tests</h2>
      <p>
        <strong>
          L'utilisateur garantit qu'il est propriétaire des systèmes testés ou qu'il
          dispose d'une autorisation écrite explicite pour en réaliser l'audit.
        </strong>{" "}
        Tout test réalisé sans autorisation est strictement interdit et engage la seule
        responsabilité de l'utilisateur. Le périmètre, les exclusions et les règles
        d'engagement sont définis contractuellement avant toute intervention.
      </p>

      <h2>3. Usage conforme</h2>
      <ul>
        <li>Ne pas utiliser le service à des fins illégales ou malveillantes.</li>
        <li>Ne pas tenter de contourner les limites techniques du service.</li>
        <li>Ne pas cibler des systèmes tiers sans autorisation.</li>
      </ul>

      <h2>4. Résultats et responsabilité</h2>
      <p>
        Sentinel fournit ses résultats en l'état. Bien que le service vise l'exhaustivité,
        aucun audit ne peut garantir l'absence totale de vulnérabilités. Kayzen Web ne
        saurait être tenue responsable des dommages résultant d'un usage non conforme ou
        d'une exploitation des résultats hors du cadre convenu.
      </p>

      <h2>5. Propriété et confidentialité</h2>
      <p>
        Les livrables d'audit appartiennent au client. Chaque partie s'engage à préserver
        la confidentialité des informations échangées.
      </p>

      <h2>6. Tarifs et commande</h2>
      <p>
        Les conditions tarifaires sont précisées par devis ou lors de la souscription à
        la plateforme. <span className="todo">[Renvoyer vers vos CGV si distinctes.]</span>
      </p>

      <h2>7. Modification des CGU</h2>
      <p>
        Kayzen Web se réserve le droit de modifier les présentes CGU à tout moment. La
        version applicable est celle en vigueur à la date d'utilisation du service.
      </p>

      <h2>8. Droit applicable</h2>
      <p>
        Les présentes CGU sont soumises au droit français. Tout litige relève de la
        compétence des tribunaux français.
      </p>

      <p className="todo">
        ⚠️ Modèle à faire valider par un juriste et à compléter avec vos CGV
        (facturation, résiliation, SLA) avant mise en ligne.
      </p>
    </LegalShell>
  );
}
