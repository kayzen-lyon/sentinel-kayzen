/* eslint-disable @next/next/no-img-element -- logo local ; next/image impose un style en ligne que la CSP interdit */
import type { ReactNode } from "react";
import { COMPANY } from "@/lib/company";
import { LIBELLE_SEVERITE, SEVERITES, type ModeleRapport } from "@/lib/rapport";
import ThemeClairForce from "./ThemeClairForce";
import "./document.css";

/**
 * Gabarit des rapports de test d'intrusion, repris du DocumentRapport de Nexus : couverture,
 * sommaire, chapitres commençant chacun sur une nouvelle page, « Page n sur N », mentions légales
 * en dernière partie. Balisage sémantique (titres hiérarchisés, tableaux légendés) : Chrome produit
 * un PDF balisé. Thème clair forcé à l'écran comme à l'impression.
 */

function dateFr(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function TitreChapitre({ numero, titre, id }: { numero: number; titre: string; id: string }) {
  return (
    <div className="doc-chapitre">
      <span className="num" aria-hidden="true">{numero}</span>
      <h2 id={id}>
        <span className="sr-only">{numero}. </span>
        {titre}
      </h2>
    </div>
  );
}

function Feuille({ children }: { children: ReactNode }) {
  return <section className="doc-feuille">{children}</section>;
}

const SOMMAIRE = [
  { id: "synthese", titre: "Synthèse exécutive et risque global" },
  { id: "vulnerabilites", titre: "Vulnérabilités par gravité (CVSS), preuves et remédiation" },
  { id: "plan", titre: "Plan de remédiation par risque et effort" },
  { id: "methode", titre: "Méthode et limites" },
  { id: "mentions", titre: "Mentions légales et conditions d’utilisation du rapport" },
];

export default function DocumentRapport({ m, outils, conservation }: { m: ModeleRapport; outils: ReactNode; conservation: number | null }) {
  const pentest = m.constats.some((c) => c.source === "pentest");
  return (
    <>
      <ThemeClairForce />
      <div className="doc-outils no-print">{outils}</div>
      <article className="doc" lang="fr">
        <div className="doc-couverture">
          <div className="marque">
            <img src="/logo-mark.png" alt="" width={34} height={34} />
            <span>KAYZEN · SENTINEL</span>
          </div>
          <p className="surtitre">Rapport de test d’intrusion</p>
          <h1>{m.titre}</h1>
          <p className="site">{m.perimetre.join(", ") || "—"}</p>
          <div className="trait" aria-hidden="true" />
          <p className="meta">
            {m.periode ? (
              <>
                Tests du <strong>{dateFr(m.periode.debut)}</strong> au <strong>{dateFr(m.periode.fin)}</strong>
              </>
            ) : (
              "Période de test non renseignée"
            )}
            <br />
            Rapport établi le <strong>{dateFr(m.genereLe)}</strong>
          </p>
          <div className="bas">
            <p className="emetteur">
              <strong>{COMPANY.name} — {COMPANY.product}</strong>
              <br />
              {COMPANY.address}
              <br />
              {COMPANY.phone} · {COMPANY.email}
              <br />
              {COMPANY.site.replace(/^https?:\/\//, "")}
            </p>
            <p className="score">
              <span className="valeur">{m.risque.libelle}</span>
              <span className="lib">Risque global</span>
            </p>
          </div>
        </div>

        <Feuille>
          <div className="doc-chapitre">
            <h2 id="sommaire">Sommaire</h2>
          </div>
          <ol className="doc-sommaire">
            {SOMMAIRE.map((s, i) => (
              <li key={s.id}>
                <span className="n" aria-hidden="true">{i + 1}</span>
                <a href={`#${s.id}`}>{s.titre}</a>
              </li>
            ))}
          </ol>
          <p className="doc-note espace">
            Document confidentiel, destiné au seul client qui a autorisé les tests. Chaque constat provient d’un scan ou
            d’un pentest enregistré dans Sentinel, daté et rattaché au compte du client ; ce qui n’a pas été testé est
            signalé comme tel. Les secrets découverts pendant les tests sont masqués.
          </p>
        </Feuille>

        <Feuille>
          <TitreChapitre numero={1} titre="Synthèse exécutive et risque global" id="synthese" />
          <div className={`doc-risque ${m.risque.niveau}`}>
            <strong>Risque global : {m.risque.libelle}</strong>
            {m.risque.explication}
          </div>
          <dl className="doc-bilan">
            <div>
              <dt>Constats ouverts</dt>
              <dd>{m.constats.length}</dd>
            </div>
            <div>
              <dt>Critiques et élevés</dt>
              <dd>{m.comptes.critical + m.comptes.high}</dd>
            </div>
            <div>
              <dt>Cibles testées</dt>
              <dd>{m.perimetre.length}</dd>
            </div>
          </dl>
          <table>
            <caption>Constats ouverts par gravité</caption>
            <thead>
              <tr>
                <th scope="col">Gravité</th>
                <th scope="col" className="num-col">Nombre</th>
              </tr>
            </thead>
            <tbody>
              {SEVERITES.map((s) => (
                <tr key={s}>
                  <th scope="row">
                    <span className={`doc-pastille ${s}`} data-sev={s}>{LIBELLE_SEVERITE[s]}</span>
                  </th>
                  <td className="num-col">{m.comptes[s]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {m.plan.length > 0 && (
            <div className="doc-reco">
              <h3>Priorités</h3>
              <ul>
                {m.plan.slice(0, 3).map((e) => (
                  <li key={e.ref}>
                    {e.titre} — {LIBELLE_SEVERITE[e.severite].toLowerCase()}, {e.echeance.toLowerCase()}.
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Feuille>

        <Feuille>
          <TitreChapitre numero={2} titre="Vulnérabilités par gravité (CVSS), preuves et remédiation" id="vulnerabilites" />
          {m.constats.length === 0 ? (
            <p>Aucune vulnérabilité ouverte n’a été relevée par les tests de ce rapport.</p>
          ) : (
            m.constats.map((c) => (
              <div key={c.ref} className="doc-probleme">
                <div className="tete">
                  <h3>{c.titre}</h3>
                  <span className={`doc-pastille ${c.severite}`} data-sev={c.severite}>
                    {LIBELLE_SEVERITE[c.severite]}
                    {c.cvss !== null ? ` · CVSS ${c.cvss}` : ""}
                  </span>
                </div>
                <p className="muet petit">
                  Réf. {c.ref} · {c.source === "pentest" ? "pentest autonome" : "scan de configuration"} · cible {c.cible}
                  {c.references.length ? ` · ${c.references.join(", ")}` : ""}
                </p>
                {c.description && <p>{c.description}</p>}
                {c.preuve && (
                  <>
                    <h4>Preuve d’exploitation</h4>
                    <pre className="doc-preuve">{c.preuve}</pre>
                  </>
                )}
                {c.source === "pentest" && !c.preuve && <p className="muet petit">Aucune preuve d’exploitation transmise par le moteur.</p>}
                <h4>Remédiation</h4>
                <p>{c.remediation || "Le moteur n’a pas fourni de remédiation : à définir avec l’équipe technique."}</p>
              </div>
            ))
          )}
        </Feuille>

        <Feuille>
          <TitreChapitre numero={3} titre="Plan de remédiation par risque et effort" id="plan" />
          <p className="chapo">
            Ordre : risque décroissant, puis effort croissant (corrections rapides d’abord). Les échéances sont des
            suggestions à adapter à votre organisation.
          </p>
          {m.plan.length === 0 ? (
            <p>Aucune action requise par les constats de ce rapport.</p>
          ) : (
            <table>
              <caption>Plan de remédiation</caption>
              <thead>
                <tr>
                  <th scope="col" className="num-col">#</th>
                  <th scope="col">Constat</th>
                  <th scope="col">Gravité</th>
                  <th scope="col">Effort</th>
                  <th scope="col">Échéance suggérée</th>
                </tr>
              </thead>
              <tbody>
                {m.plan.map((e) => (
                  <tr key={e.ref}>
                    <td className="num-col">{e.rang}</td>
                    <th scope="row">{e.titre}</th>
                    <td>{LIBELLE_SEVERITE[e.severite]}</td>
                    <td>{e.effort ?? "non estimé"}</td>
                    <td>{e.echeance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Feuille>

        <Feuille>
          <TitreChapitre numero={4} titre="Méthode et limites" id="methode" />
          <h3>Périmètre autorisé</h3>
          <p>
            {m.perimetre.join(", ") || "—"}. Chaque test actif a exigé une autorisation écrite du client couvrant l’hôte à
            la date du test, et une preuve de propriété du domaine.
          </p>
          <h3>Dates</h3>
          <p>{m.periode ? `Du ${dateFr(m.periode.debut)} au ${dateFr(m.periode.fin)}.` : "Non renseignées."}</p>
          <h3>Outils</h3>
          <ul className="liste">
            {m.methode.outils.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
          <table>
            <caption>Tests inclus dans ce rapport</caption>
            <thead>
              <tr>
                <th scope="col">Test</th>
                <th scope="col">Cible</th>
                <th scope="col">Date</th>
                <th scope="col">Détail</th>
              </tr>
            </thead>
            <tbody>
              {m.methode.pentests.map((p) => (
                <tr key={p.id}>
                  <th scope="row">Pentest autonome</th>
                  <td>{p.cible}</td>
                  <td>{p.debut ? dateFr(p.debut) : "—"}</td>
                  <td>mode {p.mode}</td>
                </tr>
              ))}
              {m.methode.scans.map((s) => (
                <tr key={s.id}>
                  <th scope="row">Scan {s.approfondi ? "approfondi" : "passif"}</th>
                  <td>{s.cible}</td>
                  <td>{dateFr(s.date)}</td>
                  <td>{s.score !== null ? `score ${s.score}/100` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3>Ce qui n’a pas été testé</h3>
          <ul className="liste">
            {m.methode.nonTeste.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <p className="doc-note">
            Un test d’intrusion donne une image à un instant donné : l’absence de constat ne prouve pas l’absence de
            vulnérabilité.
            {pentest &&
              " Les pentests sont menés par des agents d’intelligence artificielle (moteur Strix) ; leurs constats ont été relus par un second passage automatique, pas par un auditeur humain, sauf mention contraire."}
          </p>
        </Feuille>

        <Feuille>
          <TitreChapitre numero={5} titre="Mentions légales et conditions d’utilisation du rapport" id="mentions" />
          <h3>Éditeur du rapport</h3>
          <dl className="fiche">
            <dt>Éditeur</dt>
            <dd>{COMPANY.legalName}, exerçant sous le nom commercial {COMPANY.name}</dd>
            <dt>Locaux</dt>
            <dd>{COMPANY.address}</dd>
            <dt>SIREN / SIRET</dt>
            <dd>
              {COMPANY.siren} / {COMPANY.siret}
            </dd>
            <dt>Code APE</dt>
            <dd>{COMPANY.ape}</dd>
            <dt>Téléphone</dt>
            <dd>{COMPANY.phone}</dd>
            <dt>Courriel</dt>
            <dd>{COMPANY.email}</dd>
            <dt>Outil</dt>
            <dd>
              {COMPANY.product} ({COMPANY.site.replace(/^https?:\/\//, "")}), hébergé par {COMPANY.hosting}
            </dd>
            <dt>Mentions complètes</dt>
            <dd>{COMPANY.site.replace(/^https?:\/\//, "")}/mentions-legales</dd>
          </dl>
          <h3>Confidentialité et diffusion</h3>
          <p>
            Ce rapport contient des informations permettant d’attaquer les systèmes décrits. Il est réservé au client
            et aux personnes qu’il désigne pour la correction. Il n’est jamais publié par lien : il n’est accessible qu’aux
            membres authentifiés du compte, et ses exports (Markdown, JSON, CSV) ne contiennent aucune preuve
            d’exploitation.
          </p>
          <h3>Conservation</h3>
          <p>
            {conservation
              ? `Ce rapport est supprimé automatiquement ${conservation} jours après sa création.`
              : "La durée de conservation des rapports et des preuves n’est pas encore fixée : elle relève du contrat client et du RGPD. En attendant, le rapport reste accessible jusqu’à sa suppression par le client."}
          </p>
          <h3>Portée et responsabilité</h3>
          <p>
            Les tests ont porté sur le seul périmètre autorisé par écrit, aux dates indiquées. Les recommandations sont
            une obligation de moyens ; {COMPANY.name} ne garantit pas l’absence d’autres vulnérabilités ni l’effet des
            corrections mises en œuvre par le client.
          </p>
          <h3>Données personnelles</h3>
          <p>
            Les preuves d’exploitation sont chiffrées au repos et les secrets découverts pendant les tests sont masqués
            dans ce rapport et ses exports. Pour exercer vos droits : {COMPANY.email}.
          </p>
          <h3>Accessibilité du document</h3>
          <p>
            Titres hiérarchisés, tableaux légendés avec en-têtes, gravité toujours écrite en toutes lettres (la couleur
            n’est jamais seule porteuse d’information), contrastes de niveau AA. En cas de difficulté de lecture,
            écrivez à {COMPANY.email} : une version adaptée vous sera fournie.
          </p>
          <h3>Droit applicable</h3>
          <p>
            Droit français, dans les conditions des conditions générales de vente de {COMPANY.product} (article « Droit
            applicable et juridiction »), consultables sur {COMPANY.site.replace(/^https?:\/\//, "")}/cgv.
          </p>
        </Feuille>
      </article>
    </>
  );
}
