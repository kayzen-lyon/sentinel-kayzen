import { test } from "node:test";
import assert from "node:assert/strict";
import { MASK, maskSecret, redactDeep, redactSecrets } from "../lib/redact";
import {
  authorizationCovers,
  authorizationStatus,
  hostInScope,
  normalizeScopeHost,
  parseAuthorizationInput,
} from "../lib/authorizationScope";
import {
  exportFinding,
  exportJob,
  openProofs,
  openReport,
  presentFinding,
  sealProofs,
  sealReport,
  stripProofs,
  UNREADABLE_PROOF,
} from "../lib/proofs";
import { isEncrypted } from "../lib/secretbox";
import { parseRetentionDays } from "../lib/retention";

// --- redactSecrets : cas positifs ------------------------------------------------------------

test("redactSecrets : maskSecret garde 4 caractères", () => {
  assert.equal(maskSecret("AKIAIOSFODNN7EXAMPLE"), "AKIA" + MASK);
  assert.equal(maskSecret("court"), MASK);
  assert.equal(maskSecret("AKIA" + MASK), "AKIA" + MASK);
});

test("redactSecrets : clés AWS", () => {
  const out = redactSecrets("id=AKIAIOSFODNN7EXAMPLE et ASIAJEXAMPLEXEG2JICE");
  assert.ok(!out.includes("IOSFODNN7EXAMPLE"));
  assert.ok(out.includes("AKIA" + MASK));
  assert.ok(out.includes("ASIA" + MASK));
  const secret = redactSecrets("aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY");
  assert.ok(!secret.includes("wJalrXUtnFEMI/K7MDENG"));
  assert.ok(secret.includes("wJal" + MASK));
});

test("redactSecrets : jetons GitHub, Stripe, Slack", () => {
  const gh = "ghp_" + "a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8";
  const pat = "github_pat_" + "11ABCDEFG0123456789_abcdefghijklmnopqrstuvwxyz";
  const sk = "sk_live_" + "4eC39HqLyjWDarjtT1zdp7dc";
  const rk = "rk_test_" + "51H8xYzABCDEFGHIJKLMNOP";
  const wh = "whsec_" + "MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw";
  const slack = "xoxb-" + "123456789012-1234567890123-AbCdEfGhIjKlMnOpQrStUvWx";
  // Valeur factice construite à l'exécution : écrite d'un bloc, elle déclenche la protection
  // anti-secrets de GitHub au push.
  const hook = "https://hooks.slack.com/services/" + ["T00000000", "B00000000", "X".repeat(24)].join("/");
  const out = redactSecrets([gh, pat, sk, rk, wh, slack, hook].join("\n"));
  for (const s of [gh, pat, sk, rk, wh, slack]) assert.ok(!out.includes(s), s);
  assert.ok(out.includes("ghp_" + MASK));
  assert.ok(out.includes("sk_l" + MASK));
  assert.ok(out.includes("xoxb" + MASK));
  assert.ok(out.includes("https://hooks.slack.com/services/T000" + MASK));
});

test("redactSecrets : JWT", () => {
  const jwt =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4ifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
  const out = redactSecrets(`token: ${jwt} fin`);
  assert.equal(out, `token: eyJh${MASK} fin`);
});

test("redactSecrets : clé privée PEM (complète et tronquée)", () => {
  const pem =
    "avant\n-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0Z3VS5JJcds3xfn\nabcdEFGH\n-----END RSA PRIVATE KEY-----\naprès";
  const out = redactSecrets(pem);
  assert.ok(!out.includes("MIIEowIBAAKCAQEA0Z3VS5JJcds3xfn"));
  assert.ok(out.startsWith("avant\n-----BEGIN RSA PRIVATE KEY-----\n" + MASK));
  assert.ok(out.endsWith("après"));
  assert.equal(redactSecrets(out), out, "idempotent");
  const truncated = redactSecrets("-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASC");
  assert.ok(!truncated.includes("MIIEvQIBADANBgkqhkiG9w0BAQEFAASC"));
});

