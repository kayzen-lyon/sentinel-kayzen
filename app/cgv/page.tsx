import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = {
  alternates: { canonical: "/cgv" },
  title: "Conditions générales de vente",
  robots: { index: false, follow: true },
};

export default function Page() {
  return (
    <LegalShell title="Conditions générales de vente">
      <p>
        Les présentes conditions générales de vente (ci-après «&nbsp;CGV&nbsp;») régissent
        la vente des prestations et abonnements du service{" "}
        <strong>Sentinel by Kayzen</strong>, édité par la société{" "}
        <strong>KAYZEN LYON</strong>. Toute commande implique l'acceptation sans réserve
        des présentes CGV, qui prévalent sur tout autre document du client.
      </p>

      <h2>1. Identité du prestataire</h2>
      <p>
        KAYZEN LYON, société par actions simplifiée unipersonnelle (SASU), SIREN 999&nbsp;418&nbsp;346,
        RCS Lyon 999&nbsp;418&nbsp;346, TVA intracommunautaire FR85&nbsp;999&nbsp;418&nbsp;346,
        code APE 4791B, siège social 6, rue Pierre Termier, 69009 Lyon.
        Téléphone&nbsp;: <a href="tel:+33487776861">+33&nbsp;(0)4&nbsp;87&nbsp;77&nbsp;68&nbsp;61</a> —
        E-mail&nbsp;: <a href="mailto:contact@kayzen-lyon.fr">contact@kayzen-lyon.fr</a>.
      </p>

      <h2>2. Définitions</h2>
      <ul>
        <li><strong>Prestataire</strong>&nbsp;: KAYZEN LYON.</li>
        <li><strong>Client</strong>&nbsp;: toute personne physique ou morale souscrivant une prestation.</li>
        <li><strong>Services</strong>&nbsp;: l'audit de sécurité managé, la plateforme de scan et de pentest en libre-service, et les prestations associées.</li>
        <li><strong>Cible</strong>&nbsp;: le domaine, l'application, l'API ou le dépôt soumis à analyse.</li>
      </ul>

      <h2>3. Prestations proposées</h2>
      <p>Le Prestataire propose deux modalités, décrites sur la page Tarifs&nbsp;:</p>
      <ul>
        <li>
          <strong>Audit managé</strong>&nbsp;: prestation de test d'intrusion menée et
          interprétée par les experts du Prestataire, livrée avec un rapport et un plan
          de remédiation.
        </li>
        <li>
          <strong>Plateforme en libre-service</strong>&nbsp;: accès par abonnement au
          scanner de sécurité et au moteur de pentest (agents IA Strix ou moteurs open
          source), à la demande.
        </li>
      </ul>

      <h2>4. Prix</h2>
      <p>
        Les prix des abonnements et prestations sont indiqués sur la page Tarifs et/ou
        dans le devis remis au Client, en euros et hors taxes&nbsp;; la TVA au taux en
        vigueur s'ajoute. Le Prestataire peut modifier ses prix à tout moment&nbsp;; le
        prix applicable est celui en vigueur au jour de la commande ou du renouvellement.
      </p>

      <h2>5. Commande et souscription</h2>
      <p>
        La commande est ferme après acceptation du devis (prestation managée) ou
        validation de la souscription en ligne (abonnement). Le Client garantit
        l'exactitude des informations fournies et disposer de la capacité juridique de
        contracter.
      </p>

      <h2>6. Modalités de paiement</h2>
      <p>
        Sauf stipulation contraire du devis, les prestations managées sont payables selon
        l'échéancier convenu et les abonnements par prélèvement récurrent à la période
        souscrite (mensuelle ou annuelle). Tout retard de paiement entraîne, de plein
        droit, des pénalités au taux d'intérêt légal majoré et, pour les professionnels,
        l'indemnité forfaitaire de recouvrement de 40&nbsp;€ (art. L.441-10 du Code de
        commerce).
      </p>

      <h2>7. Autorisation légale de test — obligation essentielle</h2>
      <p>
        Les Services réalisent des tests de sécurité pouvant relever des articles 323-1
        et suivants du Code pénal lorsqu'ils sont effectués sans autorisation. En
        conséquence, le Client&nbsp;:
      </p>
      <ul>
        <li>
          <strong>garantit</strong> être propriétaire de la Cible ou disposer d'une
          autorisation écrite du propriétaire pour la soumettre à des tests d'intrusion&nbsp;;
        </li>
        <li>
          reconnaît que la plateforme n'autorise le pentest offensif qu'après{" "}
          <strong>vérification de propriété du domaine</strong>&nbsp;;
        </li>
        <li>
          <strong>garantit et indemnise</strong> le Prestataire contre toute réclamation
          de tiers résultant d'un test réalisé sur une Cible non autorisée.
        </li>
      </ul>
      <p>
        Le Prestataire peut suspendre immédiatement toute prestation en cas de doute
        sérieux sur l'autorisation ou d'usage manifestement illicite.
      </p>

      <h2>8. Obligations du Client</h2>
      <ul>
        <li>Fournir les informations et accès nécessaires à l'exécution des Services.</li>
        <li>Utiliser les Services conformément à la loi et aux présentes CGV.</li>
        <li>Préserver la confidentialité de ses identifiants et clés API.</li>
        <li>Ne pas tenter de contourner les garde-fous techniques ni de porter atteinte au service.</li>
      </ul>

      <h2>9. Exécution et délais</h2>
      <p>
        Les délais d'exécution des prestations managées sont convenus au devis&nbsp;; ils
        sont donnés à titre indicatif et courent à compter de la réception des éléments
        nécessaires. Les Services en libre-service sont fournis sans engagement de délai,
        selon une obligation de moyens.
      </p>

      <h2>10. Droit de rétractation</h2>
      <p>
        <strong>Consommateurs</strong>&nbsp;: conformément aux articles L.221-18 et
        suivants du Code de la consommation, le consommateur dispose d'un délai de{" "}
        <strong>14&nbsp;jours</strong> pour se rétracter. Toutefois, le Client
        consommateur qui demande l'exécution immédiate d'un service pleinement exécuté
        avant la fin de ce délai reconnaît renoncer à son droit de rétractation
        (art. L.221-28, 1°). <strong>Professionnels</strong>&nbsp;: le droit de
        rétractation ne s'applique pas.
      </p>

      <h2>11. Garanties et responsabilité</h2>
      <p>
        Le Prestataire est tenu à une obligation de moyens. Les Services visent à
        identifier des vulnérabilités&nbsp;; aucun test de sécurité ne peut garantir
        l'exhaustivité ni l'absence totale de faille. La responsabilité du Prestataire,
        toutes causes confondues, est limitée au montant des sommes effectivement versées
        par le Client au titre de la prestation concernée au cours des douze (12) derniers
        mois. Le Prestataire n'est pas responsable des dommages indirects (perte
        d'exploitation, de données, de chiffre d'affaires). Les garanties légales de
        conformité et des vices cachés (art. L.217-3 s. du Code de la consommation,
        art. 1641 s. du Code civil) demeurent applicables aux consommateurs.
      </p>

      <h2>12. Confidentialité et données personnelles</h2>
      <p>
        Chaque partie s'engage à la confidentialité des informations échangées. Les
        résultats d'audit appartiennent au Client et ne sont jamais partagés avec des
        tiers. Le traitement des données personnelles est décrit dans notre{" "}
        <a href="/confidentialite">politique de confidentialité</a>, conforme au RGPD.
      </p>

      <h2>13. Propriété intellectuelle</h2>
      <p>
        Le Prestataire conserve l'ensemble des droits sur la plateforme, ses composants
        et sa méthodologie. Le Client dispose d'un droit d'usage personnel, non exclusif
        et non cessible, pendant la durée de l'abonnement. Les rapports livrés peuvent
        être utilisés librement par le Client pour ses besoins internes et de conformité.
      </p>

      <h2>14. Durée et résiliation</h2>
      <p>
        Les abonnements sont souscrits pour la période choisie et reconduits tacitement,
        sauf résiliation avant l'échéance depuis l'espace client ou par e-mail. Les
        dispositions relatives à la reconduction (art. L.215-1 s. du Code de la
        consommation) s'appliquent aux consommateurs. En cas de manquement grave, chaque
        partie peut résilier après mise en demeure restée sans effet pendant 15&nbsp;jours.
      </p>

      <h2>15. Force majeure</h2>
      <p>
        Aucune partie ne saurait être tenue responsable d'un manquement dû à un cas de
        force majeure au sens de l'article 1218 du Code civil.
      </p>

      <h2>16. Réclamation et médiation de la consommation</h2>
      <p>
        Toute réclamation peut être adressée à{" "}
        <a href="mailto:contact@kayzen-lyon.fr">contact@kayzen-lyon.fr</a>. Conformément
        aux articles L.612-1 s. du Code de la consommation, le consommateur peut recourir
        gratuitement à un médiateur de la consommation en vue de la résolution amiable
        d'un litige. La plateforme européenne de règlement en ligne des litiges est
        accessible à l'adresse{" "}
        <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">
          ec.europa.eu/consumers/odr
        </a>
        .
      </p>

      <h2>17. Droit applicable et juridiction</h2>
      <p>
        Les présentes CGV sont soumises au droit français. À défaut de résolution amiable,
        les litiges relèvent des tribunaux compétents du ressort du siège du Prestataire
        pour les professionnels&nbsp;; pour les consommateurs, les règles de compétence de
        droit commun s'appliquent.
      </p>

      <p className="todo">
        ⚠️ Modèle rédigé à partir de votre identité légale et de votre offre. Les
        conditions commerciales chiffrées (prix fermes, échéanciers, médiateur désigné,
        SLA) et l'adaptation finale doivent être validées par un conseil juridique avant
        mise en ligne définitive.
      </p>
    </LegalShell>
  );
}
