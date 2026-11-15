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