test("redactSecrets : mot de passe dans une URL et chaînes de connexion", () => {
  const out = redactSecrets("postgres://admin:S3cr3tPassw0rd@db.exemple.fr:5432/app");
  assert.equal(out, `postgres://admin:S3cr${MASK}@db.exemple.fr:5432/app`);
  assert.equal(redactSecrets("https://bob:pw@exemple.fr/"), `https://bob:${MASK}@exemple.fr/`);
  const ado = redactSecrets("Server=db;User Id=sa;Password=Sup3rS3cret!;Database=x");
  assert.ok(!ado.includes("Sup3rS3cret!"));
  assert.ok(ado.includes("Password=Sup3" + MASK + ";Database=x"));
  const q = redactSecrets("https://exemple.fr/login?user=bob&password=hunter2hunter2&x=1");
  assert.ok(!q.includes("hunter2hunter2"));
  assert.ok(q.endsWith("&x=1"));
});

test("redactSecrets : en-têtes Authorization et Cookie", () => {
  const req = [
    "GET /api/me HTTP/1.1",
    "Host: exemple.fr",
    "Authorization: Bearer abcdef0123456789abcdef",
    "Proxy-Authorization: Basic YWxhZGRpbjpvcGVuc2VzYW1l",
    "Cookie: session=0123456789abcdef; theme=dark; csrftoken=zzzzzzzzzzzzzzzz",
    "Set-Cookie: sid=9876543210fedcba; Path=/; HttpOnly",
    "X-Api-Key: k3y-0123456789",
  ].join("\n");
  const out = redactSecrets(req);
  assert.ok(out.includes("Authorization: Bearer abcd" + MASK));
  assert.ok(out.includes("Proxy-Authorization: Basic YWxh" + MASK));
  assert.ok(!out.includes("0123456789abcdef;"));
  assert.ok(out.includes("session=0123" + MASK));
  assert.ok(out.includes("theme=" + MASK));
  assert.ok(out.includes("Set-Cookie: sid=9876" + MASK + "; Path=/; HttpOnly"));
  assert.ok(out.includes("X-Api-Key: k3y-" + MASK));
  assert.ok(out.includes("Host: exemple.fr"));
  const json = redactSecrets('{"authorization": "Bearer abcdef0123456789", "cookie": "a=bcdefghijkl"}');
  assert.ok(!json.includes("abcdef0123456789"));
  assert.ok(!json.includes("bcdefghijkl"));
});

test("redactSecrets : idempotent et sans effet sur null/vide", () => {
  const once = redactSecrets("Authorization: Bearer abcdef0123456789 ghp_" + "x".repeat(36));
  assert.equal(redactSecrets(once), once);
  assert.equal(redactSecrets(null), null);
  assert.equal(redactSecrets(""), "");
});

// --- redactSecrets : faux positifs ---------------------------------------------------------

test("redactSecrets : faux positifs laissés intacts", () => {
  const benign = [
    "Le pentest a trouvé une injection SQL sur https://app.exemple.fr/login?next=/compte",
    "Contact : securite@exemple.fr — https://user@exemple.fr/ (sans mot de passe)",
    "AKIA seul, ou AKIA123 trop court, ou akiaiosfodnn7example en minuscules",
    "const password = getPassword(); // code",
    "L'en-tête Authorization: est absent de la réponse",
    "eyJhbGciOi seul n'est pas un JWT",
    "sk_live_court",
    "Le cookie de session n'a pas l'attribut Secure",
    "ghp_trop_court",
    "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA\n-----END PUBLIC KEY-----",
    "-----BEGIN CERTIFICATE-----\nMIIDdzCCAl+gAwIBAgIEAgAAuTANBgkqhkiG9w0BAQUFADBa\n-----END CERTIFICATE-----",
    "bypass=1&passage=ok",
  ];
  for (const t of benign) assert.equal(redactSecrets(t), t, t);
});

test("redactDeep : objets et tableaux, Date intacte", () => {
  const d = new Date("2026-01-01T00:00:00Z");
  const out = redactDeep({ a: ["Authorization: Bearer abcdef0123456789"], n: 3, d, nul: null });
  assert.equal(out.a[0], "Authorization: Bearer abcd" + MASK);
  assert.equal(out.n, 3);
  assert.equal(out.d, d);
  assert.equal(out.nul, null);
});

