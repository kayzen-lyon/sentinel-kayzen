import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ajouterAuJournal,
  aNotifier,
  comparer,
  construireInstantane,
  JOURNAL_MAX,
  type Changement,
  type Instantane,
} from "../lib/surveillance";

const D1 = "2026-11-01T06:00:00.000Z";
const D2 = "2026-11-02T06:00:00.000Z";

function snap(p: Partial<Instantane> = {}): Instantane {
  return {
    date: D2,
    score: 80,
    enTetes: {
      "content-security-policy": "default-src 'self'",
      "strict-transport-security": "max-age=31536000; includeSubDomains",
    },
    certificat: { emetteur: "R11", joursRestants: 60 },
    tls: { TLSv1: false, "TLSv1.1": false, "TLSv1.2": true, "TLSv1.3": true },
    domaine: { joursRestants: 300 },
    sousDomaines: ["api.site.fr", "www.site.fr"],
    routes: ["/api/login"],
    problemes: [],
    absents: {},
    ...p,
  };
}

test("comparer : aucun changement", () => {
  assert.deepEqual(comparer(snap({ date: D1 }), snap()), []);
});

test("comparer : en-tête CSP retiré = important, phrase française", () => {
  const apres = snap({ enTetes: { "strict-transport-security": "max-age=31536000; includeSubDomains" } });
  const c = comparer(snap({ date: D1 }), apres);
  assert.equal(c.length, 1);
  assert.deepEqual(c[0], {
    date: D2,
    gravite: "important",
    categorie: "en-tetes",
    message: "L'en-tête Content-Security-Policy a été retiré",
  });
});

test("comparer : en-tête mineur retiré = info, CSP affaiblie = important", () => {
  const avant = snap({ date: D1, enTetes: { ...snap().enTetes, "x-frame-options": "DENY" } });
  const apres = snap({
    enTetes: { ...snap().enTetes, "content-security-policy": "default-src 'self' 'unsafe-inline'" },
  });
  const c = comparer(avant, apres);
  assert.equal(c.length, 2);
  assert.equal(c[0].gravite, "important");
  assert.match(c[0].message, /Content-Security-Policy a été affaiblie : 'unsafe-inline'/);
  assert.deepEqual(c[1], { date: D2, gravite: "info", categorie: "en-tetes", message: "L'en-tête X-Frame-Options a été retiré" });
});

test("comparer : HSTS raccourci sous six mois = important", () => {
  const apres = snap({ enTetes: { ...snap().enTetes, "strict-transport-security": "max-age=300" } });
  const c = comparer(snap({ date: D1 }), apres);
  assert.equal(c.length, 1);
  assert.equal(c[0].gravite, "important");
  assert.match(c[0].message, /réduite : 31536000 → 300 secondes/);
});

test("comparer : certificat proche de l'expiration (paliers 30 j et 7 j, sans répétition)", () => {
  const c30 = comparer(snap({ date: D1 }), snap({ certificat: { emetteur: "R11", joursRestants: 25 } }));
  assert.deepEqual(c30, [{ date: D2, gravite: "important", categorie: "certificat", message: "Le certificat expire dans 25 jours" }]);

  const c7 = comparer(
    snap({ date: D1, certificat: { emetteur: "R11", joursRestants: 25 } }),
    snap({ certificat: { emetteur: "R11", joursRestants: 6 } })
  );
  assert.deepEqual(c7, [{ date: D2, gravite: "critique", categorie: "certificat", message: "Le certificat expire dans 6 jours" }]);

  // Déjà dans le palier critique : pas de nouvelle alerte à chaque passage.
  const encore = comparer(
    snap({ date: D1, certificat: { emetteur: "R11", joursRestants: 6 } }),
    snap({ certificat: { emetteur: "R11", joursRestants: 5 } })
  );
  assert.deepEqual(encore, []);
});

test("comparer : nouveau sous-domaine exposé", () => {
  const c = comparer(snap({ date: D1 }), snap({ sousDomaines: ["api.site.fr", "staging.site.fr", "www.site.fr"] }));
  assert.deepEqual(c, [
    { date: D2, gravite: "important", categorie: "sous-domaines", message: "Nouveau sous-domaine exposé : staging.site.fr" },
  ]);
});

