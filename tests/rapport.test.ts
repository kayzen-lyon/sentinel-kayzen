import { test } from "node:test";
import assert from "node:assert/strict";
import {
  celluleCsv,
  construireRapport,
  planRemediation,
  risqueGlobal,
  verifierSources,
  versCsv,
  versJson,
  versMarkdown,
  type PentestSource,
  type ScanSource,
} from "../lib/rapport";

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
  assert.ok(sqli.preuve && !sqli.preuve.includes("Hunter2Hunter2"));
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
