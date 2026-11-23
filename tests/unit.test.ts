import { test } from "node:test";
import assert from "node:assert/strict";
import { validateEmail, validatePassword } from "../lib/password";
import { validateTargetUrl, safeFetch } from "../lib/ssrf";
import { normalizeDomain, domainCandidates } from "../lib/domains";
import { parseBanners } from "../lib/cve";
import { analyzeForms } from "../lib/recon";
import { safeInternalPath } from "../lib/redirect";
import { formatDate, formatDateTime } from "../lib/format";
import { getPlaybook, PLAYBOOKS } from "../lib/playbooks";
import { engineEventType } from "../lib/github";

test("validateEmail", () => {
  assert.equal(validateEmail("a@b.fr"), true);
  assert.equal(validateEmail("nope"), false);
  assert.equal(validateEmail("a@b"), false);
});

test("validatePassword", () => {
  assert.equal(validatePassword("Abcdef12"), null);
  assert.ok(validatePassword("short1A"));
  assert.ok(validatePassword("alllowercase1"));
  assert.ok(validatePassword("NOLOWER123"));
});

test("normalizeDomain", () => {
  assert.equal(normalizeDomain("https://www.exemple.fr/page"), "exemple.fr");
  assert.equal(normalizeDomain("EXEMPLE.FR"), "exemple.fr");
  assert.equal(normalizeDomain("pas un domaine"), null);
});

test("domainCandidates : hôte exact puis parents", () => {
  assert.deepEqual(domainCandidates("app.exemple.fr"), ["app.exemple.fr", "exemple.fr"]);
  assert.deepEqual(domainCandidates("www.exemple.fr"), ["exemple.fr"]);
  assert.deepEqual(domainCandidates("exemple.fr"), ["exemple.fr"]);
  assert.deepEqual(domainCandidates("a.mairie.gouv.fr"), [
    "a.mairie.gouv.fr",
    "mairie.gouv.fr",
    "gouv.fr",
  ]);
  assert.deepEqual(domainCandidates("Shop.Example.CO.UK."), [
    "shop.example.co.uk",
    "example.co.uk",
    "co.uk",
  ]);
  assert.deepEqual(domainCandidates("localhost"), []);
});

test("validateTargetUrl bloque les cibles internes", async () => {
  assert.equal((await validateTargetUrl("http://localhost")).ok, false);
  assert.equal((await validateTargetUrl("http://127.0.0.1")).ok, false);
  assert.equal((await validateTargetUrl("http://192.168.1.10")).ok, false);
  assert.equal((await validateTargetUrl("http://169.254.169.254")).ok, false);
  assert.equal((await validateTargetUrl("ftp://exemple.fr")).ok, false);
  assert.equal((await validateTargetUrl("n'importe quoi")).ok, false);
});

test("validateTargetUrl accepte une IP publique littérale", async () => {
  const r = await validateTargetUrl("http://8.8.8.8");
  assert.equal(r.ok, true);
});

test("safeFetch refuse les cibles internes / non http(s) sans réseau", async () => {
  // La validation anti-SSRF s'applique dès le premier saut : aucune connexion n'est tentée.
  assert.equal(await safeFetch("http://127.0.0.1/"), null);
  assert.equal(await safeFetch("http://169.254.169.254/latest/meta-data/"), null);
  assert.equal(await safeFetch("http://localhost:8080/"), null);
  assert.equal(await safeFetch("file:///etc/passwd"), null);
});

