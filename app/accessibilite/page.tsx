import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = {
  alternates: { canonical: "/accessibilite" },
  title: "Déclaration d'accessibilité",
  robots: { index: false, follow: true },
};

export default function Page() {
  return (
    <LegalShell title="Accessibilité">
      <p>
        Le groupe Kayzen — dont fait partie <strong>Konforme</strong>, notre entité
        dédiée à la mise en conformité accessibilité (European Accessibility Act) — porte
        une attention particulière à l'accessibilité numérique. Cette page présente notre
        engagement pour le site <strong>Sentinel</strong>.
      </p>

      <h2>Notre engagement</h2>
      <p>
        Nous visons la conformité au <strong>RGAA</strong> (Référentiel Général
        d'Amélioration de l'Accessibilité) et aux critères <strong>WCAG 2.1 niveau AA</strong>.
        Le site est conçu pour être utilisable au clavier, compatible avec les lecteurs
        d'écran et lisible avec un contraste suffisant.
      </p>

      <h2>Mesures mises en œuvre</h2>
      <ul>
        <li>Structure sémantique (landmarks, titres hiérarchisés) et lien d'évitement.</li>
        <li>Navigation complète au clavier et focus visibles.</li>
        <li>Textes alternatifs sur les images porteuses d'information.</li>
        <li>Respect des préférences de mouvement réduit (<code>prefers-reduced-motion</code>).</li>
        <li>Contrastes conformes sur les textes et composants interactifs.</li>
      </ul>

      <h2>État de conformité</h2>
      <p>
        <span className="todo">
          [À compléter après audit : conforme / partiellement conforme / non conforme,
          et taux de conformité RGAA.]
        </span>
      </p>

      <h2>Retour et contact</h2>
      <p>
        Si vous rencontrez une difficulté d'accès à un contenu ou une fonctionnalité,
        contactez-nous à <a href="mailto:contact@kayzen-lyon.fr">contact@kayzen-lyon.fr</a>.
        Nous nous efforçons de répondre sous 24 h ouvrées et de proposer une alternative
        accessible.
      </p>

      <p className="todo">
        ⚠️ Déclaration à finaliser après un audit d'accessibilité formel (Konforme peut
        le réaliser) : date d'audit, référentiel, résultats détaillés et voie de recours
        (Défenseur des droits).
      </p>
    </LegalShell>
  );
}
