# Worker Strix — pentest autonome via GitHub Actions (100 % gratuit)

Le moteur Strix ne tourne **ni sur votre PC ni sur un serveur payant** : il s'exécute dans un
**runner GitHub Actions éphémère** (Docker déjà disponible, gratuit), déclenché à la demande par
Sentinel. Les findings sont poussés en direct vers l'app.

```
Sentinel (Vercel)  ──repository_dispatch──▶  GitHub Actions (Strix + Docker)
       ▲                                              │
       └──────────  POST /api/jobs/ingest  ◀──────────┘   (findings au fil de l'eau)
       │
   Dashboard  ◀── SSE /api/jobs/[id]/stream ── Postgres (Supabase)
```

## 1. Créer le dépôt runner (gratuit)

1. Créez un dépôt GitHub **privé** (2000 min/mois gratuites ; suffisant pour démarrer).
2. Copiez-y **deux fichiers** depuis ce dossier :
   - `github-actions/strix-pentest.yml` → `.github/workflows/strix-pentest.yml`
   - `github-actions/push_findings.py` → `push_findings.py` (racine du dépôt)

## 2. Secrets du dépôt runner

Settings → Secrets and variables → Actions → **New repository secret** :

| Secret | Valeur |
|---|---|
| `WORKER_INGEST_SECRET` | une longue chaîne aléatoire (identique côté Vercel) |
| `GEMINI_API_KEY` | clé **gratuite** Google AI Studio (https://aistudio.google.com/apikey) |

Variables optionnelles (onglet *Variables*) : `STRIX_MODEL` (défaut `gemini/gemini-2.0-flash`),
`STRIX_MAX_BUDGET_USD` (défaut `0.50`).

## 3. Créer un PAT GitHub (déclenchement)

Un **Personal Access Token** (classic, scope `repo`, ou fine-grained avec permission
*Contents: read* + *Metadata* sur le dépôt runner) pour que Sentinel déclenche le workflow.

## 4. Variables d'environnement Sentinel (Vercel)

| Variable | Rôle |
|---|---|
| `GITHUB_DISPATCH_TOKEN` | le PAT ci-dessus |
| `GITHUB_RUNNER_REPO` | `owner/nom-du-depot-runner` |
| `WORKER_INGEST_SECRET` | **même** valeur que le secret du runner |
| `APP_BASE_URL` | URL publique de Sentinel (ex. `https://sentinel.kayzen-lyon.com`) |
| `NVD_API_KEY` *(optionnel)* | clé NVD gratuite pour la corrélation CVE |

Sans `GITHUB_DISPATCH_TOKEN` + `GITHUB_RUNNER_REPO`, un lancement de pentest est simplement
**mis en file** (mode audit managé) : aucune erreur, mais pas d'exécution automatique.

## 5. Garde-fous

- **Verrou légal** : un pentest n'est déclenchable que sur un **domaine vérifié** (onglet
  Domaines) — imposé côté serveur dans `app/api/jobs/route.ts`.
- **Coût LLM** borné par `--max-budget-usd` (Strix s'arrête proprement au plafond).
- **Quota** : 2 lancements/heure/utilisateur (rate-limit Postgres).
- Dépôt runner **privé** recommandé (les logs d'un dépôt public seraient visibles de tous).

## 6. Tester

Depuis le dashboard Sentinel → **Pentest autonome**, saisissez un domaine vérifié et lancez.
Le workflow apparaît dans l'onglet *Actions* du dépôt runner ; les findings s'affichent en
direct dans la console.