test("comparer : protocole obsolète de nouveau accepté, nouveau problème critique", () => {
  const apres = snap({
    tls: { TLSv1: true, "TLSv1.1": false, "TLSv1.2": true, "TLSv1.3": true },
    problemes: [{ id: "env", title: "Fichier .env exposé", severity: "critical", state: "fail" }],
  });
  const c = comparer(snap({ date: D1 }), apres);
  assert.deepEqual(
    c.map((x) => [x.gravite, x.message]),
    [
      ["critique", "Nouveau problème critique : Fichier .env exposé"],
      ["important", "Le protocole obsolète TLS 1.0 est de nouveau accepté"],
    ]
  );
});

test("comparer : données absentes avant ou après = jamais comparées", () => {
  const vide = snap({
    enTetes: undefined,
    certificat: undefined,
    tls: undefined,
    domaine: undefined,
    sousDomaines: undefined,
    routes: undefined,
    absents: { enTetes: "x", certificat: "x", tls: "x", domaine: "x", sousDomaines: "x", routes: "x" },
  });
  assert.deepEqual(comparer(snap({ date: D1 }), vide), []);
  assert.deepEqual(comparer({ ...vide, date: D1 }, snap()), []);
  // Aucun instantané précédent : seules les échéances proches sont signalées.
  assert.deepEqual(comparer(null, snap()), []);
  const proche = comparer(null, snap({ certificat: { joursRestants: 3 }, domaine: { joursRestants: 20 } }));
  assert.deepEqual(
    proche.map((x) => [x.gravite, x.categorie]),
    [
      ["critique", "certificat"],
      ["important", "domaine"],
    ]
  );
});

test("comparer : baisse de score ≥ 10 points", () => {
  const c = comparer(snap({ date: D1, score: 85 }), snap({ score: 70 }));
  assert.deepEqual(c, [{ date: D2, gravite: "important", categorie: "score", message: "Le score de sécurité a baissé : 85 → 70/100" }]);
  assert.deepEqual(comparer(snap({ date: D1, score: 85 }), snap({ score: 80 })), []);
});

test("construireInstantane : seulement ce qui est mesuré, avec la raison des absences", () => {
  const result = {
    score: 72,
    summary: { https: false, finalUrl: "http://site.fr/" },
    findings: [
      { id: "a", title: "A", severity: "high", state: "fail" },
      { id: "b", title: "B", severity: "low", state: "fail" },
    ],
    insights: {
      headers: [
        ["content-type", "text/html"],
        ["x-frame-options", "DENY"],
      ],
    },
  } as never;
  const s = construireInstantane(result, { date: D1, profond: false });
  assert.deepEqual(s.enTetes, { "x-frame-options": "DENY" });
  assert.equal(s.certificat, undefined);
  assert.equal(s.tls, undefined);
  assert.equal(s.domaine, undefined);
  assert.equal(s.sousDomaines, undefined);
  assert.equal(s.routes, undefined);
  assert.deepEqual(Object.keys(s.absents).sort(), ["certificat", "domaine", "routes", "sousDomaines", "tls"]);
  assert.deepEqual(s.problemes.map((p) => p.id), ["a"]);
});

test("journal : plus récent d'abord et plafonné à 300 entrées", () => {
  const e = (n: number): Changement => ({ date: D1, gravite: "info", categorie: "score", message: `m${n}` });
  const ancien = Array.from({ length: JOURNAL_MAX }, (_, i) => e(i));
  const j = ajouterAuJournal(ancien, [e(-2), e(-1)]);
  assert.equal(JOURNAL_MAX, 300);
  assert.equal(j.length, 300);
  assert.equal(j[0].message, "m-2");
  assert.equal(j[1].message, "m-1");
  assert.equal(j[299].message, "m297");
  assert.equal(ajouterAuJournal([], [e(1)], 300).length, 1);
  assert.deepEqual(aNotifier([e(1), { ...e(2), gravite: "important" }]).map((c) => c.message), ["m2"]);
});
