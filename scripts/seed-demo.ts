/**
 * Jeu de DÉMONSTRATION pour la base locale (scripts/dev-db.mjs) : un compte, des scans,
 * un pentest et une surveillance, sur le domaine réservé « demo.sentinel.test »
 * (le TLD .test n'existe pas sur Internet : aucune cible réelle).
 *
 *   DATABASE_URL=postgres://postgres@localhost:54339/postgres npx tsx scripts/seed-demo.ts
 *
 * Identifiants de démo (base locale uniquement, jamais en production) :
 *   demo@sentinel.test / Demo-Sentinel-2026
 * Refuse de tourner si DATABASE_URL ne désigne pas une base locale.
 */
import { query, ensureSchema } from "../lib/db";
import { hashPassword } from "../lib/password";
import { createUser, findUserByEmail } from "../lib/users";
import { ensurePersonalOrg } from "../lib/orgs";

export const DEMO_EMAIL = "demo@sentinel.test";
export const DEMO_PASSWORD = "Demo-Sentinel-2026";
const TARGET = "https://demo.sentinel.test";

const url = process.env.DATABASE_URL || "";
if (!/@(127\.0\.0\.1|localhost)[:/]/.test(url)) {
  console.error("Refus : le jeu de démo ne s'installe que sur une base locale.");
  process.exit(1);
}

type Sev = "critical" | "high" | "medium" | "low" | "info";
function finding(id: string, title: string, severity: Sev, state: "pass" | "fail" | "warn", category: string) {
  return {
    id,
    category,
    title,
    severity,
    state,
    detail: `[Démo] ${title}.`,
    recommendation: state === "pass" ? undefined : "[Démo] Correctif à appliquer.",
    owasp: "A05:2021",
    effort: "rapide",
  };
}

async function main() {
  await ensureSchema();
  let user = await findUserByEmail(DEMO_EMAIL);
  if (!user) user = await createUser(DEMO_EMAIL, await hashPassword(DEMO_PASSWORD), "Compte démo");
  await query(`UPDATE users SET email_verified_at=now() WHERE id=$1`, [user.id]);
  const orgId = await ensurePersonalOrg(user.id, "Démo");

  const existing = await query<{ n: string }>(`SELECT count(*)::text n FROM scans WHERE user_id=$1`, [user.id]);
  if (Number(existing[0].n) > 0) {
    console.log("Jeu de démo déjà présent.");
    return;
  }

  // Domaine vérifié (autorisation de scan).
  await query(
    `INSERT INTO verified_domains (user_id, org_id, domain, token, method, verified_at)
     VALUES ($1,$2,'demo.sentinel.test','demo-token','dns',now()) ON CONFLICT DO NOTHING`,
    [user.id, orgId]
  );

  // Autorisation écrite fictive (document de démonstration), valable un an autour d'aujourd'hui.
  await query(
    `INSERT INTO autorisations_test (org_id, client, perimetre, debut, fin, document_nom, document_type, document_sha256, document, created_by)
     VALUES ($1,'Client de démonstration',ARRAY['demo.sentinel.test'], current_date - 180, current_date + 180,
             'autorisation-demo.pdf','application/pdf', encode(sha256('demo'::bytea),'hex'), 'demo'::bytea, $2)`,
    [orgId, user.id]
  );

  const scores = [58, 64, 71, 77, 83];
  for (let i = 0; i < scores.length; i++) {
    const findings = [
      finding("hsts", "En-tête Strict-Transport-Security", "high", i > 2 ? "pass" : "fail", "En-têtes"),
      finding("csp", "Content-Security-Policy", "medium", i > 3 ? "pass" : "fail", "En-têtes"),
      finding("tls", "Protocoles TLS", "critical", i > 0 ? "pass" : "fail", "TLS"),
      finding("cookies", "Attributs des cookies", "low", "warn", "Cookies"),
      finding("server", "Bannière serveur", "info", "pass", "Exposition"),
    ];
    const counts: Record<Sev, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    for (const f of findings) if (f.state !== "pass") counts[f.severity]++;
    const summary = {
      finalUrl: TARGET + "/",
      httpStatus: 200,
      https: true,
      server: "demo",
      responseTimeMs: 180 + i * 10,
      counts,
      passed: findings.filter((f) => f.state === "pass").length,
      total: findings.length,
    };
    const grade = scores[i] >= 80 ? "B" : scores[i] >= 70 ? "C" : "D";
    await query(
      `INSERT INTO scans (user_id, org_id, target_url, final_url, status, grade, score, summary, findings, created_at, completed_at)
       VALUES ($1,$2,$3,$4,'done',$5,$6,$7,$8, now() - ($9 || ' days')::interval, now() - ($9 || ' days')::interval)`,
      [user.id, orgId, TARGET, TARGET + "/", grade, scores[i], JSON.stringify(summary), JSON.stringify(findings), String((scores.length - i) * 2)]
    );
  }

  const job = await query<{ id: string }>(
    `INSERT INTO jobs (user_id, org_id, target_url, mode, status, report_md, created_at, started_at, completed_at)
     VALUES ($1,$2,$3,'standard','done','# Rapport de démonstration', now() - interval '1 day', now() - interval '1 day', now() - interval '20 hours')
     RETURNING id`,
    [user.id, orgId, TARGET]
  );
  const vulns: [string, string, number][] = [
    ["Injection SQL sur /api/recherche (démo)", "critical", 9.1],
    ["XSS réfléchie sur /profil (démo)", "high", 7.4],
    ["Absence de limitation de débit (démo)", "medium", 5.3],
  ];
  for (const [i, [title, severity, cvss]] of vulns.entries()) {
    await query(
      `INSERT INTO job_findings (job_id, native_id, title, severity, cvss, payload)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [job[0].id, `demo-${i}`, title, severity, cvss, JSON.stringify({ description: "[Démo] Constat fictif." })]
    );
  }

  await query(
    `INSERT INTO scheduled_scans (user_id, org_id, target_url, frequency, last_run_at, last_score)
     VALUES ($1,$2,$3,'daily', now() - interval '1 day', 83)`,
    [user.id, orgId, TARGET]
  );
  console.log(`Jeu de démo installé : ${DEMO_EMAIL}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