test("getSecret échoue fermé en production sans AUTH_SECRET", async () => {
  const env = process.env as Record<string, string | undefined>;
  const prevEnv = env.NODE_ENV;
  const prevSecret = env.AUTH_SECRET;
  try {
    env.NODE_ENV = "production";
    delete env.AUTH_SECRET;
    const { createSessionToken } = await import("../lib/jwt");
    await assert.rejects(() => createSessionToken({ id: "u1", email: "a@b.fr" }));

    env.AUTH_SECRET = "un-secret-suffisamment-long-123";
    const token = await createSessionToken({ id: "u1", email: "a@b.fr" });
    assert.ok(typeof token === "string" && token.length > 0);
  } finally {
    if (prevEnv === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = prevEnv;
    if (prevSecret === undefined) delete env.AUTH_SECRET;
    else env.AUTH_SECRET = prevSecret;
  }
});

test("parseBanners extrait produit/version", () => {
  const c = parseBanners("nginx/1.24.0 (Ubuntu)", "PHP/8.1.2");
  assert.deepEqual(c, [
    { product: "nginx", version: "1.24.0" },
    { product: "php", version: "8.1.2" },
  ]);
  // dédup + ignore le bruit sans version
  assert.equal(parseBanners("Apache", "Apache/2.4.52", "Apache/2.4.52").length, 1);
  assert.deepEqual(parseBanners(undefined, ""), []);
});

test("analyzeForms détecte CSRF et autocomplétion", () => {
  const withCsrf = analyzeForms(
    `<form method="post"><input type="hidden" name="_csrf" value="x">
     <input type="password" autocomplete="new-password"></form>`
  );
  assert.equal(withCsrf.hasPassword, true);
  assert.equal(withCsrf.csrf, true);
  assert.equal(withCsrf.weakAutocomplete, false);

  const weak = analyzeForms(
    `<form><input type="password" autocomplete="on"></form>`
  );
  assert.equal(weak.hasPassword, true);
  assert.equal(weak.csrf, false);
  assert.equal(weak.weakAutocomplete, true);

  // pas de champ mot de passe → rien à signaler
  assert.equal(analyzeForms(`<form><input type="text"></form>`).hasPassword, false);
});

test("safeInternalPath bloque les redirections externes", () => {
  // chemins internes légitimes
  assert.equal(safeInternalPath("/dashboard/team"), "/dashboard/team");
  assert.equal(safeInternalPath("/dashboard?tab=domains"), "/dashboard?tab=domains");

  // hors du site → repli
  assert.equal(safeInternalPath("https://evil.tld"), "/dashboard");
  assert.equal(safeInternalPath("//evil.tld"), "/dashboard");
  assert.equal(safeInternalPath("/\\evil.tld"), "/dashboard");
  assert.equal(safeInternalPath("/ok\\evil.tld"), "/dashboard");
  assert.equal(safeInternalPath("javascript:alert(1)"), "/dashboard");
  assert.equal(safeInternalPath(null), "/dashboard");
  assert.equal(safeInternalPath(""), "/dashboard");
});

test("formatDate / formatDateTime — fuseau figé Europe/Paris", () => {
  // 2026-01-15T10:30:00Z → 11:30 heure de Paris (UTC+1 en hiver).
  const iso = "2026-01-15T10:30:00Z";
  assert.equal(formatDate(iso), "15/01/2026");
  assert.equal(formatDateTime(iso), "15/01/2026 11:30");
  // Le format ne doit pas dépendre du fuseau de la machine.
  assert.equal(formatDate(new Date(iso)), "15/01/2026");
});

test("getPlaybook — id connu, inconnu, vide", () => {
  const pb = getPlaybook("web-owasp");
  assert.ok(pb);
  assert.equal(pb?.id, "web-owasp");
  assert.ok(pb?.mode === "standard" || pb?.mode === "deep");
  assert.equal(getPlaybook("inexistant"), null);
  assert.equal(getPlaybook(null), null);
  assert.equal(getPlaybook(undefined), null);
  // Tous les playbooks ont un id unique et un mode valide.
  const ids = new Set(PLAYBOOKS.map((p) => p.id));
  assert.equal(ids.size, PLAYBOOKS.length);
  for (const p of PLAYBOOKS) assert.ok(p.mode === "standard" || p.mode === "deep");
});

test("engineEventType — sélection du workflow runner", () => {
  assert.equal(engineEventType("oss"), "oss-scan");
  assert.equal(engineEventType("strix"), "strix-scan");
  assert.equal(engineEventType(undefined), "strix-scan");
});

test("secretbox : chiffrement des secrets d'intégration", async () => {
  const { seal, open, isEncrypted, hint } = await import("../lib/secretbox");
  const url = "https://hooks.slack.com/services/T000/B000/abcdEFGH1234";
  const sealed = seal(url);
  assert.ok(sealed && isEncrypted(sealed));
  assert.ok(!sealed.includes("hooks.slack.com"));
  assert.notEqual(seal(url), sealed); // IV aléatoire
  assert.equal(open(sealed), url);
  assert.equal(seal(sealed), sealed); // pas de double chiffrement
  assert.equal(open("valeur-historique-en-clair"), "valeur-historique-en-clair");
  assert.equal(seal(""), null);
  assert.equal(open(null), null);
  const tampered = sealed.slice(0, -4) + (sealed.endsWith("AAAA") ? "BBBB" : "AAAA");
  assert.equal(open(tampered), null); // GCM : falsification détectée
  assert.equal(hint(url), "hooks.slack.com/…1234");
  assert.equal(hint("lin_api_secret9876"), "…9876");
});

test("invitations : seul le hash du jeton est stocké", async () => {
  const { hashInviteToken } = await import("../lib/invitations");
  const h = hashInviteToken("jeton-test");
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.equal(h, hashInviteToken("jeton-test"));
  assert.notEqual(h, hashInviteToken("jeton-test2"));
});

test("authtokens : hash stable et distinct par jeton", async () => {
  const { hashAuthToken, TOKEN_TTL_MINUTES } = await import("../lib/authtokens");
  assert.match(hashAuthToken("t"), /^[0-9a-f]{64}$/);
  assert.notEqual(hashAuthToken("t"), hashAuthToken("t2"));
  assert.equal(TOKEN_TTL_MINUTES.reset, 30);
});

test("pentestEmailBlock : pas de blocage si l'envoi d'e-mails est désactivé", async () => {
  const { pentestEmailBlock } = await import("../lib/emailgate");
  // RESEND_API_KEY absente en test → jamais bloquant (sinon comptes neufs bloqués à vie).
  assert.equal(await pentestEmailBlock("00000000-0000-0000-0000-000000000000"), null);
});

test("plans : quotas par offre", async () => {
  const { quotaError, budgetError, PLANS } = await import("../lib/plans");
  const u = { passiveScans: 30, domains: 1, pentests: 0, members: 1, schedules: 0, aiBudgetUsd: 0 };
  assert.ok(quotaError("free", "passiveScans", u)); // 30/30 atteint
  assert.equal(quotaError("free", "passiveScans", { ...u, passiveScans: 29 }), null);
  assert.match(quotaError("free", "pentests", u) || "", /offre Plateforme/); // pas de pentest en gratuit
  assert.equal(quotaError("free", "members", u), null);
  assert.equal(quotaError("platform", "passiveScans", { ...u, passiveScans: 99999 }), null); // illimité
  assert.equal(quotaError("platform", "pentests", { ...u, pentests: 19 }), null);
  assert.ok(quotaError("platform", "pentests", { ...u, pentests: 20 }));
  assert.ok(budgetError("platform", { ...u, aiBudgetUsd: 30 }));
  assert.equal(budgetError("platform", { ...u, aiBudgetUsd: 29.99 }), null);
  assert.equal(budgetError("enterprise", { ...u, aiBudgetUsd: 1e6 }), null);
  assert.equal(PLANS.free.limits.pentests, 0);
});

test("stripe : signature de webhook et offre du prix", async () => {
  const { createHmac } = await import("node:crypto");
  const { verifyStripeSignature, planFromPrice } = await import("../lib/stripe");
  const secret = "whsec_test";
  const payload = '{"type":"x"}';
  const now = 1_800_000_000;
  const sig = (t: number, p = payload, s = secret) =>
    `t=${t},v1=${createHmac("sha256", s).update(`${t}.${p}`).digest("hex")}`;
  assert.equal(verifyStripeSignature(payload, sig(now), secret, now), true);
  assert.equal(verifyStripeSignature(payload + " ", sig(now), secret, now), false); // corps modifié
  assert.equal(verifyStripeSignature(payload, sig(now, payload, "autre"), secret, now), false);
  assert.equal(verifyStripeSignature(payload, sig(now - 301), secret, now), false); // rejeu tardif
  assert.equal(verifyStripeSignature(payload, null, secret, now), false);
  assert.equal(verifyStripeSignature(payload, "t=abc,v1=00", secret, now), false);
  assert.equal(planFromPrice({ id: "price_x" }), "platform");
  assert.equal(planFromPrice({ id: "price_x", metadata: { sentinel_plan: "enterprise" } }), "enterprise");
  assert.equal(planFromPrice({ id: "price_x", metadata: { sentinel_plan: "free" } }), "platform");
});

test("wafdetect : WAF et CAPTCHA détectés sur en-têtes et corps", async () => {
  const { detectWafCaptcha } = await import("../lib/wafdetect");
  const h = new Headers({ "cf-ray": "abc123", server: "cloudflare" });
  const wafOnly = detectWafCaptcha(h, [], "<html>ok</html>");
  assert.equal(wafOnly.length, 1);
  assert.match(wafOnly[0].title, /Cloudflare/);
  assert.equal(wafOnly[0].severity, "info");

  const body = '<div class="g-recaptcha"></div><script src="https://www.google.com/recaptcha/api.js"></script>';
  const captcha = detectWafCaptcha(new Headers(), [], body);
  assert.equal(captcha.length, 1);
  assert.match(captcha[0].title, /reCAPTCHA/);

  assert.equal(detectWafCaptcha(new Headers(), [], "<html>rien</html>").length, 0);
});

test("findingsFormat : dédup, CSV et JUnit", async () => {
  const { dedupeFindings, findingsToCsv, findingsToJUnit } = await import("../lib/findingsFormat");
  const raw = [
    { id: "a", title: "Injection SQL", severity: "critical" },
    { id: "b", title: "injection sql", severity: "critical" },
    { id: "c", title: "Cookie sans SameSite", severity: "low" },
  ];
  const deduped = dedupeFindings(raw);
  assert.equal(deduped.length, 2);
  assert.equal(deduped[0].occurrences, 2); // les deux « injection SQL » fusionnent
  assert.equal(deduped[0].severity, "critical"); // tri par gravité

  const csv = findingsToCsv(deduped);
  assert.ok(csv.startsWith("﻿")); // BOM Excel
  assert.match(csv, /Injection SQL/);

  const xml = findingsToJUnit("Suite", "exemple.fr", deduped);
  assert.match(xml, /<testsuite name="Suite"/);
  assert.match(xml, /failures="1"/); // seul le critique est un échec
  assert.match(xml, /<failure message="Injection SQL">/);
});

test("scanDiff : nouveaux, corrigés, inchangés", async () => {
  const { diffFindings } = await import("../lib/scanDiff");
  const f = (id: string, state: string) => ({ id, title: id, severity: "medium", state });
  const d = diffFindings(
    [f("csp", "fail"), f("hsts", "warn"), f("https", "pass")],
    [f("csp", "fail"), f("hsts", "pass"), f("cors", "fail"), f("waf", "info")]
  );
  assert.deepEqual(d.added.map((x) => x.id), ["cors"]);
  assert.deepEqual(d.fixed.map((x) => x.id), ["hsts"]);
  assert.deepEqual(d.persisting.map((x) => x.id), ["csp"]);
});

test("compliance : correspondances et synthèse", async () => {
  const { controlsFor, controlsLabel, complianceSummary } = await import("../lib/compliance");
  assert.equal(controlsLabel(controlsFor("csp")), "PCI 6.2.4, 6.4.3 · ISO A.8.26 · SOC2 CC6.6");
  assert.deepEqual(controlsFor("inconnu", "TLS").pci, ["4.2.1"]); // repli par catégorie
  assert.deepEqual(controlsFor("inconnu", "Autre"), {});
  const rows = complianceSummary([
    { id: "csp", failing: true },
    { id: "xfo", failing: true },
    { id: "https", failing: false },
  ]);
  const pci624 = rows.find((r) => r.framework === "pci" && r.control === "6.2.4");
  assert.equal(pci624?.failing, 2);
  assert.ok(!rows.some((r) => r.control === "4.2.1")); // https n'est pas en échec
});

test("jssurface : secrets détectés, masqués, bruit ignoré", async () => {
  const { scanSecrets } = await import("../lib/jssurface");
  const aws = "AKIA" + "ABCDEFGHIJKLMNOP";
  const hits = scanSecrets(`const k="${aws}"; const g="${"gh" + "p_" + "a".repeat(36)}";`, "/app.js");
  assert.equal(hits.length, 2);
  assert.ok(hits.every((h) => !h.redacted.includes(aws) && h.redacted.includes("…")));
  assert.equal(hits[0].severity, "critical");
  // Gabarits de documentation et références d'environnement : ignorés
  assert.equal(scanSecrets(`key="${"AK" + "IAXXXXEXAMPLE12345"}"`, "/").length, 0);
  assert.equal(scanSecrets(`access_token: process.env.TOKEN_VALUE_0123456789`, "/").length, 0);
});

test("jssurface : extraction d'endpoints et classement", async () => {
  const { mineEndpoints, classifyItem, buildSurface } = await import("../lib/jssurface");
  const eps = mineEndpoints(`fetch("/api/v1/users/me");x='/graphql';y="/logo.png";z="/_next/data/abc123/fr/page.json"`);
  assert.ok(eps.includes("/api/v1/users/me"));
  assert.ok(eps.includes("/graphql"));
  assert.ok(eps.some((e) => e.startsWith("/_next/data/…")));
  assert.ok(classifyItem("/login", "next").includes("open-redirect"));
  assert.ok(classifyItem("/search", "q").includes("sqli"));
  assert.ok(classifyItem("/graphql").includes("graphql"));
  const html = `<form action="/recherche"><input name="q"><input type="hidden" name="csrf"></form>
    <a href="https://tiers.example.net/x?url=1">t</a><a href="/doc?file=a&utm_source=x">d</a>`;
  const s = buildSurface(html, [], "https://site.fr");
  assert.ok(s.some((i) => i.path === "/recherche" && i.param === "q"));
  assert.ok(s.some((i) => i.path === "/doc" && i.param === "file" && i.classes.includes("lfi")));
  assert.ok(!s.some((i) => i.param === "csrf" || i.param === "utm_source" || i.param === "url"));
});

test("surface : consigne de ciblage Strix", async () => {
  const { surfaceInstruction } = await import("../lib/surface");
  assert.equal(surfaceInstruction([{ path: "/a", source: "js", classes: ["info-leak"] }]), null);
  const txt = surfaceInstruction([{ path: "/api/x", param: "id", method: "GET", source: "lien", classes: ["idor"] }]);
  assert.ok(txt && txt.includes("/api/x") && txt.includes("« id »"));
});

test("scopeAudit : hôtes hors périmètre, OOB et documentation", async () => {
  const { auditScope } = await import("../lib/scopeAudit");
  const r = auditScope(
    {
      poc_script_code:
        "requests.get('https://api.site.fr/x'); requests.get('https://victime-tierce.com/y')\n" +
        "# callback http://abc.oast.fun  ref https://owasp.org/x  http://127.0.0.1:8080",
      endpoint: "https://site.fr/login",
    },
    "https://www.site.fr/"
  );
  assert.deepEqual(r.outOfScope, ["victime-tierce.com"]);
  assert.deepEqual(r.oob, ["abc.oast.fun"]);
  assert.deepEqual(auditScope(null, "https://site.fr").outOfScope, []);
});

test("triage : grille en 7 questions", async () => {
  const { triageVerdict, parseTriage, TRIAGE_QUESTIONS } = await import("../lib/triage");
  assert.equal(TRIAGE_QUESTIONS.length, 7);
  assert.equal(triageVerdict(null).kind, "pending");
  assert.deepEqual(triageVerdict([true, true, false, null, null, null, null]), { kind: "reject", failedAt: 2 });
  assert.equal(triageVerdict(Array(7).fill(true)).kind, "valid");
  assert.equal(parseTriage([true]), null);
  assert.equal(parseTriage(Array(7).fill("oui")), null);
  assert.ok(parseTriage(Array(7).fill(null)));
});

test("validation et couverture", async () => {
  const { validationOf } = await import("../lib/validation");
  assert.equal(validationOf({}), null);
  assert.equal(validationOf({ _sentinel_validation: { verdict: "bof" } }), null);
  assert.deepEqual(validationOf({ _sentinel_validation: { verdict: "doubtful", severity: "LOW", reason: "r" } }), {
    verdict: "doubtful",
    severity: "low",
    reason: "r",
  });
  const { buildCoverage } = await import("../lib/coverage");
  const cov = buildCoverage(
    [
      { path: "/api/users", param: "id", source: "lien", classes: ["idor", "sqli"] },
      { path: "/apikeys", source: "js", classes: ["info-leak"] },
    ],
    [
      { title: "IDOR sur les profils", payload: { endpoint: "https://site.fr/api/users/42" } },
      { title: "SQL injection", payload: { endpoint: "/api/users" }, status: "false_positive" },
    ]
  );
  assert.equal(cov.points, 2);
  assert.equal(cov.pairs, 3);
  assert.equal(cov.pairsWithFinding, 1); // faux positif exclu, /apikeys ne correspond pas à /api
});

test("compliance : secrets JS rattachés", async () => {
  const { controlsFor } = await import("../lib/compliance");
  assert.deepEqual(controlsFor("js-secret-cle-d-acces-aws", "Divulgation").pci, ["8.6.2", "3.6.1"]);
});

test("CI/CD : le workflow proposé aux clients ne demande aucune clé", async () => {
  const { readFileSync } = await import("node:fs");
  const panel = readFileSync("components/dashboard/CicdPanel.tsx", "utf8");
  assert.ok(!/secrets\.|API_KEY|gemini/i.test(panel));
});

test("choisirMoteur : open source par défaut, Strix seulement si demandé et actif", async () => {
  const { choisirMoteur } = await import("../lib/github");
  const avant = process.env.MOTEUR_IA;
  delete process.env.MOTEUR_IA;
  assert.equal(choisirMoteur("strix"), "oss");
  assert.equal(choisirMoteur(undefined), "oss");
  process.env.MOTEUR_IA = "1";
  assert.equal(choisirMoteur("strix"), "strix");
  assert.equal(choisirMoteur("oss"), "oss");
  if (avant === undefined) delete process.env.MOTEUR_IA;
  else process.env.MOTEUR_IA = avant;
});

test("dureeConservationJours : 5 ans par défaut, variable prise en compte", async () => {
  const { dureeConservationJours } = await import("../lib/rapports");
  const avant = process.env.RAPPORTS_CONSERVATION_JOURS;
  delete process.env.RAPPORTS_CONSERVATION_JOURS;
  assert.equal(dureeConservationJours(), 1825);
  process.env.RAPPORTS_CONSERVATION_JOURS = "90";
  assert.equal(dureeConservationJours(), 90);
  if (avant === undefined) delete process.env.RAPPORTS_CONSERVATION_JOURS;
  else process.env.RAPPORTS_CONSERVATION_JOURS = avant;
});
