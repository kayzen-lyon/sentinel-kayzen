import { test } from "node:test";
import assert from "node:assert/strict";

/** Tests des modules du scan enrichi, de la notation, des alertes et de la vue d'ensemble. */

test("insights : SPF, DMARC et score e-mail", async () => {
  const { spfAll, spfLookups, dmarcPolicy, emailScore } = await import("../lib/insights/dns");
  assert.equal(spfAll("v=spf1 include:_spf.google.com ~all"), "~all");
  assert.equal(spfAll("v=spf1 mx -all"), "-all");
  assert.equal(spfAll("v=spf1 all"), "+all");
  assert.equal(spfAll("v=spf1 mx"), "absent");
  assert.equal(dmarcPolicy("v=DMARC1; p=reject; rua=mailto:a@b.fr"), "reject");
  assert.equal(dmarcPolicy("v=DMARC1"), "absent");
  const resolver = async (n: string) =>
    n === "a.test" ? ["v=spf1 include:b.test mx -all"] : ["v=spf1 ip4:1.2.3.4 -all"];
  // include:a.test (1) + son include:b.test (1) + son mx (1) + a (1) = 4
  assert.equal(await spfLookups("v=spf1 include:a.test a -all", 0, resolver), 4);
  const strong = emailScore({
    spf: { record: "", all: "-all", lookups: 2 },
    dmarc: { record: "", policy: "reject", rua: true },
    dkimSelectors: ["google"],
    mtaSts: { record: true, policy: true },
    tlsRpt: true,
  });
  assert.equal(strong, 100);
  assert.ok(emailScore({ dkimSelectors: [], tlsRpt: false }) <= 30);
});

test("insights : CSP, cookies, bibliothèques et contenu", async () => {
  const { analyzeCsp, parseCookie, detectLibraries, analyzeContent, trackerFor } = await import("../lib/insights/http");
  const weak = analyzeCsp("default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' *");
  assert.equal(weak.weaknesses.length, 3);
  assert.deepEqual(weak.missing, ["object-src", "base-uri", "frame-ancestors", "form-action"]);
  const strong = analyzeCsp(
    "default-src 'none'; script-src 'self' 'nonce-abc' 'unsafe-inline'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
  );
  assert.equal(strong.weaknesses.length, 0);
  assert.equal(strong.missing.length, 0);
  const c = parseCookie("sessionid=abc123; Path=/; Secure; SameSite=Lax; Max-Age=3600");
  assert.deepEqual([c.name, c.secure, c.httpOnly, c.sameSite, c.session], ["sessionid", true, false, "Lax", true]);
  const libs = detectLibraries(["/js/jquery-1.12.4.min.js", "/* Bootstrap v5.3.2 */"]);
  assert.ok(libs.find((l) => l.name === "jQuery")?.vulnerable);
  assert.equal(libs.find((l) => l.name === "Bootstrap")?.vulnerable, undefined);
  assert.equal(trackerFor("www.googletagmanager.com/gtm.js"), "Google Analytics / Tag Manager");
  const html =
    '<script src="https://cdn.tiers.net/lib.js"></script><script src="https://www.googletagmanager.com/gtm.js"></script>' +
    '<script src="/local.js"></script><form action="http://site.fr/login"></form><!-- TODO retirer le mot de passe admin -->' +
    '<a href="https://x.fr" target="_blank">x</a> contact@site.fr';
  const r = analyzeContent(html, "https://site.fr/");
  assert.deepEqual(r.thirdParties.map((t) => t.host), ["cdn.tiers.net", "www.googletagmanager.com"]);
  const ids = r.findings.map((f) => f.id);
  for (const id of ["trackers-preconsent", "sri-missing", "form-http", "emails-exposed", "html-comments", "tabnabbing"])
    assert.ok(ids.includes(id), id);
});

test("insights : TLS (suites faibles, algorithme de signature)", async () => {
  const { isWeakCipher, signatureAlgorithm } = await import("../lib/insights/tls");
  assert.equal(isWeakCipher("TLS_RSA_WITH_RC4_128_SHA"), true);
  assert.equal(isWeakCipher("TLS_AES_256_GCM_SHA384"), false);
  const sha1 = Buffer.from("3000" + "06092a864886f70d010105" + "0500", "hex");
  assert.deepEqual(signatureAlgorithm(sha1), { name: "SHA-1 avec RSA", weak: true });
  assert.equal(signatureAlgorithm(Buffer.from("06092a864886f70d01010b", "hex"))?.weak, false);
  assert.equal(signatureAlgorithm(Buffer.from("00", "hex")), null);
});

