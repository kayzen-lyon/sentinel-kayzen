import { test } from "node:test";
import assert from "node:assert/strict";
import { validateEmail, validatePassword } from "../lib/password";
import { validateTargetUrl } from "../lib/ssrf";
import { normalizeDomain, registrableDomain } from "../lib/domains";
import { parseBanners } from "../lib/cve";
import { analyzeForms } from "../lib/recon";

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

test("registrableDomain", () => {
  assert.equal(registrableDomain("app.exemple.fr"), "exemple.fr");
  assert.equal(registrableDomain("www.exemple.fr"), "exemple.fr");
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
