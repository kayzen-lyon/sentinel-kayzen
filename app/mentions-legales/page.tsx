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
        Le site sentinel.kayzen-lyon.com est édité par <strong>KAYZEN LYON</strong>,
        société par actions simplifiée unipersonnelle (SASU).
      </p>
      <ul>
        <li>Raison sociale : KAYZEN LYON (SASU)</li>
        <li>Siège social : 6, rue Pierre Termier, 69009 Lyon, France</li>
        <li>SIREN : 999 418 346 — SIRET (siège) : 999 418 346 00014</li>
        <li>RCS : Lyon 999 418 346</li>
        <li>Numéro de TVA intracommunautaire : FR85 999 418 346</li>
        <li>Code APE : 4791B</li>
        <li>Directeur de la publication : le président de KAYZEN LYON</li>
        <li>
          Téléphone : <a href="tel:+33487776861">+33 (0)4 87 77 68 61</a> — E-mail :{" "}
          <a href="mailto:contact@kayzen-lyon.fr">contact@kayzen-lyon.fr</a>
        </li>
      </ul>

      <h2>Hébergeur</h2>
      <p>
        Le site est hébergé par <strong>Vercel Inc.</strong>, 340 S Lemon Avenue #4133,
        Walnut, CA 91789, États-Unis (<a href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a>). La
        base de données est opérée par notre prestataire d'hébergement PostgreSQL (Neon
        ou Supabase selon la configuration), au sein de l'Union européenne lorsque cette
        région est sélectionnée.
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
        Ce site a été conçu et réalisé par <strong>Kayzen Web</strong>, agence web de
        KAYZEN LYON —{" "}
        <a href="https://internet.kayzen-lyon.fr" target="_blank" rel="noopener noreferrer">
          internet.kayzen-lyon.fr
        </a>
        .
      </p>
    </LegalShell>
  );
}