// --- Couverture d'autorisation (pure) --------------------------------------------------------

const NOW = new Date("2026-06-15T12:00:00Z");
const base = {
  host: "exemple.fr",
  include_subdomains: false,
  starts_at: "2026-06-01T00:00:00Z",
  ends_at: "2026-07-01T00:00:00Z",
  revoked_at: null,
};

test("autorisation : hôte exact", () => {
  assert.equal(authorizationCovers(base, "exemple.fr", NOW), true);
  assert.equal(authorizationCovers(base, "EXEMPLE.fr.", NOW), true);
  assert.equal(authorizationCovers(base, "www.exemple.fr", NOW), false, "www n'est pas implicite");
  assert.equal(authorizationCovers(base, "api.exemple.fr", NOW), false);
  assert.equal(authorizationCovers(base, "autre.fr", NOW), false);
});

test("autorisation : sous-domaines", () => {
  const sub = { ...base, include_subdomains: true };
  assert.equal(authorizationCovers(sub, "exemple.fr", NOW), true);
  assert.equal(authorizationCovers(sub, "api.exemple.fr", NOW), true);
  assert.equal(authorizationCovers(sub, "a.b.exemple.fr", NOW), true);
  assert.equal(authorizationCovers(sub, "monexemple.fr", NOW), false, "suffixe sans point");
  assert.equal(authorizationCovers(sub, "exemple.fr.evil.com", NOW), false);
  assert.equal(hostInScope("api.exemple.fr", true, "exemple.fr"), false, "le parent n'est pas couvert");
});

test("autorisation : dates et révocation", () => {
  assert.equal(authorizationCovers(base, "exemple.fr", new Date("2026-05-31T23:59:59Z")), false);
  assert.equal(authorizationCovers(base, "exemple.fr", new Date("2026-06-01T00:00:00Z")), true);
  assert.equal(authorizationCovers(base, "exemple.fr", new Date("2026-07-01T00:00:00Z")), false, "fin exclue");
  assert.equal(authorizationStatus(base, new Date("2026-05-01T00:00:00Z")), "upcoming");
  assert.equal(authorizationStatus(base, new Date("2026-08-01T00:00:00Z")), "expired");
  const revoked = { ...base, revoked_at: "2026-06-10T00:00:00Z" };
  assert.equal(authorizationStatus(revoked, NOW), "revoked");
  assert.equal(authorizationCovers(revoked, "exemple.fr", NOW), false);
});

test("autorisation : normalisation et validation de la saisie", () => {
  assert.deepEqual(normalizeScopeHost("https://App.Exemple.fr:8443/x?y"), { host: "app.exemple.fr", wildcard: false });
  assert.deepEqual(normalizeScopeHost("*.exemple.fr"), { host: "exemple.fr", wildcard: true });
  assert.equal(normalizeScopeHost("pas un hôte"), null);
  assert.equal(normalizeScopeHost("localhost"), null);
  const good = {
    host: "*.exemple.fr",
    startsAt: "2026-06-01T00:00:00Z",
    endsAt: "2026-07-01T00:00:00Z",
    signerName: "Alice Martin",
    signerTitle: "DSI",
    acceptedAt: "2026-05-20T10:00:00Z",
  };
  const ok = parseAuthorizationInput(good, NOW);
  assert.ok(ok.ok);
  if (ok.ok) {
    assert.equal(ok.value.host, "exemple.fr");
    assert.equal(ok.value.includeSubdomains, true);
  }
  assert.equal(parseAuthorizationInput({ ...good, endsAt: "2026-05-01T00:00:00Z" }, NOW).ok, false);
  assert.equal(parseAuthorizationInput({ ...good, startsAt: "2026-01-01T00:00:00Z", endsAt: "2026-02-01T00:00:00Z" }, NOW).ok, false, "expirée");
  assert.equal(parseAuthorizationInput({ ...good, signerTitle: " " }, NOW).ok, false);
  assert.equal(parseAuthorizationInput({ ...good, acceptedAt: "2027-01-01T00:00:00Z" }, NOW).ok, false, "acceptation future");
  assert.equal(parseAuthorizationInput({ ...good, acceptedAt: "" }, NOW).ok, false);
});

