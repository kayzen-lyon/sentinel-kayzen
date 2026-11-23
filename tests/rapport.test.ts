import { test } from "node:test";
import assert from "node:assert/strict";
import {
  celluleCsv,
  construireRapport,
  planRemediation,
  risqueGlobal,
  scoreSecurite,
  verifierSources,
  versCsv,
  versJson,
  versMarkdown,
  type PentestSource,
  type ScanSource,
} from "../lib/rapport";
import { categorieOwasp, lireCvss, numeroCwe } from "../lib/referentiel";

const MAINTENANT = new Date("2026-11-22T12:00:00Z");
const MOI = { userId: "u1", orgIds: ["o1"] };
const src = (id: string, over: Partial<{ user_id: string; org_id: string | null; status: string; created_at: string }> = {}) => ({
  id,
  user_id: "u1",
  org_id: "o1",
  status: "done",
  created_at: "2026-11-20T10:00:00Z",
  ...over,
});

test("verifierSources : propriétaire, terminé, 7 jours au plus", () => {
  assert.deepEqual(verifierSources(["a"], [src("a")], MOI, MAINTENANT, "scan"), []);
  // Même organisation, autre auteur : accepté.
  assert.deepEqual(verifierSources(["a"], [src("a", { user_id: "u2" })], MOI, MAINTENANT, "scan"), []);
  assert.equal(verifierSources(["a"], [src("a", { user_id: "u2", org_id: "o9" })], MOI, MAINTENANT, "scan").length, 1);
  assert.equal(verifierSources(["absent"], [], MOI, MAINTENANT, "scan").length, 1);
  assert.equal(verifierSources(["a"], [src("a", { status: "running" })], MOI, MAINTENANT, "pentest").length, 1);
  assert.equal(verifierSources(["a"], [src("a", { created_at: "2026-11-15T11:59:00Z" })], MOI, MAINTENANT, "scan").length, 1);
  assert.deepEqual(verifierSources(["a"], [src("a", { created_at: "2026-11-15T12:01:00Z" })], MOI, MAINTENANT, "scan"), []);
});

test("risqueGlobal : la constatation la plus grave l'emporte, jamais « sûr »", () => {
  assert.equal(risqueGlobal({ critical: 1, high: 3, medium: 0, low: 0, info: 0 }).niveau, "critique");
  assert.equal(risqueGlobal({ critical: 0, high: 0, medium: 2, low: 5, info: 0 }).niveau, "modere");
  const aucun = risqueGlobal({ critical: 0, high: 0, medium: 0, low: 0, info: 4 });
  assert.equal(aucun.niveau, "aucun");
  assert.match(aucun.explication, /ne garantit pas/);
});

const scan: ScanSource = {
  id: "scan-0001",
  target_url: "https://demo.sentinel.test/",
  created_at: "2026-11-20T10:00:00Z",
  deep: false,
  score: 70,
  grade: "C",
  findings: [
    { id: "csp", title: "CSP absente", severity: "medium", state: "fail", effort: "moyen", detail: "d", recommendation: "r" },
    { id: "hsts", title: "HSTS", severity: "high", state: "fail", effort: "rapide" },
    { id: "ok", title: "TLS", severity: "critical", state: "pass" },
  ],
};
const pentest: PentestSource = {
  id: "job-0001",
  target_url: "https://demo.sentinel.test",
  mode: "standard",
  created_at: "2026-11-21T08:00:00Z",
  started_at: "2026-11-21T08:01:00Z",
  completed_at: "2026-11-21T09:00:00Z",
  findings: [
    { native_id: "v1", title: "Injection SQL", severity: "critical", cvss: 9.1, status: "open", payload: { description: "d", remediation: "r" }, preuves: { poc: "password=" + "Hunter2Hunter2" } },
    { native_id: "v2", title: "Faux positif", severity: "high", cvss: 7, status: "false_positive", payload: {}, preuves: null },
  ],
};

test("construireRapport : constats triés, faux positifs et contrôles réussis exclus, limites honnêtes", () => {
  const m = construireRapport("Rapport", [scan], [pentest], MAINTENANT);
  assert.deepEqual(m.constats.map((c) => c.titre), ["Injection SQL", "HSTS", "CSP absente"]);
  assert.deepEqual(m.comptes, { critical: 1, high: 1, medium: 1, low: 0, info: 0 });
  assert.equal(m.risque.niveau, "critique");
  assert.deepEqual(m.perimetre, ["demo.sentinel.test"]);
  assert.deepEqual(m.periode, { debut: "2026-11-20T10:00:00Z", fin: "2026-11-21T09:00:00Z" });
  assert.ok(m.methode.nonTeste.some((n) => n.includes("passifs")));
  // Preuve conservée pour le document authentifié, secret masqué.
  const sqli = m.constats[0];
  assert.ok(sqli.preuve && !JSON.stringify(sqli.preuve).includes("Hunter2Hunter2"));
});

