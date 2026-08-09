# Sentinel by Kayzen — Audit de l'existant & améliorations concurrentielles

> Audit réalisé le 2026-08-09. Analyse comparative avec **HexStrike AI**, **CyberStrikeAI**
> et **PentestAgent**. Objectif : identifier ce qui manque à Sentinel et importer ce que
> font de mieux les concurrents.

---

## 1. Cartographie de l'existant

Le dépôt contient **deux briques distinctes** qui ne se parlent pas encore :

| Brique | Techno | Rôle | État |
|---|---|---|---|
| `strix-main/` | Python (openai-agents + LiteLLM) | **Moteur** de pentest IA autonome | Complet, mature |
| `sentinel-kayzen/` | Next.js 16 / React 19 / TS | **SaaS** vitrine + scanner self-service | En prod, mais limité |

### 1.1 Ce que le moteur Strix sait déjà faire (et que Sentinel n'expose pas)

En lisant `strix/`, le moteur est déjà au niveau — voire au-dessus — des concurrents :

- **Multi-agent graph** (`tools/agents_graph`) : agents qui se coordonnent, se délèguent des
  sous-tâches, partagent leurs découvertes — équivalent du « Crew » de PentestAgent et du
  « Supervisor mode » de CyberStrike.
- **Boîte à outils offensive** : `shell`, `proxy` (Caido), `agent_browser` (Playwright),
  `apply_patch` (auto-fix), `web_search`, `notes`, `todo`, `thinking`, `finish`.
- **24 skills de vulnérabilités** (`skills/vulnerabilities/`) : SQLi, XSS, SSRF, SSTI, IDOR,
  RCE, XXE, désérialisation, race conditions, JWT, prototype pollution, **prompt injection LLM**,
  subdomain takeover, etc.
- **3 modes de scan** (`skills/scan_modes/`) : quick / standard / deep.
- **Reporting** : SARIF (`report/sarif.py`), dédup (`report/dedupe.py`), usage/coût.
- **Runtime Docker sandboxé** (`runtime/docker_client.py`) — isolation par run.
- **Multi-provider LLM** via LiteLLM (OpenAI, Anthropic, Vertex, Ollama local…).
- **CLI headless + TUI** temps réel, télémétrie, GitHub Actions.

### 1.2 Ce que le SaaS Sentinel expose aujourd'hui

- **Auth** e-mail/mot de passe (JWT httpOnly, bcrypt) + dashboard + historique.
- **Scanner passif** (`lib/scanner.ts`) : ~20 contrôles HTTP non-intrusifs (HTTPS, HSTS, CSP,
  en-têtes, cookies, CORS, fuites serveur, `.env`/`.git`, security.txt) + contrôles approfondis
  (`lib/deepchecks.ts` : cert TLS, SPF/DMARC, mixed content) réservés aux **domaines vérifiés**.
- **Garde anti-SSRF** solide (`lib/ssrf.ts`), rate-limiting Postgres, note A→F.
- Un `IMPROVEMENTS.md` de 200 items déjà bien avancé.

### 1.3 Le constat central

> **Le SaaS ne vend pas ce qu'il possède.** Sentinel promet du « pentest IA autonome basé sur
> Strix » (README), mais son application ne fait qu'un **scan passif d'en-têtes**. Le moteur
> Strix — un vrai red-team autonome — est à côté, inutilisé par le produit self-service.

C'est **l'écart n°1** et, paradoxalement, la plus grosse opportunité : le différenciateur est
déjà écrit, il reste à le **brancher** et à l'**industrialiser** en SaaS.

---

## 2. Analyse concurrentielle

