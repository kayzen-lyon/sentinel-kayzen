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