test("construireRapport sans pentest : l'absence d'exploitation est annoncée", () => {
  const m = construireRapport("R", [scan], [], MAINTENANT);
  assert.match(m.methode.nonTeste[0], /Aucun pentest autonome/);
});

test("planRemediation : risque décroissant puis effort croissant", () => {
  const m = construireRapport("R", [scan], [pentest], MAINTENANT);
  const plan = planRemediation(m.constats);
  assert.deepEqual(plan.map((e) => [e.rang, e.titre]), [[1, "Injection SQL"], [2, "HSTS"], [3, "CSP absente"]]);
  assert.equal(plan[0].echeance, "Immédiat (sous 72 h)");
});

test("exports : aucune preuve d'exploitation, CSV protégé contre les formules", () => {
  const m = construireRapport("R", [scan], [pentest], MAINTENANT);
  for (const sortie of [versJson(m), versMarkdown(m), versCsv(m)]) {
    assert.ok(!sortie.includes("Hunter2"));
    assert.ok(!sortie.includes("password="));
  }
  assert.ok(!versJson(m).includes('"preuve"'));
  assert.match(versMarkdown(m), /rapport authentifié uniquement/);
  assert.equal(celluleCsv("=HYPERLINK(\"x\")"), `"'=HYPERLINK(""x"")"`);
  assert.equal(celluleCsv(null), '""');
  assert.equal(versCsv(m).split("\r\n").length, 4);
});

// ---------- Rapport professionnel : champs Strix, sujets, note, contre-test ----------

const pentestRiche: PentestSource = {
  id: "job-0002",
  target_url: "https://app.demo.sentinel.test",
  mode: "standard",
  created_at: "2026-11-21T08:00:00Z",
  started_at: "2026-11-21T08:01:00Z",
  completed_at: "2026-11-21T09:00:00Z",
  findings: [
    {
      native_id: "v1",
      title: "Injection SQL sur /api/produits",
      severity: "critical",
      cvss: 9.8,
      status: "open",
      payload: {
        description: "Paramètre id concaténé.",
        impact: "Lecture de toute la base.",
        remediation_steps: "Requêtes paramétrées.",
        cwe: "CWE-89",
        endpoint: "/api/produits",
        method: "get",
        fix_effort: "low",
        assumptions: "Utilisateur anonyme.",
        cvss_breakdown: { attack_vector: "N", attack_complexity: "L", privileges_required: "N", user_interaction: "N", scope: "U", confidentiality: "H", integrity: "H", availability: "H" },
        code_locations: [{ file: "src/api/produits.ts", start_line: 12, end_line: 18 }],
        _sentinel_validation: { verdict: "confirmed", reason: "Requête et résultat probants." },
      },
      preuves: {
        technical_analysis: "La requête est construite par concaténation.",
        poc_description: "1. Envoyer id=1 OR 1=1.\n2. Observer toutes les lignes.",
        poc_script_code: "curl 'https://app.demo.sentinel.test/api/produits?id=1%20OR%201=1'",
        evidence: "HTTP/1.1 200 OK",
      },
    },
  ],
};

test("constat Strix : tous les champs exploités (CVSS, OWASP, point d'entrée, effort, preuve structurée)", () => {
  const m = construireRapport("R", [], [pentestRiche], MAINTENANT, { id: "abcdef12-0000" });
  const c = m.constats[0];
  assert.equal(c.vecteurCvss, "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H");
  assert.equal(c.metriquesCvss.length, 8);
  assert.equal(c.owasp?.code, "A03:2021");
  assert.equal(c.pointEntree, "GET /api/produits");
  assert.equal(c.effort, "rapide");
  assert.equal(c.priorite, "P1");
  assert.equal(c.impact, "Lecture de toute la base.");
  assert.equal(c.validation?.verdict, "confirmed");
  assert.deepEqual(c.localisations, ["src/api/produits.ts, lignes 12 à 18"]);
  assert.ok(c.preuve?.analyse && c.preuve.reproduction && c.preuve.script && c.preuve.elements);
  assert.ok(c.liens.some((l) => l.url === "https://cwe.mitre.org/data/definitions/89.html"));
  assert.ok(c.criteres.some((x) => x.includes("preuve de concept")));
  assert.ok(c.criteres.some((x) => x.includes("GET /api/produits")));
  assert.equal(m.document.reference, "SEN-RPT-20261122-ABCDEF");
  assert.equal(m.validation.avecPreuve, 1);
  assert.equal(m.validation.confirmes, 1);
});

