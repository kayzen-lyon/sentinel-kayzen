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

      <h2>Cadre légal</h2>
      <p>
        Ce site vise la conformité à la directive européenne (UE) 2019/882
        (<strong>European Accessibility Act</strong>), transposée en droit français, et
        applique les critères du <strong>RGAA</strong> alignés sur les <strong>WCAG 2.1
        niveau AA</strong>.
      </p>

      <h2>État de conformité</h2>
      <p>
        L'accessibilité a été intégrée dès la conception (accessibilité «&nbsp;by
        design&nbsp;»). À ce jour, le site n'a pas encore fait l'objet d'un{" "}
        <strong>audit RGAA formel</strong> par un tiers&nbsp;: aucun taux de conformité
        officiel ne peut donc être déclaré. Un audit complet des 106 critères, réalisé par
        notre entité <strong>Konforme</strong>, est planifié&nbsp;; ses résultats et la
        date de vérification seront publiés ici.
      </p>

      <h2>Retour et contact</h2>
      <p>
        Si vous rencontrez une difficulté d'accès à un contenu ou une fonctionnalité,
        contactez-nous à <a href="mailto:contact@kayzen-lyon.fr">contact@kayzen-lyon.fr</a>{" "}
        ou au <a href="tel:+33487776861">+33 (0)4 87 77 68 61</a>. Nous répondons sous 24 h
        ouvrées et proposons une alternative accessible.
      </p>

      <h2>Voie de recours</h2>
      <p>
        Si une réponse satisfaisante ne vous est pas apportée, vous pouvez saisir le{" "}
        <a href="https://www.defenseurdesdroits.fr" target="_blank" rel="noopener noreferrer">
          Défenseur des droits
        <span className="sr-only"> (nouvel onglet)</span></a>{" "}
        (formulaire en ligne, ou par courrier&nbsp;: Défenseur des droits, Libre réponse
        71120, 75342 Paris CEDEX 07).
      </p>
    </LegalShell>
  );
}
