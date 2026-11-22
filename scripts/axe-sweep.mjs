#!/usr/bin/env node
/**
 * Balayage d'accessibilité automatique : Playwright (Chromium) + axe-core.
 *
 * - connexion avec le compte de démo (scripts/seed-demo.ts) ;
 * - chaque route du tableau de bord, puis l'accueil, les pages légales, la connexion
 *   et l'inscription, chacune dans un contexte NEUF par thème : clair, sombre, OLED ;
 * - survol du premier graphique de la page (infobulle comprise dans l'analyse) ;
 * - erreurs de la console relevées.
 *
 *   BASE_URL=http://localhost:3217 node scripts/axe-sweep.mjs [--json sortie.json]
 *
 * Règles : WCAG 2.0/2.1/2.2 A et AA. Un résultat vide NE VAUT PAS certificat : le contrôle
 * automatique ne détecte qu'une partie des défauts et ne remplace pas un test humain.
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const AXE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const BASE = process.env.BASE_URL || "http://localhost:3217";
const EMAIL = process.env.DEMO_EMAIL || "demo@sentinel.test";
const PASSWORD = process.env.DEMO_PASSWORD || "Demo-Sentinel-2026";
const outIdx = process.argv.indexOf("--json");
const OUT = outIdx > 0 ? process.argv[outIdx + 1] : null;

const DASHBOARD = [
  "/dashboard",
  "/dashboard/scan",
  "/dashboard/pentest",
  "/dashboard/monitoring",
  "/dashboard/domaines",
  "/dashboard/cicd",
  "/dashboard/integrations",
  "/dashboard/team",
  "/dashboard/abonnement",
  "/dashboard/account",
];
const PUBLIC = [
  "/",
  "/mentions-legales",
  "/cgu",
  "/cgv",
  "/confidentialite",
  "/accessibilite",
  "/retractation",
  "/login",
  "/signup",
];
const THEMES = {
  clair: { theme: "light", a11y: {} },
  sombre: { theme: "dark", a11y: {} },
  oled: { theme: "dark", a11y: { oled: true } },
};

const browser = await chromium.launch();
const results = [];
let total = 0;

async function newContext(themeName) {
  const t = THEMES[themeName];
  // bypassCSP : l'injection d'axe-core est un script en ligne que la CSP par nonce bloquerait.
  const ctx = await browser.newContext({ bypassCSP: true, viewport: { width: 1366, height: 900 } });
  await ctx.addInitScript(
    ([theme, a11y]) => {
      try {
        localStorage.setItem("theme", theme);
        localStorage.setItem("kayzen-a11y", JSON.stringify(a11y));
      } catch {}
    },
    [t.theme, t.a11y]
  );
  return ctx;
}

async function login(ctx) {
  const res = await ctx.request.post(`${BASE}/api/auth/login`, {
    data: { email: EMAIL, password: PASSWORD },
  });
  if (!res.ok()) throw new Error(`Connexion de démo refusée (${res.status()}) : lancez scripts/seed-demo.ts`);
}

async function extraRoutes(ctx) {
  // Rapport du premier pentest du compte de démo, s'il existe.
  const res = await ctx.request.get(`${BASE}/api/jobs`);
  if (!res.ok()) return [];
  const body = await res.json().catch(() => ({}));
  const jobs = body.jobs || body || [];
  const first = Array.isArray(jobs) ? jobs[0] : null;
  return first?.id ? [`/dashboard/pentest/${first.id}/report`] : [];
}

async function audit(page, path, themeName) {
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  // Survol du premier graphique : l'infobulle doit être lisible dans le thème.
  const chart = page.locator("[data-chart]").first();
  if (await chart.count()) {
    await chart.scrollIntoViewIfNeeded();
    const box = await chart.boundingBox();
    if (box) await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2);
    await page.waitForTimeout(150);
  }
  await page.addScriptTag({ content: AXE });
  const r = await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    const out = await axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
    });
    return out.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.slice(0, 5).map((n) => ({ target: n.target.join(" "), summary: n.failureSummary })),
      count: v.nodes.length,
    }));
  });
  const n = r.reduce((s, v) => s + v.count, 0);
  total += n;
  results.push({ path, theme: themeName, violations: r, nodes: n, consoleErrors: errors });
  const flag = n ? `✗ ${n}` : "✓";
  console.log(`${flag.padEnd(6)} ${themeName.padEnd(7)} ${path}${errors.length ? `  (console : ${errors.length} erreur·s)` : ""}`);
  for (const v of r) console.log(`         - ${v.id} (${v.count}) : ${v.nodes[0]?.target}`);
}

for (const themeName of Object.keys(THEMES)) {
  const ctx = await newContext(themeName);
  await login(ctx);
  const routes = [...DASHBOARD, ...(await extraRoutes(ctx))];
  for (const path of routes) {
    const page = await ctx.newPage();
    await audit(page, path, themeName);
    await page.close();
  }
  await ctx.close();
  // Pages publiques : contexte neuf, sans session.
  const pub = await newContext(themeName);
  for (const path of PUBLIC) {
    const page = await pub.newPage();
    await audit(page, path, themeName);
    await page.close();
  }
  await pub.close();
}

await browser.close();
const errs = results.reduce((s, r) => s + r.consoleErrors.length, 0);
console.log(`\nTotal : ${total} nœud·s en défaut, ${errs} erreur·s de console, ${results.length} pages × thèmes.`);
console.log("Contrôle automatique : ne remplace pas un test humain et ne vaut pas certificat.");
if (OUT) writeFileSync(OUT, JSON.stringify({ base: BASE, date: new Date().toISOString(), total, results }, null, 2));
process.exit(total || errs ? 1 : 0);
