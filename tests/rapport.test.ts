import { test } from "node:test";
import assert from "node:assert/strict";
import {
  compterParSeverite,
  niveauRisque,
  planRemediation,
  trierParSeverite,
  champ,
  dateLongue,
  type FindingRapport,
} from "../lib/rapportPentest";

/** Tests de l'assemblage du rapport de pentest (niveau de risque, plan de remédiation). */

const f = (id: string, severity: string | null, extra: Partial<FindingRapport> = {}, effort?: string): FindingRapport => ({
  native_id: id,
  title: id,
  severity,
  cvss: null,
  status: "open",
  payload: effort ? { fix_effort: effort } : {},
  ...extra,
});

test("rapport : niveau de risque global = sévérité la plus haute retenue", () => {
  assert.equal(niveauRisque([]).niveau, "aucun constaté");
  assert.equal(niveauRisque([f("a", "low"), f("b", "medium")]).niveau, "modéré");
  assert.equal(niveauRisque([f("a", "HIGH")]).niveau, "élevé");
  assert.equal(niveauRisque([f("a", "critical"), f("b", "low")]).niveau, "critique");
  // Un faux positif ne fait pas monter le risque.
  assert.equal(niveauRisque([f("a", "critical", { status: "false_positive" }), f("b", "low")]).niveau, "faible");
});

test("rapport : comptage par sévérité, sévérité inconnue → information", () => {
  const c = compterParSeverite([f("a", "critical"), f("b", "bizarre"), f("c", null), f("d", "medium")]);
  assert.deepEqual(c, { critical: 1, high: 0, medium: 1, low: 0, info: 2 });
});

test("rapport : plan de remédiation par risque puis effort", () => {
  const plan = planRemediation([
    f("moyenne-faible", "medium", {}, "low"),
    f("critique-eleve", "critical", {}, "high"),
    f("critique-trivial", "critical", {}, "trivial"),
    f("faible-inconnu", "low"),
    f("fp", "critical", { status: "false_positive" }, "trivial"),
  ]);
  assert.deepEqual(
    plan.map((e) => e.finding.native_id),
    ["critique-trivial", "critique-eleve", "moyenne-faible", "faible-inconnu"]
  );
  assert.equal(plan[0].gainRapide, true);
  assert.equal(plan[1].gainRapide, false);
  assert.equal(plan[2].gainRapide, true);
  assert.equal(plan[3].gainRapide, false);
  assert.equal(plan[3].effort, null);
});

test("rapport : tri par sévérité puis CVSS", () => {
  const t = trierParSeverite([f("a", "high", { cvss: 7.1 }), f("b", "critical", { cvss: 9 }), f("c", "high", { cvss: 8.2 })]);
  assert.deepEqual(t.map((x) => x.native_id), ["b", "c", "a"]);
});

test("rapport : lecture de champ et date", () => {
  assert.equal(champ({ a: "  x " }, "a"), "x");
  assert.equal(champ({ a: "  " }, "a"), null);
  assert.equal(champ({ a: 3 }, "a"), null);
  assert.equal(champ(null, "a"), null);
  assert.equal(dateLongue("2026-11-22T10:00:00Z"), "22 novembre 2026");
  assert.equal(dateLongue(null), "—");
  assert.equal(dateLongue("pas une date"), "—");
});
