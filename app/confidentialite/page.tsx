import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  robots: { index: false, follow: true },
};

export default function Page() {
  return (
    <LegalShell title="Politique de confidentialité">
      <p>
        Cette politique décrit comment <strong>Kayzen Web</strong> collecte et traite
        vos données personnelles dans le cadre du service <strong>Sentinel</strong>,
        conformément au Règlement Général sur la Protection des Données (RGPD) et à la
        loi Informatique et Libertés.
      </p>

      <h2>Responsable du traitement</h2>
      <p>
        Kayzen Web — <span className="todo">[adresse]</span>. Délégué à la protection
        des données / contact : <a href="mailto:contact@kayzen-lyon.fr">contact@kayzen-lyon.fr</a>.
      </p>

      <h2>Données collectées</h2>
      <ul>
        <li>
          <strong>Formulaire de contact / demande d'audit</strong> : nom, adresse
          e-mail, société, message.
        </li>
        <li>
          <strong>Données techniques</strong> : cible d'audit fournie volontairement,
          journaux de connexion, adresse IP.
        </li>
        <li>
          <strong>Mesure d'audience</strong> : données de navigation (le cas échéant,
          via un outil respectueux de la vie privée).
        </li>
      </ul>

      <h2>Finalités et base légale</h2>
      <ul>
        <li>Répondre à vos demandes et réaliser les prestations d'audit (exécution du contrat / mesures précontractuelles).</li>
        <li>Assurer la sécurité et le bon fonctionnement du service (intérêt légitime).</li>
        <li>Respecter nos obligations légales et comptables (obligation légale).</li>
      </ul>

      <h2>Confidentialité des audits</h2>
      <p>
        Les résultats d'un audit de sécurité (vulnérabilités, PoC, rapports) vous
        appartiennent, sont stockés de façon sécurisée et ne sont jamais partagés avec
        des tiers. Un accord de confidentialité est signé avant toute prestation managée.
      </p>

      <h2>Durée de conservation</h2>
      <p>
        Les données de prospection sont conservées <span className="todo">[durée — ex. 3 ans]</span>{" "}
        après le dernier contact. Les données contractuelles sont conservées selon les
        durées légales en vigueur.
      </p>

      <h2>Vos droits</h2>
      <p>
        Vous disposez d'un droit d'accès, de rectification, d'effacement, d'opposition,
        de limitation et de portabilité de vos données. Pour les exercer, écrivez à{" "}
        <a href="mailto:contact@kayzen-lyon.fr">contact@kayzen-lyon.fr</a>. Vous pouvez
        également introduire une réclamation auprès de la CNIL (www.cnil.fr).
      </p>

      <h2>Sous-traitants</h2>
      <p>
        Nous faisons appel à des prestataires (hébergement, e-mail, moteur d'analyse
        Strix) qui n'accèdent aux données que pour les besoins du service :{" "}
        <span className="todo">[lister les sous-traitants]</span>.
      </p>

      <p className="todo">
        ⚠️ Modèle à adapter à vos traitements réels et à faire valider avant publication.
      </p>
    </LegalShell>
  );
}
