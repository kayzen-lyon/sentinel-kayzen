# Sentinel by Kayzen — Roadmap d'implémentation (niveau ticket)

> Version affinée après cartographie technique du moteur Strix, des coutures du SaaS et des
> sources de données. Chaque ticket porte : fichiers touchés, dépendances, critères
> d'acceptation, effort. Voir [AUDIT-ET-AMELIORATIONS.md](AUDIT-ET-AMELIORATIONS.md) pour le « pourquoi ».

## Faits techniques établis (contraintes qui structurent tout)

1. **Strix se pilote en headless** : `strix -n -t <cible> -m <quick|standard|deep>`
   (entrypoint `strix.interface.main:main`). Sortie dans `strix_runs/<run>/` :
   `vulnerabilities.json` (findings, réécrit atomiquement à chaque trouvaille), `run.json`
   (statut + coût), `findings.sarif`, `penetration_test_report.md`, `.state/agents.json`
   (graphe d'agents live). **Pas de bus SSE natif** → on *tail* ces fichiers. Codes de
   sortie : `0` propre, `2` vulnérabilités trouvées, `1` erreur infra. Strix a besoin du
   **socket Docker** (il lance un conteneur sandbox par run).
2. **Vercel plafonne à 60 s/requête** (`maxDuration` sur `app/api/scan/route.ts:11`). Un vrai
   run Strix dure des **minutes à heures** → il **ne peut pas** tourner dans une route
   serverless. Il faut un **worker externe toujours actif**. Postgres est le point de
   handoff (table `jobs` + append de findings).
3. **La couture d'async** est exactement `await runScan(...)` à `app/api/scan/route.ts:64` :
   remplacer par « enfile un job, renvoie `{jobId}} ` ».
4. **Le verrou légal existe déjà** : `isHostVerified(userId, host)` (`lib/domains.ts:119`).
   Tout run offensif DOIT passer par là (déjà appelé à `route.ts:49`).
5. **Les enrichissements passifs (Vague 2) tiennent dans la route Vercel actuelle** (crt.sh,
   CVE via OSV/NVD, détection admin, analyse de formulaires) — **sans worker**. Seuls les
   screenshots nécessitent le worker ou `@sparticuz/chromium`.

---

## ARCHITECTURE RETENUE (décision 2026-08-09) — 100 % gratuit, aucun Docker local

Contrainte utilisateur : tout gratuit, aucun service payant, aucun service local. Un seul
projet Supabase disponible. **Montage retenu :**

- **Déclencheur** : Vercel (gratuit) → `repository_dispatch`/`workflow_dispatch` vers un dépôt GitHub.
- **Moteur** : **GitHub Actions** exécute `strix -n -t <cible> -m <mode>` dans un runner Docker
  **éphémère** — gratuit (illimité en dépôt public, 2000 min/mois en privé). Strix documente
  déjà cette intégration. → Pas de Docker sur le PC, pas de worker payant.
- **File + persistance + live** : **Supabase** (projet unique) — Postgres pour `jobs`/`job_findings`,
  **Realtime** à la place d'un SSE maison. `lib/db.ts` (pg + `DATABASE_URL`) pointe déjà sur Supabase.
- **Coût LLM** (seul vrai risque payant) : fournisseur à **tier gratuit** (Gemini/Groq via
  LiteLLM, supporté par Strix) + `--max-budget-usd` comme garde-fou.

Conséquences sur la Vague 1 : le « worker » n'est plus un service long-running mais un **workflow
GitHub Actions** déclenché à la demande, qui *tail* les artefacts Strix et pousse les findings
incrémentaux vers Supabase (service key). Le dashboard s'abonne via **Supabase Realtime**.

> ⚠️ Garde-fous gratuité : dépôt runner **public** = minutes illimitées mais logs publics (ne
> jamais logger de secrets/cibles sensibles) ; **privé** = 2000 min/mois (suivre le quota).
> Le gate légal `isHostVerified` reste obligatoire avant tout run offensif.

La Vague 2 ci-dessous **ne dépend pas** de cette décision et démarre immédiatement.

---

## VAGUE 2 — Enrichissements passifs (démarrage immédiat, sans worker)

### T2.1 — CVE Intelligence (techno détectée → CVE connues) ★
- **Fichiers** : nouveau `lib/cve.ts` ; branche dans `lib/scanner.ts` (findings `tech` /
  `server-leak`, ~l.291-387, portent les bannières `nginx/1.24.0`…) ; nouvelle table
  `cve_cache` dans `lib/db.ts` (bloc DDL ~l.95, motif `CREATE TABLE IF NOT EXISTS`) ; étendre
  le type `Finding` (`lib/scanner.ts:4`) avec `cves?: { id: string; cvss?: number; source: string }[]`.
- **Sources** : **OSV.dev** (POST `/v1/query`, sans clé) par défaut ; **NVD 2.0** avec
  **clé gratuite** (`NVD_API_KEY`, 50 req/30 s) pour les logiciels type CPE (nginx, OpenSSL,
  Apache). Cache agressif par CPE/purl (données lentes). Findings marqués « potentiel ».
- **Effort** : Faible. **Acceptation** : un banner versionné produit ≥1 CVE avec lien source ;
  résultat mis en cache ; aucun appel si pas de version détectée ; label « potentiel » affiché.

### T2.2 — Énumération passive de sous-domaines ★
- **Fichiers** : nouveau `lib/recon.ts` (fonction `Finding[]`), spread au point deep
  `scanner.ts:451` ; **re-valider chaque sous-domaine découvert via `validateTargetUrl`
  (`lib/ssrf.ts:36`)** avant tout probe.
- **Sources** : **crt.sh** JSON (`https://crt.sh/?q=%25.<domaine>&output=json`, parser
  `name_value`) — gérer timeouts/502 (AbortSignal 25 s + retry + cache) ; compléments
  best-effort HackerTarget + Anubis (jldc.me).
- **Réservé aux domaines vérifiés** (`deep`). **Effort** : Faible. **Acceptation** : liste
  dédupliquée de sous-domaines ; robustesse si crt.sh timeout ; un finding « surface
  d'attaque » récapitulatif.

### T2.3 — Détection de pages admin/login + analyse de formulaires ★
- **Fichiers** : `lib/recon.ts` ; dépendance `node-html-parser` (pas de regex HTML).
- **Technique** : balayage GET d'une **liste courte (~20 chemins)** — `/admin`, `/wp-admin`,
  `/login`, `/user/login`, `/phpmyadmin`… ; 200/401/403 = signal. Parser les `<form>` :
  jeton CSRF (input hidden `csrf|token|_token|nonce`), `autocomplete` faible sur champs mot
  de passe. **GET only, ne jamais soumettre**. UA honnête, concurrence limitée (p-limit 5).
- **⚠️ trafic actif** (pas strictement passif) → **gated derrière `isHostVerified`**.
- **Effort** : Faible-Moyen. **Acceptation** : pages protégées détectées ; findings CSRF /
  autocomplete ; borne de taille de réponse ; une erreur par chemin n'arrête pas le balayage.

### T2.4 — Durcissements scanner restants
- Versions/ciphers TLS faibles (#74, via `node:tls` déjà utilisé dans `deepchecks.ts`),
  DKIM (#81, `resolveTxt`), score trackers tiers (#85, parse HTML). **Effort** : Faible.

### T2.5 — Screenshot de preuve (charnière vers le worker)
- **Fichiers** : `lib/screenshot.ts` avec interface unique `captureScreenshot(url)` qui
  détecte l'environnement. **Worker** : Playwright (déjà bundlé par Strix). **Vercel** :
  `playwright-core` + `@sparticuz/chromium` (`runtime='nodejs'`). Étendre `Finding` avec
  `evidence?: { screenshotUrl?: string }` ; stocker l'image (Blob/S3/Supabase Storage).
- **Effort** : Moyen (dépend du stockage d'artefacts). **Acceptation** : image PNG capturée
  et liée au scan ; `browser.close()` en `finally`.

---

## VAGUE 1 — Brancher le moteur Strix ✅ SCAFFOLDÉ (2026-08-09)

> Backend + worker + UI livrés et build-vert. Reste à **câbler les secrets** (voir `worker/README.md`)
> pour rendre l'exécution réelle. Fichiers : `lib/jobs.ts`, `lib/github.ts`, `app/api/jobs/*`
> (create/list, detail, **stream SSE**, **ingest**), `worker/github-actions/*` (workflow +
> `push_findings.py`), `components/dashboard/PentestConsole.tsx`, `app/dashboard/pentest/page.tsx`.
> Tables `jobs` + `job_findings` ajoutées à `lib/db.ts`. Verrou légal `isHostVerified` imposé
> avant tout lancement. Quota 2 pentests/h. Statuts live via SSE (poll DB, EventSource auto-reconnect).

### T1.1 — Table `jobs` + module `lib/jobs.ts`
- Table `jobs` (`id, user_id, org_id?, target_url, mode, status, run_name, cost_usd, error,
  created_at, started_at, completed_at`) + table `job_findings` append-only (`job_id, seq,
  payload jsonb, created_at`) dans le bloc DDL `lib/db.ts`. Module `lib/jobs.ts` calqué sur
  `lib/scans.ts`. **Statuts** : `queued|running|streaming|done|error|cancelled`.

### T1.2 — Passer l'API scan en mode async
- `app/api/scan/route.ts` : après pré-vol (auth, SSRF, `isHostVerified`, rate-limit), insérer
  un `job` `queued` et renvoyer `{ jobId }` au lieu d'exécuter `runScan` en ligne. Le scan
  passif rapide peut rester synchrone ; les modes `standard/deep` (offensifs) partent en job.

### T1.3 — Worker Strix
- Service externe (selon décision A/B/C) : consomme la file (`SELECT ... FOR UPDATE SKIP
  LOCKED` ou LISTEN/NOTIFY / Supabase), pose `$HOME`/`--config` **isolés par run** (évite la
  fuite de clés via `~/.strix/cli-config.json`), lance `strix -n -t <cible> -m <mode>` dans un
  CWD monté, **tail `vulnerabilities.json` + `.state/agents.json`** → append dans
  `job_findings` + maj `jobs`. Mappe le finding Strix (riche : `cvss`, `poc_script_code`,
  `remediation_steps`, `code_locations`, `cve`, `cwe`) vers un format d'affichage.

### T1.4 — SSE + dashboard live
- Route `app/api/jobs/[id]/stream/route.ts` (`runtime='nodejs'`, `ReadableStream`
  `text/event-stream`) qui tail `job_findings` par `job_id` (scopé session). Remplacer le
  **faux stepper** `DashboardClient.tsx:22-29,60-63` par un `EventSource`. Cartes de vulné
  live (CVSS, sévérité, PoC, remédiation, statut).
- **CSP** : si le worker stream depuis une autre origine, élargir `connect-src`
  (`next.config.mjs:11`).

### T1.5 — Modes d'analyse gradués dans l'UI
- Sélecteur *Passif* (existant) → *Recon+* (Vague 2) → *Pentest autonome managé* (Strix
  standard/deep). Mappe sur `scan_modes` de Strix. Quotas par offre (#28) via `report/usage.py`.

---

## VAGUE 3 — Gouvernance & collaboration ✅ LIVRÉE INTÉGRALEMENT (2026-08-09)

- **T3.1 ✅** Organisations + `org_members(role)` : `lib/orgs.ts` (owner/admin/member/viewer),
  org personnelle auto-provisionnée, **pentests partagés en équipe** (jobs scopés `org_id`,
  visibilité par appartenance), UI `/dashboard/team`. Scans passifs restent personnels.
- **T3.2 ✅** **Journal d'audit** : table `audit_log` + `lib/audit.ts`, câblé sur login, signup,
  vérif domaine, lancement/approbation/rejet de pentest, statut de finding, gestion d'équipe.
- **T3.2b ✅** **Human-in-the-loop** : réglage org `require_approval` ; un pentest lancé par un
  membre non-gestionnaire passe en `pending_approval` (non déclenché) ; owner/admin
  approuve/rejette (`app/api/jobs/[id]/approve`, toggle dans `/dashboard/team`).
- **T3.3 ✅** Gestion vulns : **statut par finding** (open/fixed/accepted/false_positive) +
  **export serveur SARIF / CSV / JSON** (`app/api/jobs/[id]/export`). *(XLSX/PDF : backlog.)*
- **T3.4 ✅** **Graphe d'attack-chain web** : le runner remonte `.state/agents.json` (colonne
  `jobs.agents_graph`), diffusé en SSE (`event: graph`), rendu en arbre d'agents live
  (composant `AgentGraph` dans `PentestConsole`).

---

## VAGUE 4 — Écosystème & intégrations ✅ LIVRÉE (sauf GitHub App / Jira / Linear)

- **T4.1 ✅** Notifications Slack + webhook (`lib/notify.ts`), scan sur PR CI (`/dashboard/cicd`),
  rapport e-mail (`lib/email.ts`), export PDF (`/dashboard/pentest/[id]/report`).
- **T4.1b ✅ GitHub App managée** : webhook signé (`lib/githubApp.ts` — HMAC + JWT RS256 + jeton
  d'installation), déclenchement d'un scan Strix à chaque PR, **statut de check + commentaire**
  publiés sur la PR ; installations reliées au compte (`lib/ghinstall.ts`,
  `/api/integrations/github/{webhook,setup}`, page `/dashboard/integrations`).
- **T4.1c ✅ Jira / Linear** : création de ticket depuis un finding (`lib/tickets.ts`, bouton dans
  la console), config par organisation (`/api/integrations/tickets`, URL Jira validée anti-SSRF).
- **UX ✅** En-tête console partagé et **responsive** (`ConsoleHeader`, menu mobile) — corrige la
  navigation mobile absente sur les pages pentest/surveillance/CI-CD/intégrations/équipe.
- **T4.2 ✅** **Serveur MCP** : `app/api/mcp` (JSON-RPC 2.0, auth par clé API `sntl_…`), outils
  `passive_scan` / `list_scans` / `launch_pentest` / `get_pentest`. Clés gérées dans `/dashboard/account`
  (`lib/apikeys.ts`, table `api_keys`, secret montré une seule fois) + snippet de config Claude Desktop.
- **T4.3 ✅** Playbooks prédéfinis (`lib/playbooks.ts`) → passés à Strix via `--instruction`.
- **T4.4 ✅** **Scans planifiés** (`lib/scheduled.ts`, `/dashboard/monitoring`) + **alertes de
  régression** via **Vercel Cron** (`vercel.json`, `/api/cron/run-scheduled`, `CRON_SECRET`).

---

## DETTE / DURCISSEMENT (en parallèle, continu)

CI GitHub Actions (lint+build+test) · Sentry · analytics privacy (Plausible) · captcha
anti-bruteforce · vérification e-mail double opt-in · OAuth Google/GitHub · CSP par nonce.

---

## Séquencement recommandé

| Ordre | Lot | Bloqué par | Effort |
|---|---|---|---|
| 1 | **Vague 2** (T2.1→T2.4) | rien — **démarre maintenant** | Faible |
| 2 | Décision worker (A/B/C) | **vous** | — |
| 3 | T2.5 screenshots + Vague 1 (T1.1→T1.5) | décision worker | Élevé |
| 4 | Vague 3 (gouvernance) | 1er run offensif OK | Moyen-Élevé |
| 5 | Vague 4 (écosystème) | traction commerciale | Moyen |

Dette technique (CI, Sentry…) : en continu dès la Vague 2 pour sécuriser les livraisons.
