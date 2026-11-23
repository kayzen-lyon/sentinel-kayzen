/* eslint-disable @next/next/no-img-element -- logo local ; next/image impose un style en ligne que la CSP interdit */
import type { ReactNode } from "react";
import { COMPANY } from "@/lib/company";
import {
  LIBELLE_EFFORT,
  LIBELLE_SEVERITE,
  SEVERITES,
  type Constat,
  type ModeleRapport,
  type Severite,
  type Sujet,
} from "@/lib/rapport";
import { ECHELLE_CVSS, ECHELLE_NOTE, GLOSSAIRE, METRIQUES_CVSS, PENALITE } from "@/lib/referentiel";
import ThemeClairForce from "./ThemeClairForce";
import "./document.css";

/**
 * Rapport de test d'intrusion client, sur le modèle des audits KAYZEN : couverture, fiche de
 * contrôle, sommaire, introduction, synthèse, un chapitre par sujet (Résultat, Mesures, Problèmes
 * relevés, Nos recommandations), fiches détaillées, plan d'action, critères de contre-test,
 * conclusion et annexes exhaustives. Chaque chapitre commence sur une nouvelle page (« Page n sur
 * N »). Tout est calculé à partir des tests enregistrés ; ce qui n'a pas été mesuré est dit.
 */