test("exports : la preuve structurée (analyse, reproduction, script) ne sort jamais", () => {
  const m = construireRapport("R", [], [pentestRiche], MAINTENANT);
  for (const sortie of [versJson(m), versMarkdown(m), versCsv(m)]) {
    assert.ok(!sortie.includes("concaténation"));
    assert.ok(!sortie.includes("OR 1=1"));
    assert.ok(!sortie.includes("HTTP/1.1 200 OK"));
  }
  assert.match(versCsv(m), /CVSS:3\.1\/AV:N/);
});

test("scoreSecurite : pénalités et plafonds par gravité", () => {
  assert.deepEqual(scoreSecurite({ critical: 0, high: 0, medium: 0, low: 0, info: 3 }).lettre, "A");
  assert.equal(scoreSecurite({ critical: 0, high: 0, medium: 2, low: 1, info: 0 }).valeur, 88);
  // Une vulnérabilité élevée plafonne à C, une critique à D, même avec un score élevé.
  assert.equal(scoreSecurite({ critical: 0, high: 1, medium: 0, low: 0, info: 0 }).lettre, "C");
  assert.equal(scoreSecurite({ critical: 1, high: 0, medium: 0, low: 0, info: 0 }).lettre, "D");
  assert.equal(scoreSecurite({ critical: 5, high: 0, medium: 0, low: 0, info: 0 }).valeur, 0);
  assert.equal(scoreSecurite({ critical: 5, high: 0, medium: 0, low: 0, info: 0 }).lettre, "F");
});

test("construireSujets : exploitation par OWASP, configuration par catégorie, sujets conformes inclus", () => {
  const scanCat: ScanSource = {
    ...scan,
    findings: [
      { id: "csp", title: "CSP absente", severity: "medium", state: "fail", category: "En-têtes" },
      { id: "xcto", title: "nosniff", severity: "low", state: "pass", category: "En-têtes" },
      { id: "tls", title: "TLS 1.3", severity: "high", state: "pass", category: "TLS" },
    ],
  };
  const m = construireRapport("R", [scanCat], [pentestRiche], MAINTENANT);
  const ids = m.sujets.map((x) => x.titre);
  assert.equal(m.sujets[0].nature, "exploitation");
  assert.equal(m.sujets[0].code, "A03:2021");
  assert.equal(m.sujets[0].etat, "prioritaire");
  const entetes = m.sujets.find((x) => x.titre === "En-têtes de sécurité HTTP");
  assert.deepEqual(entetes?.controles, { total: 2, conformes: 1, enEchec: 1 });
  assert.equal(entetes?.etat, "a-ameliorer");
  const tls = m.sujets.find((x) => x.titre === "Chiffrement TLS et certificat");
  assert.equal(tls?.etat, "conforme");
  assert.ok(ids.length === 3);
  assert.equal(m.inventaire.length, 3);
  assert.ok(m.conclusion.length >= 3);
  assert.ok(m.synthese.some((p) => p.includes("note de sécurité")));
});

test("autorisations : client nommé sur la fiche de contrôle", () => {
  const m = construireRapport("R", [], [pentestRiche], MAINTENANT, {
    autorisations: [{ client: "Démo SAS", perimetre: ["app.demo.sentinel.test"], debut: "2026-11-01", fin: "2026-12-01", document: "autorisation.pdf", empreinte: "a".repeat(64) }],
  });
  assert.equal(m.document.client, "Démo SAS");
  assert.match(m.synthese[0], /À la demande de Démo SAS/);
});

test("référentiel : CWE vers OWASP, CVSS incomplet refusé", () => {
  assert.equal(categorieOwasp(null, "CWE-79")?.code, "A03:2021");
  assert.equal(categorieOwasp("A01:2021 – Broken Access Control", "CWE-79")?.code, "A01:2021");
  assert.equal(categorieOwasp(null, "CWE-99999"), null);
  assert.equal(numeroCwe("cwe 352"), 352);
  assert.equal(numeroCwe("hello 12"), null);
  assert.equal(lireCvss({ attack_vector: "N" }), null);
});
