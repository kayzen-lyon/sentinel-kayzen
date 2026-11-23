import { test } from "node:test";
import assert from "node:assert/strict";
import { ancre, CONFIANCE, DESCRIPTION_ACCUEIL, EN_BREF, H1_ACCUEIL, sommaire, TITRE_ACCUEIL } from "../lib/accueil";
import { FAQ } from "../lib/faq";

const MOT_CLE = /pentest|test d[’']intrusion/i;

test("title : mot-clé, 60 caractères au plus", () => {
  assert.match(TITRE_ACCUEIL, MOT_CLE);
  assert.ok(TITRE_ACCUEIL.length <= 60, `${TITRE_ACCUEIL.length} caractères`);
});

test("meta description : mot-clé, 120 à 160 caractères", () => {
  assert.match(DESCRIPTION_ACCUEIL, MOT_CLE);
  assert.ok(DESCRIPTION_ACCUEIL.length >= 120 && DESCRIPTION_ACCUEIL.length <= 160, `${DESCRIPTION_ACCUEIL.length} caractères`);
});

test("H1 : mot-clé", () => {
  assert.match(`${H1_ACCUEIL.debut} ${H1_ACCUEIL.fin}`, MOT_CLE);
});

test("FAQ : chaque réponse s'ouvre sur une définition", () => {
  // Première phrase de la forme « X est / désigne / sont … ».
  for (const { q, a } of FAQ) {
    const premiere = a.split(/(?<=\.)\s/)[0];
    assert.match(premiere, /\b(est|sont|désigne)\b/, `Réponse sans définition en tête : ${q}`);
  }
  assert.ok(FAQ.some((f) => MOT_CLE.test(f.q)));
});

test("Signaux de confiance et « En bref » : aucun superlatif invérifiable", () => {
  const tout = [...CONFIANCE.map((c) => `${c.valeur} ${c.libelle}`), ...EN_BREF].join(" ");
  assert.doesNotMatch(tout, /0 faux positif|24\/7|garanti|100 ?%|n°1|leader/i);
  assert.match(EN_BREF.join(" "), /Tarek BELHADJ/);
});

test("ancre et sommaire : ancres lisibles et uniques, titres vides ignorés", () => {
  assert.equal(ancre("Un tarif pour chaque maturité sécurité"), "un-tarif-pour-chaque-maturite-securite");
  assert.equal(ancre("L’essentiel"), "l-essentiel");
  assert.deepEqual(
    sommaire([
      { id: null, texte: "Les offres" },
      { id: "faq", texte: "Questions" },
      { id: null, texte: "Les  offres" },
      { id: null, texte: "   " },
    ]),
    [
      { id: "les-offres", texte: "Les offres" },
      { id: "faq", texte: "Questions" },
      { id: "les-offres-2", texte: "Les offres" },
    ]
  );
});
