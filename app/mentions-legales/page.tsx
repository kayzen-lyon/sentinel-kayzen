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
        Le site sentinel.kayzen-lyon.com est édité par <strong>Kayzen Web</strong>,{" "}
        <span className="todo">[forme juridique — ex. SASU / EI]</span>.
      </p>
      <ul>
        <li>Raison sociale : <span className="todo">[Kayzen Web / à compléter]</span></li>
        <li>Siège social : <span className="todo">[adresse complète, Lyon]</span></li>
        <li>SIRET : <span className="todo">[numéro SIRET]</span></li>
        <li>Numéro de TVA intracommunautaire : <span className="todo">[FR…]</span></li>
        <li>Capital social : <span className="todo">[le cas échéant]</span></li>
        <li>Directeur de la publication : <span className="todo">[nom du responsable]</span></li>
        <li>Contact : <a href="mailto:contact@kayzen-lyon.fr">contact@kayzen-lyon.fr</a></li>
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

      <p className="todo">
        ⚠️ Seuls les champs d'identification légale de l'éditeur (forme juridique, SIRET,
        TVA, adresse du siège, directeur de la publication) restent à renseigner avec vos
        données officielles, puis à faire relire par un juriste avant mise en ligne.
      </p>
    </LegalShell>
  );
}