// --- Preuves chiffrées au repos --------------------------------------------------------------

const payload = {
  title: "SQLi",
  description: "Injection SQL sur /login",
  endpoint: "/login",
  poc_script_code: "curl -H 'Authorization: Bearer abcdef0123456789' https://exemple.fr/login",
  technical_analysis: "Réponse 500 avec trace",
  evidence: { request: "POST /login", status: 500 },
};

test("preuves : aller-retour chiffrement / déchiffrement", () => {
  const sealed = sealProofs(payload) as Record<string, unknown>;
  assert.ok(isEncrypted(sealed.poc_script_code as string));
  assert.ok(isEncrypted(sealed.technical_analysis as string));
  assert.ok(isEncrypted(sealed.evidence as string));
  assert.equal(sealed.description, payload.description, "champ hors preuve en clair");
  assert.ok(!JSON.stringify(sealed).includes("abcdef0123456789"));
  const opened = openProofs(sealed) as Record<string, unknown>;
  assert.equal(opened.poc_script_code, payload.poc_script_code);
  assert.equal(opened.technical_analysis, payload.technical_analysis);
  assert.deepEqual(JSON.parse(opened.evidence as string), payload.evidence);
  // Rechiffrer un payload déjà chiffré ne double pas le chiffrement.
  assert.equal(
    (openProofs(sealProofs(sealed)) as Record<string, unknown>).poc_script_code,
    payload.poc_script_code
  );
});

test("preuves : lecture tolérante (clair historique, valeur illisible, non-objet)", () => {
  assert.deepEqual(openProofs(payload), payload, "payload historique en clair lu tel quel");
  const broken = openProofs({ poc_description: "enc:v1:AAAA" }) as Record<string, unknown>;
  assert.equal(broken.poc_description, UNREADABLE_PROOF);
  assert.equal(openProofs(null), null);
  assert.deepEqual(openProofs(["x"]), ["x"]);
  assert.equal(openReport("# Rapport en clair"), "# Rapport en clair");
  assert.equal(openReport(null), null);
  const r = sealReport("# Rapport\nPoC : ghp_" + "y".repeat(36));
  assert.ok(isEncrypted(r));
  assert.equal(openReport(r), "# Rapport\nPoC : ghp_" + "y".repeat(36));
  assert.equal(sealReport(""), null);
});

test("preuves : présentation (déchiffrée, masquée) et export (sans preuve)", () => {
  const f = { title: "Jeton ghp_" + "z".repeat(36), payload: sealProofs(payload) };
  const shown = presentFinding(f).payload as Record<string, unknown>;
  assert.equal(
    shown.poc_script_code,
    `curl -H 'Authorization: Bearer abcd${MASK}' https://exemple.fr/login`
  );
  assert.ok(!presentFinding(f).title?.includes("z".repeat(36)));
  const exported = exportFinding(f).payload as Record<string, unknown>;
  for (const k of ["poc_script_code", "technical_analysis", "evidence", "poc_description"])
    assert.equal(k in exported, false, k);
  assert.equal(exported.description, payload.description);
  assert.deepEqual(Object.keys(stripProofs(payload) as object).sort(), ["description", "endpoint", "title"]);
  const job = exportJob({ report_md: sealReport("rapport"), error: null, agents_graph: null });
  assert.equal(job.report_md, null, "jamais de rapport dans un export");
});

test("conservation : pas de valeur par défaut, bornes", () => {
  assert.deepEqual(parseRetentionDays(null), { ok: true, value: null });
  assert.deepEqual(parseRetentionDays(""), { ok: true, value: null });
  assert.deepEqual(parseRetentionDays("90"), { ok: true, value: 90 });
  assert.equal(parseRetentionDays(0).ok, false);
  assert.equal(parseRetentionDays(1.5).ok, false);
  assert.equal(parseRetentionDays("abc").ok, false);
  assert.equal(parseRetentionDays(99999).ok, false);
});
