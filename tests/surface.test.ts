import { test } from "node:test";
import assert from "node:assert/strict";
import { comparer, joursAvant, plafonner, type Instantane } from "../lib/attaque/comparer";

const base: Instantane = {
  hote: "exemple.fr",
  date: "2026-11-20T06:00:00Z",
  ports: [80, 443],
  tls: { protocoles: ["TLSv1.2", "TLSv1.3"], certExpire: "2027-02-01T00:00:00Z", emetteur: "R11" },
  domaineExpire: "2027-06-01T00:00:00Z",
  sousDomaines: ["www.exemple.fr"],
  routes: ["/api/login"],
  entetes: { "strict-transport-security": "max-age=31536000; includeSubDomains", "content-security-policy": "default-src 'self'", "x-frame-options": "DENY" },
};
const apres = (over: Partial<Instantane>): Instantane => ({ ...base, date: "2026-11-21T06:00:00Z", ...over });

test("comparer : aucun changement → liste vide", () => {
  assert.deepEqual(comparer(base, apres({})), []);
});

test("comparer : port sensible ouvert = critique, port ordinaire = important, fermeture = info", () => {
  const c = comparer(base, apres({ ports: [443, 3306, 8080] }));
  assert.deepEqual(c.map((x) => [x.gravite, x.type]), [["critique", "port-ouvert"], ["important", "port-ouvert"], ["info", "port-ferme"]]);
  assert.match(c[0].phrase, /3306 \(MySQL\)/);
  assert.equal(c[0].date, "2026-11-21T06:00:00Z");
});

test("comparer : mesure indisponible (null) jamais lue comme une disparition", () => {
  assert.deepEqual(comparer(base, apres({ ports: null, sousDomaines: null, routes: null, entetes: null, tls: null })), []);
});

test("comparer : TLS obsolète réaccepté, échéance de certificat franchie", () => {
  const c = comparer(base, apres({ tls: { protocoles: ["TLSv1", "TLSv1.2", "TLSv1.3"], certExpire: "2026-11-26T00:00:00Z", emetteur: "R11" } }));
  assert.ok(c.some((x) => x.type === "tls-obsolete" && x.gravite === "important"));
  const cert = c.find((x) => x.type === "certificat-echeance")!;
  assert.equal(cert.gravite, "critique");
  assert.match(cert.phrase, /expire dans 4 jours/);
});

test("comparer : un seuil d'échéance déjà signalé ne se répète pas", () => {
  const veille = apres({ tls: { ...base.tls!, certExpire: "2026-12-10T00:00:00Z" } }); // 19 jours : important
  assert.equal(comparer(base, veille).filter((x) => x.type === "certificat-echeance").length, 1);
  const lendemain = { ...veille, date: "2026-11-22T06:00:00Z" };
  assert.equal(comparer(veille, lendemain).filter((x) => x.type === "certificat-echeance").length, 0);
});

test("comparer : domaine expiré (RDAP)", () => {
  const c = comparer(base, apres({ domaineExpire: "2026-11-20T00:00:00Z" }));
  assert.deepEqual(c.map((x) => [x.gravite, x.type]), [["critique", "domaine-expire"]]);
});

test("comparer : nouveaux sous-domaines et routes (route sensible = important)", () => {
  const c = comparer(base, apres({ sousDomaines: ["www.exemple.fr", "staging.exemple.fr"], routes: ["/api/login", "/admin/users", "/api/v2/items"] }));
  assert.deepEqual(
    c.map((x) => [x.gravite, x.type]),
    [["important", "sous-domaine"], ["important", "route"], ["info", "route"]]
  );
});

test("comparer : en-têtes retirés ou affaiblis", () => {
  const c = comparer(
    base,
    apres({ entetes: { "strict-transport-security": "max-age=300", "content-security-policy": "default-src 'self' 'unsafe-inline'" } })
  );
  const types = c.map((x) => x.type).sort();
  assert.deepEqual(types, ["entete-affaibli", "entete-affaibli", "entete-retire"]);
  assert.ok(c.some((x) => /durée HSTS réduite/.test(x.phrase)));
  assert.ok(c.some((x) => /'unsafe-inline' ajouté/.test(x.phrase)));
});

test("comparer : premier passage → seulement ce qui est déjà grave", () => {
  const c = comparer(null, apres({ ports: [80, 443, 6379] }));
  assert.deepEqual(c.map((x) => x.type), ["port-ouvert"]);
});

test("joursAvant et plafonner", () => {
  assert.equal(joursAvant("2026-11-30T00:00:00Z", "2026-11-20T00:00:00Z"), 10);
  assert.equal(plafonner(Array.from({ length: 350 }, (_, i) => i)).length, 300);
});