function dateFr(iso: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00Z`) : new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
}

function court(t: string, n = 320): string {
  const s = t.replace(/\s+/g, " ").trim();
  return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;
}

function TitreChapitre({ numero, titre, id }: { numero: number | string; titre: string; id: string }) {
  return (
    <div className="doc-chapitre">
      <span className="num" aria-hidden="true">{numero}</span>
      <h2 id={id}>
        <span className="sr-only">{typeof numero === "number" ? `${numero}. ` : `Annexe ${numero}. `}</span>
        {titre}
      </h2>
    </div>
  );
}

function Feuille({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={`doc-feuille${className ? ` ${className}` : ""}`}>{children}</section>;
}

function Pastille({ s, cvss }: { s: Severite; cvss?: number | null }) {
  return (
    <span className={`doc-pastille ${s}`} data-sev={s}>
      {LIBELLE_SEVERITE[s]}
      {cvss !== null && cvss !== undefined ? ` · CVSS ${cvss}` : ""}
    </span>
  );
}

const ETAT_SUJET: Record<Sujet["etat"], { libelle: string; classe: string }> = {
  conforme: { libelle: "Conforme", classe: "ok" },
  "a-ameliorer": { libelle: "À améliorer", classe: "medium" },
  prioritaire: { libelle: "Prioritaire", classe: "critical" },
};

function EtatSujet({ e }: { e: Sujet["etat"] }) {
  return <span className={`doc-pastille ${ETAT_SUJET[e].classe}`}>{ETAT_SUJET[e].libelle}</span>;
}

const DELAI: Record<Severite, string> = {
  critical: "sous 72 heures",
  high: "sous 2 semaines",
  medium: "sous 3 mois",
  low: "au prochain cycle de maintenance",
  info: "à l’appréciation de l’équipe",
};
const PRIO: Record<Severite, string> = { critical: "P1", high: "P2", medium: "P3", low: "P4", info: "P4" };

const VERDICT: Record<string, string> = {
  confirmed: "Confirmée par relecture contradictoire",
  doubtful: "Douteuse à la relecture : à vérifier manuellement",
  rejected: "Rejetée à la relecture",
};

/** Barres horizontales en SVG (aucun style en ligne), toujours doublées d'un tableau. */
function Barres({ lignes, etiquette }: { lignes: { lib: string; val: number; texte: string; alerte?: boolean }[]; etiquette: string }) {
  const max = Math.max(1, ...lignes.map((l) => l.val));
  const H = 8;
  const W = 110;
  return (
    <svg className="doc-graphe" viewBox={`0 0 190 ${lignes.length * (H + 5)}`} role="img" aria-label={etiquette}>
      {lignes.map((l, i) => {
        const y = i * (H + 5);
        const w = l.val ? Math.max(1.5, (l.val / max) * W) : 0;
        return (
          <g key={l.lib}>
            <text x="0" y={y + H - 1.5} className="lib">{l.lib.length > 26 ? `${l.lib.slice(0, 25)}…` : l.lib}</text>
            <rect x="58" y={y} width={W} height={H} rx="1.5" className="piste" />
            {w > 0 && <rect x="58" y={y} width={w} height={H} rx="1.5" className={`barre${l.alerte ? " alerte" : ""}`} />}
            <text x={58 + W + 3} y={y + H - 1.5} className="val">{l.texte}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Bloc({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <>
      <h4>{titre}</h4>
      {children}
    </>
  );
}

function FicheVulnerabilite({ c, numero }: { c: Constat; numero: number }) {
  const lignes: [string, ReactNode][] = [
    ["Référence", c.ref],
    ["Gravité", <Pastille key="g" s={c.severite} />],
    ["Priorité de traitement", `${c.priorite}, correction ${DELAI[c.severite]}`],
    ["Score CVSS v3.1 (base)", c.cvss !== null ? c.cvss.toFixed(1) : "Non calculé (constat de configuration)"],
    ["Vecteur CVSS", c.vecteurCvss ? <code key="v">{c.vecteurCvss}</code> : "Non fourni"],
    ["Catégorie OWASP Top 10", c.owasp ? `${c.owasp.code} — ${c.owasp.libelle}` : "Non classée"],
    ["Faiblesse (CWE)", c.cwe || "Non renseignée"],
    ["Vulnérabilité publique (CVE)", c.cve || "Sans objet"],
    ["Cible", c.cible],
    ["Point d’entrée", c.pointEntree || "Non précisé"],
    ["Origine", c.source === "pentest" ? "Test d’intrusion autonome (exploitation contrôlée)" : "Analyse de configuration"],
    ["Relecture contradictoire", c.validation ? VERDICT[c.validation.verdict] : c.source === "pentest" ? "Sans verdict" : "Sans objet"],
    ["Effort de correction", c.effort ? LIBELLE_EFFORT[c.effort] : "Non estimé"],
  ];
  const p = c.preuve;
  return (
    <Feuille className="doc-fiche">
      <div className="doc-fiche-tete">
        <p className="ref">Fiche {numero}</p>
        <h3 id={`v-${numero}`}>{c.titre}</h3>
      </div>
      <table className="doc-meta">
        <caption className="sr-only">Caractéristiques de la vulnérabilité {numero}</caption>
        <tbody>
          {lignes.map(([k, v]) => (
            <tr key={k}>
              <th scope="row">{k}</th>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Bloc titre="Description">
        <p className="doc-texte">{c.description || "Le moteur n’a pas fourni de description détaillée."}</p>
      </Bloc>
      {c.impact && (
        <Bloc titre="Impact">
          <p className="doc-texte">{c.impact}</p>
        </Bloc>
      )}
      {c.validation?.raison && (
        <Bloc titre="Conclusion de la relecture">
          <p className="doc-texte">{c.validation.raison}</p>
        </Bloc>
      )}
      {p?.analyse && (
        <Bloc titre="Analyse technique">
          <p className="doc-texte">{p.analyse}</p>
        </Bloc>
      )}
      {p?.reproduction && (
        <Bloc titre="Étapes de reproduction">
          <p className="doc-texte">{p.reproduction}</p>
        </Bloc>
      )}
      {p?.elements && (
        <Bloc titre="Éléments de preuve">
          <pre className="doc-preuve">{p.elements}</pre>
        </Bloc>
      )}
      {p?.script && (
        <Bloc titre="Script de preuve de concept">
          <pre className="doc-preuve">{p.script}</pre>
        </Bloc>
      )}
      {p?.autres && (
        <Bloc titre="Autres éléments transmis par le moteur">
          <pre className="doc-preuve">{p.autres}</pre>
        </Bloc>
      )}
      {c.preuveIllisible && (
        <p className="doc-note">Une preuve chiffrée existe mais n’a pas pu être lue : la clé de chiffrement a changé depuis son enregistrement.</p>
      )}
      {c.source === "pentest" && !p && !c.preuveIllisible && (
        <p className="doc-note">Aucune preuve d’exploitation n’a été transmise par le moteur pour ce constat.</p>
      )}
      {c.localisations.length > 0 && (
        <Bloc titre="Localisation dans le code source">
          <ul className="liste">
            {c.localisations.map((l) => (
              <li key={l}>
                <code>{l}</code>
              </li>
            ))}
          </ul>
        </Bloc>
      )}
      {c.hypotheses && (
        <Bloc titre="Hypothèses et conditions d’exploitation">
          <p className="doc-texte">{c.hypotheses}</p>
        </Bloc>
      )}
      {c.metriquesCvss.length > 0 && (
        <table>
          <caption>Détail du score CVSS v3.1</caption>
          <thead>
            <tr>
              <th scope="col">Métrique</th>
              <th scope="col">Valeur retenue</th>
            </tr>
          </thead>
          <tbody>
            {c.metriquesCvss.map((x) => (
              <tr key={x.libelle}>
                <th scope="row">{x.libelle}</th>
                <td>{x.valeur}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="doc-reco">
        <h4>Remédiation recommandée</h4>
        <p className="doc-texte">
          {c.remediation || "Le moteur n’a pas fourni de remédiation : à définir avec l’équipe technique à partir de la description et des références ci-dessous."}
        </p>
      </div>
      <Bloc titre="Critères d’acceptation du contre-test">
        <ul className="liste coches">
          {c.criteres.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </Bloc>
      {c.liens.length > 0 && (
        <Bloc titre="Références">
          <ul className="liste">
            {c.liens.map((l) => (
              <li key={l.url}>
                {l.libelle} : <span className="url">{l.url}</span>
              </li>
            ))}
          </ul>
        </Bloc>
      )}
    </Feuille>
  );
}

function ChapitreSujet({ x, numero, m, numeroDe }: { x: Sujet; numero: number; m: ModeleRapport; numeroDe: Map<string, number> }) {
  const constats = x.refs.map((r) => m.constats.find((c) => c.ref === r)).filter((c): c is Constat => Boolean(c));
  return (
    <Feuille>
      <TitreChapitre numero={numero} titre={x.code ? `${x.titre} (${x.code})` : x.titre} id={`sujet-${x.id}`} />
      <p className="chapo">{x.enjeu}</p>

      <h3>{numero}.1 Résultat</h3>
      <dl className="doc-bilan">
        <div>
          <dt>Vulnérabilités relevées</dt>
          <dd>{constats.length}</dd>
        </div>
        <div>
          <dt>Gravité la plus haute</dt>
          <dd className="petit-dd">{x.pire ? LIBELLE_SEVERITE[x.pire] : "Aucune"}</dd>
        </div>
        <div>
          <dt>{x.controles.total ? "Contrôles conformes" : "État du sujet"}</dt>
          <dd className="petit-dd">{x.controles.total ? `${x.controles.conformes} / ${x.controles.total}` : ETAT_SUJET[x.etat].libelle}</dd>
        </div>
      </dl>

      <h3>{numero}.2 Mesures</h3>
      {x.controles.total > 0 && (
        <table>
          <caption>Contrôles de configuration réalisés sur ce sujet</caption>
          <thead>
            <tr>
              <th scope="col">Indicateur</th>
              <th scope="col" className="num-col">Valeur</th>
              <th scope="col" className="num-col">Part</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Contrôles réalisés</th>
              <td className="num-col">{x.controles.total}</td>
              <td className="num-col">100 %</td>
            </tr>
            <tr>
              <th scope="row">Conformes</th>
              <td className="num-col">{x.controles.conformes}</td>
              <td className="num-col">{Math.round((x.controles.conformes / x.controles.total) * 100)} %</td>
            </tr>
            <tr>
              <th scope="row">Non conformes ou à améliorer</th>
              <td className="num-col">{x.controles.enEchec}</td>
              <td className="num-col">{Math.round((x.controles.enEchec / x.controles.total) * 100)} %</td>
            </tr>
          </tbody>
        </table>
      )}
      {constats.length > 0 ? (
        <table>
          <caption>Vulnérabilités de ce sujet par gravité</caption>
          <thead>
            <tr>
              <th scope="col">Gravité</th>
              <th scope="col" className="num-col">Nombre</th>
              <th scope="col">Priorité</th>
            </tr>
          </thead>
          <tbody>
            {SEVERITES.filter((s) => x.comptes[s]).map((s) => (
              <tr key={s}>
                <th scope="row">
                  <Pastille s={s} />
                </th>
                <td className="num-col">{x.comptes[s]}</td>
                <td>
                  {PRIO[s]}, {DELAI[s]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        !x.controles.total && <p className="muet">Aucune mesure chiffrée disponible pour ce sujet.</p>
      )}

      <h3>{numero}.3 Problèmes relevés</h3>
      {constats.length === 0 ? (
        <div className="doc-probleme">
          <div className="tete">
            <h4>Aucun problème relevé sur ce sujet</h4>
            <span className="doc-pastille ok">Conforme</span>
          </div>
          <p className="muet petit">Les contrôles réalisés sur ce sujet n’ont relevé aucune non-conformité.</p>
        </div>
      ) : (
        constats.map((c) => (
          <div key={c.ref} className="doc-probleme">
            <div className="tete">
              <h4>
                {numeroDe.get(c.ref)}. {c.titre}
              </h4>
              <Pastille s={c.severite} cvss={c.cvss} />
            </div>
            <p className="muet petit">
              {c.cible}
              {c.pointEntree ? ` · ${c.pointEntree}` : ""} · {c.priorite}, correction {DELAI[c.severite]}
            </p>
            {c.description && <p>{court(c.description)}</p>}
            <p>
              <strong>Correctif : </strong>
              {c.remediation ? court(c.remediation, 260) : "à définir avec l’équipe technique."}
            </p>
            <p className="muet petit">Détail, preuve et critères de contre-test : fiche {numeroDe.get(c.ref)}.</p>
          </div>
        ))
      )}

      {x.recommandations.length > 0 && (
        <div className="doc-recos">
          <h4>Nos recommandations</h4>
          <ul>
            {x.recommandations.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          {x.url && <p className="petit source">Source : OWASP Top 10 (2021), {x.url}</p>}
        </div>
      )}
    </Feuille>
  );
}

export default function DocumentRapport({ m, outils, conservation }: { m: ModeleRapport; outils: ReactNode; conservation: number | null }) {
  const pentest = m.methode.pentests.length > 0;
  const scans = m.methode.scans.length > 0;
  const emis = dateFr(m.genereLe);
  const parHorizon = [...new Set(m.plan.map((e) => e.horizon))].map((h) => ({ horizon: h, etapes: m.plan.filter((e) => e.horizon === h) }));
  const numeroDe = new Map(m.constats.map((c, i) => [c.ref, i + 1]));
  const conformes = m.controles.total;

  // Numérotation : 1-4 fixes, un chapitre par sujet, puis les chapitres de clôture.
  const N_SUJET = 5;
  const apres = N_SUJET + m.sujets.length;
  const chap = { fiches: apres, plan: apres + 1, contreTest: apres + 2, conclusion: apres + 3 };
  const sommaire: { n: string; id: string; titre: string; d?: string }[] = [
    { n: "1", id: "introduction", titre: "Introduction et périmètre du test" },
    { n: "2", id: "synthese", titre: "Synthèse des résultats", d: `${m.score.lettre} · ${m.score.valeur}/100` },
    { n: "3", id: "engagement", titre: "Règles d’engagement et conditions d’exécution" },
    { n: "4", id: "methodologie", titre: "Méthodologie et notation" },
    ...m.sujets.map((x, i) => ({
      n: String(N_SUJET + i),
      id: `sujet-${x.id}`,
      titre: x.code ? `${x.titre} (${x.code.slice(0, 3)})` : x.titre,
      d: x.refs.length ? `${x.refs.length} vulnérabilité(s)` : x.controles.total ? "conforme" : "",
    })),
    { n: String(chap.fiches), id: "fiches", titre: "Fiches détaillées des vulnérabilités", d: `${m.constats.length} fiche(s)` },
    { n: String(chap.plan), id: "plan", titre: "Plan d’action" },
    { n: String(chap.contreTest), id: "contre-test", titre: "Contre-test et critères d’acceptation" },
    { n: String(chap.conclusion), id: "conclusion", titre: "Conclusion" },
    { n: "A", id: "annexe-controles", titre: "Annexe A : inventaire des contrôles réalisés", d: m.inventaire.length ? `${m.inventaire.length} contrôle(s)` : "" },
    { n: "B", id: "annexe-methode", titre: "Annexe B : notation, CVSS v3.1 et lexique" },
    { n: "C", id: "mentions", titre: "Annexe C : mentions légales et conditions d’utilisation" },
  ];

  return (
    <>
      <ThemeClairForce />
      <div className="doc-outils no-print">{outils}</div>
      <article className="doc" lang="fr">
        {/* ---------- Couverture ---------- */}
        <div className="doc-couverture">
          <div className="marque">
            <img src="/logo-mark.png" alt="" width={34} height={34} />
            <span>KAYZEN · SENTINEL</span>
          </div>
          <p className="surtitre">Test d’intrusion</p>
          <h1>{m.titre}</h1>
          <p className="site">{m.perimetre.join(", ") || "—"}</p>
          <div className="trait" aria-hidden="true" />
          <dl className="grille">
            <div>
              <dt>Référence</dt>
              <dd>{m.document.reference}</dd>
            </div>
            <div>
              <dt>Date d’émission</dt>
              <dd>{emis}</dd>
            </div>
            <div>
              <dt>Client</dt>
              <dd>{m.document.client || "Titulaire du compte"}</dd>
            </div>
            <div>
              <dt>Période de test</dt>
              <dd>{m.periode ? `${dateFr(m.periode.debut)} → ${dateFr(m.periode.fin)}` : "Non renseignée"}</dd>
            </div>
            <div>
              <dt>Méthodologie</dt>
              <dd>OWASP · CWE{pentest ? " · CVSS v3.1" : ""}</dd>
            </div>
            <div>
              <dt>Vulnérabilités</dt>
              <dd>
                {m.constats.length} dont {m.comptes.critical} critique(s), {m.comptes.high} élevée(s)
              </dd>
            </div>
            <div>
              <dt>Classification</dt>
              <dd>{m.document.classification}</dd>
            </div>
            <div>
              <dt>Version</dt>
              <dd>{m.document.version}</dd>
            </div>
          </dl>
          <div className="bas">
            <p className="emetteur">
              <strong>{COMPANY.name}</strong> — {COMPANY.product}, tests d’intrusion
              <br />
              {COMPANY.address}
              <br />
              {COMPANY.phone} · {COMPANY.email}
              <br />
              {COMPANY.site.replace(/^https?:\/\//, "")}
            </p>
            <p className="score">
              <span className="valeur">{m.score.lettre}</span>
              <span className="sur">{m.score.valeur}/100</span>
              <span className="lib">Note de sécurité</span>
            </p>
          </div>
        </div>

        {/* ---------- Fiche de contrôle ---------- */}
        <Feuille>
          <div className="doc-chapitre">
            <h2 id="controle">Fiche de contrôle du document</h2>
          </div>
          <dl className="fiche">
            <dt>Titre</dt>
            <dd>{m.titre}</dd>
            <dt>Référence</dt>
            <dd>{m.document.reference}</dd>
            <dt>Version</dt>
            <dd>{m.document.version}</dd>
            <dt>Classification</dt>
            <dd>{m.document.classification}</dd>
            <dt>Client</dt>
            <dd>{m.document.client || "Titulaire du compte Sentinel (aucune autorisation écrite nominative rattachée)"}</dd>
            <dt>Émetteur</dt>
            <dd>
              {COMPANY.legalName} ({COMPANY.name}), {COMPANY.product}
            </dd>
            <dt>Date d’émission</dt>
            <dd>{emis}</dd>
            <dt>Période de test</dt>
            <dd>{m.periode ? `Du ${dateFr(m.periode.debut)} au ${dateFr(m.periode.fin)}` : "Non renseignée"}</dd>
            <dt>Périmètre</dt>
            <dd>{m.perimetre.join(", ") || "—"}</dd>
          </dl>
          <table>
            <caption>Historique des révisions</caption>
            <thead>
              <tr>
                <th scope="col">Version</th>
                <th scope="col">Date</th>
                <th scope="col">Auteur</th>
                <th scope="col">Objet</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{m.document.version}</td>
                <td>{emis}</td>
                <td>{COMPANY.product}</td>
                <td>Émission initiale, à partir des tests enregistrés</td>
              </tr>
            </tbody>
          </table>
          <table>
            <caption>Liste de diffusion</caption>
            <thead>
              <tr>
                <th scope="col">Destinataire</th>
                <th scope="col">Rôle</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{m.document.client || "Client"}</td>
                <td>Responsable de la sécurité et équipes chargées de la correction, désignés par le client</td>
              </tr>
              <tr>
                <td>{COMPANY.name}</td>
                <td>Émetteur du rapport</td>
              </tr>
            </tbody>
          </table>
          <p className="doc-note">
            Ce document décrit des moyens d’attaquer les systèmes du client. Toute diffusion hors de la liste ci-dessus
            doit être autorisée par le client. Les secrets découverts pendant les tests sont masqués.
          </p>
        </Feuille>

        {/* ---------- Sommaire ---------- */}
        <Feuille>
          <div className="doc-chapitre">
            <h2 id="sommaire">Sommaire</h2>
          </div>
          <ol className="doc-sommaire">
            {sommaire.map((s) => (
              <li key={s.id}>
                <span className="n" aria-hidden="true">{s.n}</span>
                <a href={`#${s.id}`}>{s.titre}</a>
                {s.d && <span className="d">{s.d}</span>}
              </li>
            ))}
          </ol>
          <p className="doc-note espace">
            Document confidentiel, destiné au seul client. Chaque chiffre de ce rapport provient d’un scan ou d’un test
            d’intrusion enregistré dans Sentinel, daté et rattaché au compte du client ; ce qui n’a pas pu être testé est
            signalé comme tel. Les descriptions des vulnérabilités exploitées sont rédigées par le moteur d’IA Strix ;
            les chiffres, la notation, les synthèses et le plan d’action sont calculés à partir des résultats.
          </p>
        </Feuille>

        {/* ---------- 1. Introduction ---------- */}
        <Feuille>
          <TitreChapitre numero={1} titre="Introduction et périmètre du test" id="introduction" />
          <h3>1.1 Objectif de ce rapport</h3>
          <p>
            Ce document présente les résultats du test d’intrusion de <strong>{m.perimetre.join(", ") || "la cible"}</strong>.
            Il dresse l’état de sécurité de la cible telle qu’un attaquant la voit depuis Internet, explique chaque
            vulnérabilité en langage clair, en apporte la preuve quand elle a été exploitée, et propose pour chacune un
            correctif et des critères de vérification.
          </p>
          <p>
            Le test a retenu <strong>{m.constats.length} vulnérabilité(s)</strong>
            {conformes ? (
              <>
                {" "}et vérifié <strong>{conformes} contrôle(s) de configuration</strong>, dont {m.controles.conformes} conformes
              </>
            ) : null}
            .
          </p>
          <h3>1.2 Paramètres du test</h3>
          <dl className="fiche">
            <dt>Cibles</dt>
            <dd>{m.perimetre.join(", ") || "—"}</dd>
            <dt>Période</dt>
            <dd>{m.periode ? `Du ${dateFr(m.periode.debut)} au ${dateFr(m.periode.fin)}` : "Non renseignée"}</dd>
            <dt>Tests d’intrusion</dt>
            <dd>{m.methode.pentests.length ? `${m.methode.pentests.length} (exploitation contrôlée, moteur Strix)` : "Aucun"}</dd>
            <dt>Analyses de configuration</dt>
            <dd>
              {m.methode.scans.length
                ? `${m.methode.scans.length} (${m.methode.scans.filter((s) => s.approfondi).length} approfondie(s))`
                : "Aucune"}
            </dd>
            <dt>Autorisation écrite</dt>
            <dd>
              {m.engagement.autorisations.length
                ? m.engagement.autorisations.map((a) => `${a.client}, du ${dateFr(a.debut)} au ${dateFr(a.fin)}`).join(" ; ")
                : "Aucune rattachée à la date d’émission (voir chapitre 3)"}
            </dd>
            <dt>Point de départ</dt>
            <dd>Internet, sans accès privilégié au réseau du client</dd>
            <dt>Référentiels</dt>
            <dd>OWASP Top 10 (2021), CWE{pentest ? ", CVSS v3.1" : ""}</dd>
          </dl>
          <h3>1.3 Comment lire ce rapport</h3>
          <p>
            Chaque sujet a son chapitre, sur le même plan : pourquoi il compte, le résultat chiffré, les mesures
            détaillées, les problèmes relevés et nos recommandations. Chaque vulnérabilité a ensuite sa fiche complète
            (preuve, remédiation, critères de contre-test). Cinq niveaux de gravité sont utilisés :
          </p>
          <ul className="liste legende">
            {SEVERITES.map((s) => (
              <li key={s}>
                <Pastille s={s} /> : priorité {PRIO[s]}, correction {DELAI[s]}.
              </li>
            ))}
          </ul>
        </Feuille>

        {/* ---------- 2. Synthèse ---------- */}
        <Feuille>
          <TitreChapitre numero={2} titre="Synthèse des résultats" id="synthese" />
          {m.synthese.map((p, i) => (
            <p key={p} className={i === 0 ? "chapo" : undefined}>
              {p}
            </p>
          ))}
          <dl className="doc-bilan quatre">
            <div>
              <dt>Note de sécurité</dt>
              <dd>
                {m.score.lettre} <span className="sur">{m.score.valeur}/100</span>
              </dd>
            </div>
            <div>
              <dt>Vulnérabilités</dt>
              <dd>{m.constats.length}</dd>
            </div>
            <div>
              <dt>Critiques et élevées</dt>
              <dd>{m.comptes.critical + m.comptes.high}</dd>
            </div>
            <div>
              <dt>Contrôles conformes</dt>
              <dd>{conformes ? `${m.controles.conformes}/${conformes}` : "—"}</dd>
            </div>
          </dl>
          <p className="petit muet">
            La note part de 100 et retire des points pour chaque vulnérabilité ouverte selon sa gravité ; une vulnérabilité
            critique plafonne la note à D, une élevée à C. Détail en annexe B.
          </p>
          <div className={`doc-risque ${m.risque.niveau}`}>
            <strong>Risque global : {m.risque.libelle}</strong>
            {m.risque.explication}
          </div>

          <h3>2.1 Résultat par sujet</h3>
          <table>
            <caption>État de chaque sujet testé</caption>
            <thead>
              <tr>
                <th scope="col">Sujet</th>
                <th scope="col" className="num-col">Vulnérabilités</th>
                <th scope="col" className="num-col">Contrôles conformes</th>
                <th scope="col">Gravité max.</th>
                <th scope="col">État</th>
              </tr>
            </thead>
            <tbody>
              {m.sujets.map((x) => (
                <tr key={x.id}>
                  <th scope="row">
                    <a href={`#sujet-${x.id}`}>{x.titre}</a>
                  </th>
                  <td className="num-col">{x.refs.length}</td>
                  <td className="num-col">{x.controles.total ? `${x.controles.conformes}/${x.controles.total}` : "—"}</td>
                  <td>{x.pire ? <Pastille s={x.pire} /> : "—"}</td>
                  <td>
                    <EtatSujet e={x.etat} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Barres
            etiquette={`Vulnérabilités par gravité : ${SEVERITES.map((s) => `${LIBELLE_SEVERITE[s]} ${m.comptes[s]}`).join(", ")}.`}
            lignes={SEVERITES.map((s) => ({ lib: LIBELLE_SEVERITE[s], val: m.comptes[s], texte: String(m.comptes[s]), alerte: s === "critical" || s === "high" }))}
          />

          <h3>2.2 Les priorités</h3>
          {m.plan.length ? (
            <ol className="liste">
              {m.plan.slice(0, 5).map((e) => (
                <li key={e.ref}>
                  <strong>{e.titre}</strong> — {LIBELLE_SEVERITE[e.severite].toLowerCase()}, {PRIO[e.severite]}, correction{" "}
                  {DELAI[e.severite]} (fiche {numeroDe.get(e.ref)}).
                </li>
              ))}
            </ol>
          ) : (
            <p>Aucune correction n’est requise par les constats de ce rapport.</p>
          )}
        </Feuille>

        {/* ---------- 3. Engagement ---------- */}
        <Feuille>
          <TitreChapitre numero={3} titre="Règles d’engagement et conditions d’exécution" id="engagement" />
          <h3>3.1 Cibles et tests réalisés</h3>
          <table>
            <caption>Tests inclus dans ce rapport</caption>
            <thead>
              <tr>
                <th scope="col">Cible</th>
                <th scope="col">Nature du test</th>
                <th scope="col">Identifiant</th>
                <th scope="col">Date</th>
              </tr>
            </thead>
            <tbody>
              {m.methode.pentests.map((p) => (
                <tr key={p.id}>
                  <th scope="row">{p.cible}</th>
                  <td>Test d’intrusion autonome (mode {p.mode})</td>
                  <td className="petit"><code>{p.id.slice(0, 8)}</code></td>
                  <td>
                    {p.debut ? dateFr(p.debut) : "—"}
                    {p.fin && p.debut && dateFr(p.fin) !== dateFr(p.debut) ? ` → ${dateFr(p.fin)}` : ""}
                  </td>
                </tr>
              ))}
              {m.methode.scans.map((s) => (
                <tr key={s.id}>
                  <th scope="row">{s.cible}</th>
                  <td>
                    Analyse de configuration {s.approfondi ? "approfondie" : "passive"}
                    {s.score !== null ? ` (score ${s.score}/100)` : ""}
                  </td>
                  <td className="petit"><code>{s.id.slice(0, 8)}</code></td>
                  <td>{dateFr(s.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3>3.2 Autorisation écrite du client</h3>
          {m.engagement.autorisations.length ? (
            <table>
              <caption>Autorisations écrites couvrant les cibles</caption>
              <thead>
                <tr>
                  <th scope="col">Client signataire</th>
                  <th scope="col">Périmètre autorisé</th>
                  <th scope="col">Validité</th>
                  <th scope="col">Document (empreinte SHA-256)</th>
                </tr>
              </thead>
              <tbody>
                {m.engagement.autorisations.map((a) => (
                  <tr key={a.empreinte}>
                    <th scope="row">{a.client}</th>
                    <td className="url">{a.perimetre.join(", ")}</td>
                    <td>
                      Du {dateFr(a.debut)} au {dateFr(a.fin)}
                    </td>
                    <td className="petit url">
                      {a.document}
                      <br />
                      <code>{a.empreinte.slice(0, 16)}…</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="doc-note">
              Aucune autorisation écrite en cours n’est rattachée à ces cibles dans Sentinel à la date d’émission
              {pentest ? " (elle a pu être révoquée ou expirer après les tests)" : ""}.
            </p>
          )}
          <h3>3.3 Règles appliquées</h3>
          <ul className="liste">
            <li>Tests menés uniquement sur des domaines dont la propriété a été vérifiée{pentest ? ", couverts par une autorisation écrite valide à la date du test" : ""}.</li>
            <li>Aucune attaque par déni de service ni test de charge.</li>
            {pentest && <li>Exploitation limitée à la preuve de concept : aucune donnée n’est modifiée ou extraite au-delà de ce qui démontre la vulnérabilité.</li>}
            {pentest && <li>Preuves d’exploitation chiffrées au repos ; secrets découverts masqués dans le rapport et ses exports.</li>}
            <li>Requêtes sortantes de Sentinel limitées aux adresses publiques.</li>
          </ul>
          <h3>3.4 Exclusions et limites</h3>
          <ul className="liste">
            {m.methode.nonTeste.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <p className="doc-note">
            Un test d’intrusion donne une image à un instant donné : l’absence de constat ne prouve pas l’absence de
            vulnérabilité.
            {pentest &&
              " Les tests d’intrusion sont menés par des agents d’intelligence artificielle (moteur Strix) ; leurs constats sont relus par un second passage automatique, pas par un auditeur humain, sauf mention contraire."}
          </p>
        </Feuille>

        {/* ---------- 4. Méthodologie ---------- */}
        <Feuille>
          <TitreChapitre numero={4} titre="Méthodologie et notation" id="methodologie" />
          <h3>4.1 Déroulement</h3>
          <table>
            <caption>Phases du test</caption>
            <thead>
              <tr>
                <th scope="col">Phase</th>
                <th scope="col">Ce qui est fait</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">1. Reconnaissance</th>
                <td>Identification des services exposés, des technologies et de la surface d’attaque de chaque cible.</td>
              </tr>
              {scans && (
                <tr>
                  <th scope="row">2. Analyse de configuration</th>
                  <td>Contrôles automatisés : en-têtes de sécurité, TLS, transport, cookies, DNS, e-mail, fichiers exposés, scripts tiers.</td>
                </tr>
              )}
              {pentest && (
                <>
                  <tr>
                    <th scope="row">{scans ? "3" : "2"}. Exploitation contrôlée</th>
                    <td>Agents d’IA du moteur Strix : recherche active de vulnérabilités et preuve de concept pour chacune.</td>
                  </tr>
                  <tr>
                    <th scope="row">{scans ? "4" : "3"}. Relecture contradictoire</th>
                    <td>Second passage automatique qui confirme, met en doute ou rejette chaque constat et peut recalibrer sa gravité.</td>
                  </tr>
                </>
              )}
              <tr>
                <th scope="row">Rapport</th>
                <td>Notation, classification OWASP, plan d’action et critères de contre-test calculés à partir des seuls résultats enregistrés.</td>
              </tr>
            </tbody>
          </table>
          <h3>4.2 Échelle de gravité</h3>
          <table>
            <caption>Gravité, score CVSS v3.1, priorité et délai de correction recommandé</caption>
            <thead>
              <tr>
                <th scope="col">Gravité</th>
                <th scope="col">Score CVSS</th>
                <th scope="col">Priorité</th>
                <th scope="col">Délai recommandé</th>
              </tr>
            </thead>
            <tbody>
              {ECHELLE_CVSS.map((e, i) => (
                <tr key={e.gravite}>
                  <th scope="row">
                    <Pastille s={SEVERITES[i]} />
                  </th>
                  <td className="num-col">{e.plage}</td>
                  <td>{PRIO[SEVERITES[i]]}</td>
                  <td>{DELAI[SEVERITES[i]]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="petit muet">
            Les constats de configuration n’ont pas de score CVSS : leur gravité est fixée par le scanner selon
            l’exposition et l’impact potentiel.
          </p>
          <h3>4.3 Note de sécurité</h3>
          <table>
            <caption>Échelle de la note de sécurité</caption>
            <thead>
              <tr>
                <th scope="col">Note</th>
                <th scope="col">Score</th>
                <th scope="col">Signification</th>
              </tr>
            </thead>
            <tbody>
              {ECHELLE_NOTE.map((e, i) => (
                <tr key={e.lettre} className={e.lettre === m.score.lettre ? "actif" : undefined}>
                  <th scope="row">{e.lettre}{e.lettre === m.score.lettre ? " (ce rapport)" : ""}</th>
                  <td className="num-col">
                    {e.min} – {i === 0 ? 100 : ECHELLE_NOTE[i - 1].min - 1}
                  </td>
                  <td>{e.sens}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Feuille>

        {/* ---------- Chapitres par sujet ---------- */}
        {m.sujets.map((x, i) => (
          <ChapitreSujet key={x.id} x={x} numero={N_SUJET + i} m={m} numeroDe={numeroDe} />
        ))}

        {/* ---------- Fiches ---------- */}
        <Feuille>
          <TitreChapitre numero={chap.fiches} titre="Fiches détaillées des vulnérabilités" id="fiches" />
          <p className="chapo">
            Une fiche par vulnérabilité, de la plus grave à la moins grave : classification, description, impact, preuve
            d’exploitation quand elle existe, remédiation, critères de contre-test et références.
          </p>
          {m.constats.length === 0 ? (
            <p>Aucune fiche : aucune vulnérabilité ouverte.</p>
          ) : (
            <table>
              <caption>Index des fiches</caption>
              <thead>
                <tr>
                  <th scope="col" className="num-col">Fiche</th>
                  <th scope="col">Vulnérabilité</th>
                  <th scope="col">Gravité</th>
                  <th scope="col" className="num-col">CVSS</th>
                  <th scope="col">Priorité</th>
                </tr>
              </thead>
              <tbody>
                {m.constats.map((c, i) => (
                  <tr key={c.ref}>
                    <td className="num-col">{i + 1}</td>
                    <th scope="row">
                      <a href={`#v-${i + 1}`}>{c.titre}</a>
                    </th>
                    <td>
                      <Pastille s={c.severite} />
                    </td>
                    <td className="num-col">{c.cvss !== null ? c.cvss.toFixed(1) : "—"}</td>
                    <td>{c.priorite}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Feuille>
        {m.constats.map((c, i) => (
          <FicheVulnerabilite key={c.ref} c={c} numero={i + 1} />
        ))}

        {/* ---------- Plan d'action ---------- */}
        <Feuille>
          <TitreChapitre numero={chap.plan} titre="Plan d’action" id="plan" />
          <p className="chapo">
            Ordre : gravité décroissante, puis effort croissant (corrections rapides d’abord). Les colonnes « Responsable »
            et « Corrigé le » sont à compléter par vos équipes pour suivre l’avancement.
          </p>
          {m.plan.length === 0 ? (
            <p>Aucune action requise par les constats de ce rapport.</p>
          ) : (
            parHorizon.map((h) => (
              <table key={h.horizon}>
                <caption>
                  {h.horizon} — {h.etapes[0].echeance.toLowerCase()}
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="num-col">#</th>
                    <th scope="col">Action</th>
                    <th scope="col">Priorité</th>
                    <th scope="col">Effort</th>
                    <th scope="col">Responsable</th>
                    <th scope="col">Corrigé le</th>
                  </tr>
                </thead>
                <tbody>
                  {h.etapes.map((e) => (
                    <tr key={e.ref}>
                      <td className="num-col">{e.rang}</td>
                      <th scope="row">
                        Corriger « {e.titre} » (fiche {numeroDe.get(e.ref)})
                      </th>
                      <td>{PRIO[e.severite]}</td>
                      <td className="petit">{e.effort ? LIBELLE_EFFORT[e.effort] : "Non estimé"}</td>
                      <td className="a-remplir" />
                      <td className="a-remplir" />
                    </tr>
                  ))}
                </tbody>
              </table>
            ))
          )}
          <h3>Mesures transverses</h3>
          <ul className="liste">
            <li>Intégrer un contrôle de sécurité automatique à chaque déploiement (chaîne CI/CD) pour empêcher les régressions.</li>
            <li>Surveiller en continu la surface exposée (en-têtes, certificats, sous-domaines) et alerter sur tout changement.</li>
            <li>Renouveler le test d’intrusion après chaque évolution majeure, et au moins une fois par an.</li>
          </ul>
        </Feuille>

        {/* ---------- Contre-test ---------- */}
        <Feuille>
          <TitreChapitre numero={chap.contreTest} titre="Contre-test et critères d’acceptation" id="contre-test" />
          <p className="chapo">
            Une correction n’est acquise qu’une fois vérifiée. Après déploiement, relancez un test sur le même
            périmètre : chaque vulnérabilité est close quand tous ses critères sont remplis.
          </p>
          {m.constats.length === 0 ? (
            <p>Aucun critère : aucune vulnérabilité ouverte.</p>
          ) : (
            <table>
              <caption>Critères d’acceptation par vulnérabilité</caption>
              <thead>
                <tr>
                  <th scope="col" className="num-col">Fiche</th>
                  <th scope="col">Vulnérabilité</th>
                  <th scope="col">Critères à vérifier</th>
                  <th scope="col">Validé</th>
                </tr>
              </thead>
              <tbody>
                {m.constats.map((c, i) => (
                  <tr key={c.ref}>
                    <td className="num-col">{i + 1}</td>
                    <th scope="row">{c.titre}</th>
                    <td className="petit">
                      <ul className="liste serree">
                        {c.criteres.map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="a-remplir" />
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Feuille>

        {/* ---------- Conclusion ---------- */}
        <Feuille>
          <TitreChapitre numero={chap.conclusion} titre="Conclusion" id="conclusion" />
          {m.conclusion.map((p) => (
            <p key={p}>{p}</p>
          ))}
          <div className="doc-recos">
            <h4>Prochaines étapes</h4>
            <ol>
              {m.plan.some((e) => e.severite === "critical" || e.severite === "high") && <li>Corriger les vulnérabilités P1 et P2 dans les délais indiqués.</li>}
              {m.plan.length > 0 && <li>Planifier les corrections P3 et P4 dans les prochains cycles de développement.</li>}
              <li>Commander un contre-test sur le même périmètre une fois les corrections déployées.</li>
              <li>Activer la surveillance continue de la surface exposée dans Sentinel.</li>
            </ol>
          </div>
        </Feuille>

        {/* ---------- Annexe A ---------- */}
        <Feuille>
          <TitreChapitre numero="A" titre="Inventaire des contrôles réalisés" id="annexe-controles" />
          {m.inventaire.length === 0 ? (
            <p>Aucune analyse de configuration dans ce rapport : seuls les constats d’exploitation figurent aux chapitres précédents.</p>
          ) : (
            <>
              <p className="chapo">Liste exhaustive des {m.inventaire.length} contrôles de configuration, regroupés par sujet.</p>
              <table className="serre">
                <caption>Contrôles de configuration et leur résultat</caption>
                <thead>
                  <tr>
                    <th scope="col">Sujet</th>
                    <th scope="col">Contrôle</th>
                    <th scope="col">Résultat</th>
                    <th scope="col">Gravité</th>
                    <th scope="col">Cible</th>
                  </tr>
                </thead>
                <tbody>
                  {m.inventaire.map((x, i) => (
                    <tr key={`${x.cible}-${x.categorie}-${x.titre}-${i}`}>
                      <td className="petit">{x.categorie}</td>
                      <th scope="row">{x.titre}</th>
                      <td>
                        <span className={`doc-pastille ${x.etat === "Conforme" ? "ok" : x.etat === "Information" ? "info" : "medium"}`}>{x.etat}</span>
                      </td>
                      <td className="petit">{x.etat === "Conforme" ? "—" : LIBELLE_SEVERITE[x.severite]}</td>
                      <td className="petit url">{x.cible}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Feuille>

        {/* ---------- Annexe B ---------- */}
        <Feuille>
          <TitreChapitre numero="B" titre="Notation, CVSS v3.1 et lexique" id="annexe-methode" />
          <h3>B.1 Calcul de la note de sécurité</h3>
          <p>
            La note part de 100. Chaque vulnérabilité ouverte retire des points selon sa gravité ; le score ne descend pas
            sous 0. Une vulnérabilité critique ouverte plafonne la note à D, une vulnérabilité élevée à C, quel que soit
            le nombre de points restants.
          </p>
          <table>
            <caption>Points retirés par vulnérabilité ouverte</caption>
            <thead>
              <tr>
                <th scope="col">Gravité</th>
                <th scope="col" className="num-col">Points retirés</th>
                <th scope="col" className="num-col">Dans ce rapport</th>
              </tr>
            </thead>
            <tbody>
              {SEVERITES.map((s) => (
                <tr key={s}>
                  <th scope="row">
                    <Pastille s={s} />
                  </th>
                  <td className="num-col">{PENALITE[s]}</td>
                  <td className="num-col">{m.comptes[s] * PENALITE[s]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3>B.2 Métriques CVSS v3.1</h3>
          <table>
            <caption>Métriques de base CVSS v3.1 (FIRST)</caption>
            <thead>
              <tr>
                <th scope="col">Métrique</th>
                <th scope="col">Abrév.</th>
                <th scope="col">Valeurs possibles</th>
                <th scope="col">Signification</th>
              </tr>
            </thead>
            <tbody>
              {METRIQUES_CVSS.map((x) => (
                <tr key={x.abrev}>
                  <th scope="row">{x.libelle}</th>
                  <td><code>{x.abrev}</code></td>
                  <td className="petit">
                    {Object.entries(x.valeurs)
                      .map(([k, v]) => `${k} = ${v}`)
                      .join(", ")}
                  </td>
                  <td className="petit">{x.aide}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3>B.3 Lexique</h3>
          <dl className="fiche glossaire">
            {GLOSSAIRE.map((g) => (
              <div key={g.terme} className="entree">
                <dt>{g.terme}</dt>
                <dd>{g.definition}</dd>
              </div>
            ))}
          </dl>
        </Feuille>

        {/* ---------- Annexe C ---------- */}
        <Feuille>
          <TitreChapitre numero="C" titre="Mentions légales et conditions d’utilisation" id="mentions" />
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
            n’est jamais seule porteuse d’information), graphiques doublés de leurs valeurs, contrastes de niveau AA. En
            cas de difficulté de lecture, écrivez à {COMPANY.email} : une version adaptée vous sera fournie.
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
