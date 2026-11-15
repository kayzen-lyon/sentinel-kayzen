import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = {
  alternates: { canonical: "/mentions-legales" },
  title: "Mentions légales",
  robots: { index: false, follow: true },
};

export default function Page() {
  return (
    <LegalShell title="Mentions légales">
      <p>
        Conformément aux dispositions des articles 6-III et 19 de la loi n° 2004-575
        du 21 juin 2004 pour la Confiance dans l'économie numérique (LCEN), voici les
        mentions légales du site <strong>Sentinel by Kayzen</strong>.
      </p>

      <h2>Éditeur du site</h2>
      <p>
        Le site sentinel.kayzen-lyon.com est édité par <strong>Tarek BELHADJ</strong>,
        entrepreneur individuel exerçant sous le nom commercial{" "}
        <strong>Kayzen Web</strong>.
      </p>
      <ul>
        <li>Éditeur : Tarek BELHADJ — entrepreneur individuel (Kayzen Web)</li>
        <li>Adresse : 6, rue Pierre Termier, 69009 Lyon, France</li>
        <li>SIREN : 493 857 262 — SIRET (siège) : 493 857 262 00098</li>
        <li>Immatriculé au Registre National des Entreprises (RNE)</li>
        <li>Code APE : 62.01Z (programmation informatique)</li>
        <li>TVA non applicable, art. L. 233-3 du CIBS (franchise en base de TVA)</li>
        <li>Directeur de la publication : Tarek BELHADJ</li>
        <li>
          Téléphone : <a href="tel:+33487776861">+33 (0)4 87 77 68 61</a> — E-mail :{" "}
          <a href="mailto:contact@kayzen-lyon.fr">contact@kayzen-lyon.fr</a>
        </li>
      </ul>

      <h2>Hébergeur</h2>
      <p>
        Le site est hébergé par <strong>Vercel Inc.</strong>, 440 N Barranca Avenue
        #4133, Covina, CA 91723, États-Unis (<a href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com<span className="sr-only"> (nouvel onglet)</span></a>).
        La base de données PostgreSQL (Neon / Supabase) est hébergée au sein de l'Union
        européenne lorsque cette région est sélectionnée.
      </p>

      <h2>Nom de domaine et DNS</h2>
      <p>
        L'enregistrement du nom de domaine et la gestion DNS sont assurés par{" "}
        <strong>IONOS SARL</strong>, 7 place de la Gare, 57200 Sarreguemines, France.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L'ensemble des contenus (textes, visuels, logo Sentinel, charte graphique)
        présents sur ce site est la propriété de Kayzen Web, sauf mention contraire.
        Toute reproduction, représentation ou diffusion, totale ou partielle, sans
        autorisation écrite préalable est interdite.
      </p>
      <p>
        Le service Sentinel s'appuie sur le moteur open-source <strong>Strix</strong>,
        distribué sous licence Apache 2.0. Les marques et logos des tiers cités restent
        la propriété de leurs détenteurs respectifs.
      </p>

      <h2>Responsabilité</h2>
      <p>
        Kayzen Web s'efforce d'assurer l'exactitude des informations diffusées sur ce
        site mais ne saurait être tenue responsable des omissions, inexactitudes ou
        carences dans la mise à jour, qu'elles soient de son fait ou du fait de tiers
        partenaires.
      </p>

      <h2>Droit applicable</h2>
      <p>
        Les présentes mentions légales sont régies par le droit français. En cas de
        litige, les tribunaux français seront seuls compétents.
      </p>

      <h2>Réalisation du site</h2>
      <p>
        Ce site a été conçu et réalisé par <strong>Kayzen Web</strong> —{" "}
        <a href="https://www.kayzen-lyon.com" target="_blank" rel="noopener noreferrer">
          www.kayzen-lyon.com
        <span className="sr-only"> (nouvel onglet)</span></a>
        .
      </p>
    </LegalShell>
  );
}