test("scoring : sous-scores, plafonnement, effort, priorité, références", async () => {
  const sc = await import("../lib/insights/scoring");
  const mk = (id: string, category: string, severity: string, state: string) =>
    ({ id, category, title: id, severity, state, detail: "" }) as never;
  const findings = [
    mk("hsts", "Transport", "high", "fail"),
    mk("xcto", "En-têtes", "low", "warn"),
    mk("https", "Transport", "info", "pass"),
    mk("js-secret-aws", "Divulgation", "critical", "fail"),
  ];
  const scores = sc.categoryScores(findings);
  assert.equal(scores.transport, 85);
  assert.equal(scores.headers, 98);
  assert.equal(scores.exposure, 75);
  assert.equal(sc.capGrade("A", findings), "D"); // un secret critique interdit mieux que D
  assert.equal(sc.capGrade("A", [mk("hsts", "Transport", "high", "fail")]), "B");
  assert.equal(sc.capGrade("F", findings), "F");
  assert.equal(sc.effortOf("xcto"), "rapide");
  assert.equal(sc.effortOf("js-secret-aws"), "important");
  sc.enrichFindings(findings, "https://www.site.fr/");
  const [hsts, xcto, pass] = findings as unknown as {
    priority?: number;
    snippets?: unknown[];
    wstg?: string;
    repro?: string;
    why?: string;
    cwe?: string;
  }[];
  assert.ok((hsts.priority ?? 0) > (xcto.priority ?? 0));
  assert.equal(hsts.snippets?.length, 4);
  assert.equal(hsts.wstg, "WSTG-CONF-07");
  assert.equal(hsts.repro, "curl -sI https://www.site.fr/");
  assert.ok(hsts.why && hsts.cwe);
  assert.equal(pass.priority, undefined); // les contrôles conformes ne sont pas enrichis
  assert.deepEqual(sc.quickWins(findings), ["hsts", "xcto"]);
  assert.equal(sc.reproFor("dmarc", "https://www.site.fr/"), "dig +short TXT _dmarc.site.fr");
  assert.match(
    sc.executiveSummary("D", 60, findings, scores),
    /^Note D \(60\/100\) : 3 point\(s\) à traiter, dont 1 critique\(s\) et 1 élevé\(s\)\./
  );
});

test("overview : inventaire, tendance et agrégats", async () => {
  const { buildOverview } = await import("../lib/overview");
  const f = (id: string, title: string, severity: string) =>
    ({ id, category: "En-têtes", title, severity, state: "fail", detail: "", effort: "rapide", priority: 30 }) as never;
  const scan = (id: string, host: string, score: number, created: string, findings: unknown[], insights: unknown = {}) =>
    ({ id, target_url: `https://${host}/`, grade: "B", score, created_at: created, findings, insights }) as never;
  const cert = { protocols: {}, cert: { daysRemaining: 12, san: [], hostnameCovered: true } };
  const o = buildOverview([
    scan("3", "a.fr", 80, "2026-11-20", [f("csp", "CSP absente", "high")], {
      categoryScores: { headers: 80 },
      quickWins: ["CSP absente"],
      tls: cert,
    }),
    scan("2", "b.fr", 60, "2026-11-19", [f("csp", "CSP absente", "high"), f("xfo", "XFO absent", "low")], {
      categoryScores: { headers: 60 },
      quickWins: ["CSP absente"],
      email: { score: 40, dkimSelectors: [], tlsRpt: false },
    }),
    scan("1", "a.fr", 70, "2026-11-10", []),
  ]);
  assert.equal(o.totals.targets, 2);
  assert.equal(o.targets[0].host, "b.fr"); // moins bien noté d'abord
  assert.equal(o.targets.find((t) => t.host === "a.fr")?.delta, 10);
  assert.equal(o.targets.find((t) => t.host === "a.fr")?.certDays, 12);
  assert.equal(o.targets[0].spf, "absent");
  assert.equal(o.categoryAverages.headers, 70);
  // a.fr : scan précédent sans sous-scores → pas d'évolution calculable
  assert.equal(o.categoryDeltas.headers, undefined);
  assert.deepEqual([...o.topProblems[0].hosts].sort(), ["a.fr", "b.fr"]);
  assert.deepEqual(o.quickWins[0], { title: "CSP absente", hosts: 2 });
  assert.equal(o.totals.problems, 3);
  assert.ok(o.compliance.length > 0);
});

test("cve : lecture EPSS", async () => {
  const { parseEpss } = await import("../lib/cve");
  const m = parseEpss({ data: [{ cve: "CVE-2021-44228", epss: "0.99999" }, { cve: "CVE-X", epss: "abc" }] });
  assert.equal(m.get("CVE-2021-44228"), 0.99999);
  assert.equal(m.size, 1);
  assert.equal(parseEpss(null).size, 0);
});

test("overview : évolution des sous-scores par catégorie", async () => {
  const { buildOverview } = await import("../lib/overview");
  const scan = (id: string, created: string, headers: number) =>
    ({ id, target_url: "https://a.fr/", grade: "B", score: 80, created_at: created, findings: [], insights: { categoryScores: { headers } } }) as never;
  const o = buildOverview([scan("2", "2026-11-20", 90), scan("1", "2026-11-10", 75)]);
  assert.equal(o.categoryAverages.headers, 90);
  assert.equal(o.categoryDeltas.headers, 15);
});