| Capacité | HexStrike AI | CyberStrikeAI | PentestAgent | **Strix (moteur)** | **Sentinel (SaaS)** |
|---|:--:|:--:|:--:|:--:|:--:|
| Agent IA autonome | ✅ 12+ agents | ✅ multi-modes | ✅ Assist/Agent/Crew | ✅ agents_graph | ❌ |
| Nb d'outils intégrés | 150+ | 100+ | Docker Kali | ~14 + skills | scanner passif |
| Serveur MCP (exposé aux IA) | ✅ FastMCP | ✅ HTTP/stdio/SSE | ✅ bidirectionnel | ❌ | ❌ |
| Décision auto / sélection d'outil | ✅ moteur dédié | ✅ | ✅ | ✅ (LLM) | ❌ |
| CVE intelligence (techno→CVE) | ✅ | — | RAG | ❌ | ❌ (backlog #77) |
| Base de connaissances RAG | — | ✅ vector+rerank | ✅ knowledge store | skills .md | ❌ |
| Attack-chain / graphe visuel | ✅ cards | ✅ modélisation | Shadow Graph | renderer TUI | ❌ |
| Gestion vulns/assets (dédup, export) | ✅ | ✅ XLSX/CSV | notes/loot | SARIF | historique brut |
| RBAC / multi-utilisateur / équipes | — | ✅ | — | — | ❌ (backlog #27) |
| Human-in-the-loop (approbations) | — | ✅ allowlists | fork/rewind | — | ❌ |
| Screenshots / vision | ✅ Chrome headless | ✅ modèle vision | browser tool | Playwright | ❌ |
| Playbooks prédéfinis | workflows CTF/BB | rôles | ✅ playbooks | scan_modes | ❌ |
| Intégrations chat/DevSecOps | clients IA | Slack/Teams/TG… | MCP clients | GH Actions | ❌ |
| **Interface SaaS web multi-tenant** | ❌ | dashboard local | TUI | TUI/CLI | ✅ **← notre force** |
| **Cadre légal / vérif. de propriété** | ⚠️ | ⚠️ | ⚠️ | scope modes | ✅ **← notre force** |

**Lecture :** les concurrents sont surtout des **outils pour hackers** (CLI/MCP/dashboard local).
Aucun n'a ce que Sentinel a déjà : un **produit SaaS multi-tenant, authentifié, avec cadre légal
(vérification de propriété de domaine)**. Notre avantage n'est pas le moteur — c'est le
**packaging produit + conformité**. Il faut donc importer leurs capacités *dans* ce cadre.

---

## 3. Les pépites à reprendre (par concurrent)

**De HexStrike AI :**
- `IntelligentDecisionEngine` : sélection d'outil et optimisation de paramètres automatiques.
- `CVEIntelligenceManager` : corrélation temps réel version détectée ↔ CVE connues.
- Dashboard temps réel : *vulnerability cards*, contrôle de process live, télémétrie.
- Automatisation **headless Chrome** : screenshots + analyse DOM + trafic réseau.

**De CyberStrikeAI :**
- Modes d'orchestration gradués : *single → Plan-Execute → Supervisor*.
- **Gestion vulns/assets** : déduplication, scoring de risque, import/export XLSX-CSV.
- **Modélisation d'attack-chain visuelle** + faits partagés entre sessions + *replay*.
- **Gouvernance** : RBAC, human-in-the-loop, tool allowlists, journal d'audit.
- **Vision** (modèle séparé pour screenshots/CAPTCHA), RAG (rewrite→retrieve→rerank).
- Intégrations multi-plateformes (Slack, Teams, Telegram, Discord…).

**De PentestAgent :**
- Modes d'exécution clairs : *Assist / Agent / Crew / Interact*.
- **MCP bidirectionnel** : consommer des MCP externes ET s'exposer comme serveur MCP.
- **Playbooks** d'attaque prédéfinis (ex. « web pentest OWASP »).
- **Async multi-cibles** : recon parallèle sur plusieurs cibles/CIDR.
- **Notes → Shadow Graph** : graphe de connaissance dérivé des findings (corrélation de creds).
- Rewind/fork de conversation, persistance de sessions, `/report`.

---

## 4. Améliorations proposées (priorisées par vagues)

Notation : **Impact** (produit/vente) × **Effort** (dev). ★ = quick win.

### Vague 1 — Combler l'écart central : rendre le moteur *vendable*

| # | Amélioration | Repris de | Impact | Effort |
|---|---|---|:--:|:--:|
| 1 | **Orchestrateur Strix depuis le SaaS** : file de jobs async (worker) → run Strix en conteneur Docker par cible **vérifiée** → streaming SSE des findings dans le dashboard | PentestAgent async, CyberStrike task queue, HexStrike live dash | 🔥🔥🔥 | Élevé |
| 2 | **Modes d'analyse gradués** dans l'UI : *Passif* (existant) → *Recon+* → *Pentest autonome managé* — mappés sur `scan_modes` quick/standard/deep de Strix | PentestAgent, CyberStrike | 🔥🔥🔥 | Moyen |
| 3 | **Live findings dashboard** : cartes de vulnérabilité (CVSS, PoC, statut, remédiation) mises à jour en direct | HexStrike, CyberStrike | 🔥🔥 | Moyen |

> Ces trois items transforment la promesse marketing en produit réel. Le socle légal
> (vérification de domaine dans `lib/domains.ts`) est **déjà là** pour autoriser l'offensif.

### Vague 2 — Intelligence & enrichissement (reste passif, faible risque, fort impact)

| # | Amélioration | Repris de | Impact | Effort |
|---|---|---|:--:|:--:|
| 4 ★ | **CVE Intelligence** : mapper techno/version détectée (déjà fait au check #76) → CVE via API NVD/OSV/Vulners | HexStrike | 🔥🔥 | Faible |
| 5 | **Base RAG de connaissances** (OWASP, CVE, wordlists) injectée dans les prompts — vectoriser les skills `.md` de Strix | CyberStrike, PentestAgent | 🔥 | Moyen |
| 6 ★ | **Recon passive étendue** : sous-domaines (crt.sh/subfinder), pages admin/login exposées, analyse de formulaires (CSRF/autocomplete) — items backlog #80/82/83 | HexStrike arsenal | 🔥🔥 | Faible |
| 7 ★ | **Screenshot headless** de la cible (Playwright déjà dispo dans Strix) + preuve visuelle dans le rapport | HexStrike, CyberStrike vision | 🔥 | Faible |

### Vague 3 — Gouvernance & collaboration (prérequis pour vendre en entreprise)

| # | Amélioration | Repris de | Impact | Effort |
|---|---|---|:--:|:--:|
| 8 | **Multi-cibles / projets / organisations** + **RBAC** (rôles, équipes) — backlog #26/27 | CyberStrike RBAC | 🔥🔥 | Élevé |
| 9 | **Human-in-the-loop** : approbation avant toute action offensive, *tool allowlists*, **journal d'audit** complet | CyberStrike governance | 🔥🔥 | Moyen |
| 10 | **Gestion vulns/assets** : dédup, statut (ouvert/corrigé/accepté), export XLSX/CSV/**PDF/SARIF** (Strix produit déjà du SARIF) | CyberStrike | 🔥🔥 | Moyen |
| 11 | **Attack-chain / graphe visuel** des agents et vulns chaînées (porter le renderer TUI `agents_graph` en web) | CyberStrike, Strix Shadow Graph | 🔥 | Moyen |

### Vague 4 — Écosystème & intégrations (croissance / acquisition)

| # | Amélioration | Repris de | Impact | Effort |
|---|---|---|:--:|:--:|
| 12 | **DevSecOps** : GitHub App / scan sur PR, notifications Slack/Jira/Linear, webhooks | Strix platform, CyberStrike | 🔥🔥 | Moyen |
| 13 | **Exposer Sentinel comme serveur MCP** (consommable par Claude Desktop/Cursor) + consommer des MCP externes | PentestAgent, HexStrike | 🔥 | Moyen |
| 14 | **Playbooks prédéfinis** sélectionnables (Web OWASP, API, Cloud, Bug bounty) | PentestAgent | 🔥 | Faible |
| 15 | **Scans planifiés + alertes de régression + rapport e-mail** — backlog #22/23/24 | — | 🔥 | Faible |

### Dette technique / durcissement (repris de l'IMPROVEMENTS.md, à ne pas oublier)

- CI GitHub Actions (lint + build + tests) · Sentry · analytics privacy (Plausible) · captcha
  anti-bruteforce · vérification e-mail double opt-in · OAuth Google/GitHub · CSP par nonce.
- Scanner passif : versions/ciphers TLS faibles (#74), DKIM (#81), score trackers tiers (#85).

---

## 5. Points de vigilance

- **Légal & éthique** : passer du passif à l'offensif impose un cadre strict — RoE (règles
  d'engagement), scope explicite, autorisation signée. La **vérification de propriété de domaine
  existe déjà** : en faire le verrou obligatoire de tout run offensif. Journaliser chaque action.
- **Coût LLM** : un run Strix autonome consomme des tokens ; prévoir quotas par offre (backlog
  #28) et suivi de coût (Strix a déjà `report/usage.py`).
- **Isolation** : exécuter chaque run dans un conteneur Docker jetable (déjà supporté), jamais
  sur l'infra applicative — garder la garde SSRF comme filet.
- **Ne pas réécrire le moteur** : Strix couvre déjà 90 % des capacités des concurrents. L'effort
  doit porter sur le **pont SaaS ↔ moteur** et le **packaging produit**, pas sur du re-dev.

---

## 6. Recommandation de séquencement

1. **Vague 2 d'abord** (items 4, 6, 7) — quick wins passifs, sans risque, qui enrichissent
   immédiatement le scanner actuel et donnent du grain à moudre au dashboard.
2. **Vague 1** (items 1-3) — le vrai saut produit : brancher le moteur Strix en async. C'est le
   chantier structurant qui matérialise la promesse « pentest IA autonome ».
3. **Vague 3** (gouvernance) dès qu'un premier run offensif tourne — indispensable avant de
   vendre à des clients entreprise.
4. **Vague 4** en continu, selon la traction commerciale.
