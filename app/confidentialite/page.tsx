import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = {
  alternates: { canonical: "/confidentialite" },
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
      </ul>
      <p>
        Le site <strong>ne recourt à aucun outil de mesure d'audience ni traceur
        publicitaire tiers</strong> (pas de Google Analytics, pas de pixel, pas de
        régie). Seul un cookie strictement nécessaire est déposé (voir « Cookies »).
      </p>

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
        Les données de prospection sont conservées <strong>3 ans</strong>{" "}
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

      <h2>Cookies</h2>
      <p>
        Sentinel utilise un unique cookie <strong>strictement nécessaire</strong>,{" "}
        <code>sentinel_session</code>, qui maintient votre session authentifiée. Il est{" "}
        <code>httpOnly</code>, <code>Secure</code> et <code>SameSite=Lax</code>, et n'a
        aucune finalité publicitaire ou de suivi. Étant indispensable au service, il ne
        requiert pas de consentement préalable (article 82 de la loi Informatique et
        Libertés). Aucun cookie tiers n'est déposé.
      </p>

      <h2>Sous-traitants</h2>
      <p>
        Nous faisons appel aux prestataires suivants, qui n'accèdent aux données que pour
        les besoins du service :
      </p>
      <ul>
        <li><strong>Vercel Inc.</strong> — hébergement du site et des fonctions serveur.</li>
        <li><strong>Neon / Supabase</strong> — base de données (comptes, historique des scans).</li>
        <li><strong>Resend</strong> — envoi des rapports et e-mails transactionnels.</li>
        <li><strong>GitHub</strong> — exécution des runners d'analyse (GitHub Actions).</li>
        <li>
          <strong>Google</strong> (API Gemini) — moteur d'agents Strix, uniquement lors
          d'un pentest lancé volontairement sur un domaine dont vous êtes propriétaire.
        </li>
      </ul>
      <p>
        Certains prestataires sont situés hors UE (notamment aux États-Unis) ; les
        transferts sont encadrés par les clauses contractuelles types de la Commission
        européenne.
      </p>

      <p className="todo">
        ⚠️ Seules les durées de conservation ci-dessus restent à confirmer selon vos
        pratiques réelles ; faites relire l'ensemble par un juriste avant publication.
      </p>
    </LegalShell>
  );
}
