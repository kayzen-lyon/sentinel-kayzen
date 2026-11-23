import { test } from "node:test";
import assert from "node:assert/strict";
import { MASQUE, masquerProfond, masquerSecrets } from "../lib/masquage";
import {
  CHAMP_PREUVES,
  chiffrerPreuves,
  dechiffrerPreuves,
  ouvrirPreuves,
  sansPreuves,
  scellerConstat,
  separerPreuves,
} from "../lib/preuves";
import {
  autorisationCouvre,
  normaliserHote,
  perimetreCouvre,
  validerAutorisation,
} from "../lib/autorisations";

// ---------- Masquage des secrets ----------

test("masquerSecrets : jetons à préfixe connu, préfixe conservé", () => {
  const gh = "ghp_" + "a".repeat(36);
  const out = masquerSecrets(`jeton ${gh} trouvé`);
  assert.equal(out, `jeton ghp_${MASQUE} trouvé`);
  assert.ok(!masquerSecrets("AKIA" + "ABCDEFGHIJKLMNOP").includes("EFGH"));
  assert.ok(masquerSecrets("sk_live_" + "x".repeat(24)).startsWith("sk_l"));
});

test("masquerSecrets : affectations, en-têtes, URL et clés privées", () => {
  assert.equal(masquerSecrets("password=Sup3rS3cret!"), `password=Sup3${MASQUE}`);
  const valeur = "abcdef" + "123456"; // concaténé : pas de faux secret littéral pour gitleaks
  assert.equal(masquerSecrets(`{"api_key": "${valeur}"}`), `{"api_key": "abcd${MASQUE}"}`);
  assert.equal(masquerSecrets("Authorization: Bearer abc.def.ghi"), `Authorization: Bearer abc.${MASQUE}`);
  assert.equal(masquerSecrets("postgres://admin:hunter22@db.exemple.fr/x"), `postgres://admin:${MASQUE}@db.exemple.fr/x`);
  const pem = "-----BEGIN RSA PRIVATE KEY-----\nMIIEow\n-----END RSA PRIVATE KEY-----";
  assert.ok(!masquerSecrets(pem).includes("MIIEow"));
});

test("masquerSecrets : idempotent et sans effet sur un texte ordinaire", () => {
  const une = masquerSecrets("token=" + "abcdef" + "123456 et ghp_" + "b".repeat(36));
  assert.equal(masquerSecrets(une), une);
  const ordinaire = "Le jeton de session est régénéré à la connexion (token rotation).";
  assert.equal(masquerSecrets(ordinaire), ordinaire);
});

test("masquerProfond : chaînes imbriquées masquées, structure conservée", () => {
  const v = masquerProfond({ a: ["password=abcdefgh"], b: { c: 3, d: null } });
  assert.deepEqual(v, { a: [`password=abcd${MASQUE}`], b: { c: 3, d: null } });
});

// ---------- Preuves chiffrées ----------

test("separerPreuves : preuves isolées de la partie descriptive", () => {
  const { publique, preuves } = separerPreuves({
    title: "SQLi",
    description: "d",
    poc_script_code: "curl …",
    technical_analysis: "t",
    remediation_steps: ["r"],
  });
  assert.deepEqual(publique, { title: "SQLi", description: "d", remediation_steps: ["r"] });
  assert.deepEqual(preuves, { poc_script_code: "curl …", technical_analysis: "t" });
  assert.deepEqual(separerPreuves("x"), { publique: null, preuves: null });
});

test("chiffrerPreuves / dechiffrerPreuves : aller-retour AES-256-GCM, chiffré illisible", () => {
  const s = chiffrerPreuves({ poc: "SELECT secret" });
  assert.ok(s.startsWith("enc:p1:") && !s.includes("SELECT"));
  assert.deepEqual(dechiffrerPreuves(s), { poc: "SELECT secret" });
  const altere = s.slice(0, -4) + (s.endsWith("AAAA") ? "BBBB" : "AAAA");
  assert.throws(() => dechiffrerPreuves(altere));
});

test("scellerConstat / sansPreuves / ouvrirPreuves", () => {
  const scelle = scellerConstat({ title: "XSS", poc: "<script>" })!;
  assert.equal(typeof scelle[CHAMP_PREUVES], "string");
  assert.ok(!JSON.stringify(scelle).includes("<script>"));
  assert.deepEqual(sansPreuves(scelle), { payload: { title: "XSS" }, aPreuve: true });
  assert.deepEqual(ouvrirPreuves(scelle), { poc: "<script>" });
  // Ancienne ligne en clair : preuves retirées des exports, lisibles pour le rapport.
  assert.deepEqual(sansPreuves({ title: "a", request: "GET /" }), { payload: { title: "a" }, aPreuve: true });
  assert.deepEqual(ouvrirPreuves({ title: "a", request: "GET /" }), { request: "GET /" });
});

// ---------- Autorisations écrites ----------

test("normaliserHote : URL, majuscules, joker ; refus des entrées invalides", () => {
  assert.equal(normaliserHote("https://App.Exemple.fr/chemin?x"), "app.exemple.fr");
  assert.equal(normaliserHote("*.exemple.fr"), "*.exemple.fr");
  assert.equal(normaliserHote("exemple"), null);
  assert.equal(normaliserHote("10.0.0.1"), null);
});

test("perimetreCouvre : exact et joker (sous-domaines seulement)", () => {
  assert.ok(perimetreCouvre(["exemple.fr"], "exemple.fr"));
  assert.ok(!perimetreCouvre(["exemple.fr"], "api.exemple.fr"));
  assert.ok(perimetreCouvre(["*.exemple.fr"], "api.exemple.fr"));
  assert.ok(!perimetreCouvre(["*.exemple.fr"], "exemple.fr"));
  assert.ok(!perimetreCouvre(["*.exemple.fr"], "malexemple.fr"));
});

test("autorisationCouvre : dates incluses, révocation", () => {
  const a = { perimetre: ["exemple.fr"], debut: "2026-11-01", fin: "2026-11-30", revoked_at: null };
  assert.ok(autorisationCouvre(a, "exemple.fr", new Date("2026-11-30T23:00:00Z")));
  assert.ok(autorisationCouvre(a, "exemple.fr", new Date("2026-11-01T00:00:00Z")));
  assert.ok(!autorisationCouvre(a, "exemple.fr", new Date("2026-12-01T00:00:00Z")));
  assert.ok(!autorisationCouvre(a, "exemple.fr", new Date("2026-10-31T23:59:00Z")));
  assert.ok(!autorisationCouvre({ ...a, revoked_at: "2026-11-10" }, "exemple.fr", new Date("2026-11-15")));
});

test("validerAutorisation : champs obligatoires et document", () => {
  const ok = { client: "ACME", perimetre: ["exemple.fr"], debut: "2026-11-01", fin: "2026-11-30", documentType: "application/pdf", documentTaille: 1000 };
  assert.deepEqual(validerAutorisation(ok), []);
  assert.equal(validerAutorisation({ ...ok, client: " " }).length, 1);
  assert.equal(validerAutorisation({ ...ok, debut: "2026-12-01" }).length, 1);
  assert.equal(validerAutorisation({ ...ok, documentType: "text/html" }).length, 1);
  assert.equal(validerAutorisation({ ...ok, documentTaille: 6 * 1024 * 1024 }).length, 1);
});
