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
        Tarek BELHADJ (Kayzen Web, entrepreneur individuel) — 6, rue Pierre Termier,
        69009 Lyon. Contact données
        personnelles : <a href="mailto:contact@kayzen-lyon.fr">contact@kayzen-lyon.fr</a>,
        <a href="tel:+33487776861">+33 (0)4 87 77 68 61</a>.
      </p>

      <h2>Données collectées</h2>
      <ul>
        <li>
          <strong>Compte</strong> : adresse e-mail, nom (facultatif) et mot de passe,
          conservé uniquement sous forme d'empreinte chiffrée.
        </li>
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
      <ul>
        <li>
          <strong>Compte et contenus associés</strong> (scans, pentests et rapports, domaines
          vérifiés, clés API, surveillances) : conservés tant que votre compte existe, puis
          effacés dès que vous le supprimez.
        </li>
        <li>
          <strong>Journal d'audit</strong> de votre organisation : 12 mois, puis suppression
          automatique.
        </li>
        <li>
          <strong>Liens à usage unique</strong> (réinitialisation de mot de passe, confirmation
          d'e-mail, invitations) : supprimés au plus tard 30 jours après leur expiration.
        </li>
        <li>
          <strong>Données de prospection</strong> (formulaire de contact) : 3 ans après le
          dernier contact.
        </li>
        <li>
          <strong>Données contractuelles et de facturation</strong> : durées légales en vigueur.
        </li>
      </ul>

      <h2>Vos droits</h2>
      <p>
        Vous disposez d'un droit d'accès, de rectification, d'effacement, d'opposition,
        de limitation et de portabilité de vos données. Deux de ces droits s'exercent
        directement depuis la console, rubrique « Mon compte » : télécharger une copie de
        vos données, et supprimer votre compte. Pour les autres, ou si vous n'avez pas de
        compte, écrivez à{" "}
        <a href="mailto:contact@kayzen-lyon.fr">contact@kayzen-lyon.fr</a>. Vous pouvez
        également introduire une réclamation auprès de la CNIL (www.cnil.fr).
      </p>

      <h2>Cookies et stockage local</h2>
      <p>
        Sentinel ne dépose <strong>aucun cookie de mesure d'audience ni de publicité</strong>{" "}
        et ne charge aucun script tiers. Seuls des éléments strictement nécessaires au
        service, ou enregistrant un réglage que vous avez vous-même choisi, sont utilisés ;
        ils ne requièrent pas de consentement préalable (article 82 de la loi Informatique
        et Libertés).
      </p>
      <ul>
        <li>
          <code>sentinel_session</code> (cookie) — maintient votre session authentifiée ;{" "}
          <code>httpOnly</code>, <code>Secure</code>, <code>SameSite=Lax</code>.
        </li>
        <li>
          <code>sentinel_org</code> (cookie) — organisation active choisie dans la console.
        </li>
        <li>
          <code>sentinel-cookie-prefs</code>, <code>sentinel-cookie-date</code>,{" "}
          <code>sentinel-cookie-version</code> (stockage local) — votre choix dans le bandeau
          cookies, sa date et la version du bandeau.
        </li>
        <li>
          <code>theme</code>, <code>kayzen-a11y</code>, <code>sentinel_sidebar_collapsed</code>{" "}
          (stockage local) — vos préférences d'affichage : thème clair ou sombre, réglages
          d'accessibilité, barre latérale de la console.
        </li>
      </ul>
      <p>
        Ces éléments de stockage local restent dans votre navigateur et ne nous sont pas
        transmis. Vous pouvez modifier votre choix à tout moment avec l'icône « cookies » en
        bas à gauche de chaque page. Si un outil de mesure d'audience était ajouté un jour,
        il ne serait activé qu'après votre accord.
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
    </LegalShell>
  );
}
