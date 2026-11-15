# Sentinel by Kayzen — Améliorations proposées (novembre 2026)

Complète `IMPROVEMENTS.md` et `ROADMAP.md` : rien de ce qui y est déjà ✅ n'est reproposé ici.
Quand un item ◻ de ces fichiers est repris, il est précisé et rattaché aux fichiers concernés.

**Légende** — Priorité : **P0** urgent (sécurité / bug / bloquant commercial) · **P1** important · **P2** confort.
Effort : **S** < 1 j · **M** 1–3 j · **L** > 3 j.

- Partie A : **155 améliorations techniques & visuelles** (T1 → T155)
- Partie B : **55 améliorations fonctionnelles** de l'application et de l'outil (F1 → F55)
- Partie C : **Top 15** à faire en premier

---

# Partie A — Améliorations techniques & visuelles

## A1. Sécurité & correctifs

- **T1. Corriger le rapprochement des domaines vérifiés** — `registrableDomain()` garde les 2 derniers labels : vérifier `app.example.com` ne matche jamais, vérifier l'apex débloque tous les sous-domaines. Comparer l'hôte exact ou un parent explicitement vérifié (`lib/domains.ts:28`, `:119`). · P0 · S
- **T2. Public Suffix List** — `.co.uk`, `.gouv.fr`, `.com.au` sont cassés ; utiliser `tldts` (ou PSL embarquée) dans `normalizeDomain` / `registrableDomain` (`lib/domains.ts`). · P0 · S
- **T3. Tests de non-régression domaines** — cas apex, sous-domaine, `www`, suffixes multi-labels, IDN (`tests/unit.test.ts`). · P0 · S
- **T4. TLS Postgres vérifié** — remplacer `rejectUnauthorized: false` par le CA du fournisseur (`DATABASE_CA_CERT`) (`lib/db.ts:26`). · P0 · S
- **T5. Comparaison constant-time du secret cron** — `timingSafeEqual` sur le Bearer, comme pour `x-worker-secret` (`app/api/cron/run-scheduled/route.ts:17`). · P0 · S
- **T6. Chiffrer les secrets d'intégration** — jetons Jira/Linear et URLs Slack/webhook stockés en clair ; chiffrement AES-256-GCM applicatif avec clé `INTEGRATIONS_KEY` (`lib/db.ts` table `org_integrations`, `lib/tickets.ts`, `lib/notify.ts`). · P0 · M
- **T7. Masquer les secrets à l'affichage** — l'API ne renvoie jamais un jeton complet, seulement `••••1234` (`app/api/integrations/tickets`, `app/api/team/settings`). · P0 · S
- **T8. CSP par nonce** — retirer `'unsafe-inline'` de `script-src` via nonce généré dans `proxy.ts` et passé au script d'init du thème (`next.config.mjs:18`, `app/layout.tsx`). · P1 · M
- **T9. Hash CSP du script de thème** — alternative rapide à T8 : `'sha256-…'` du `THEME_INIT_SCRIPT` (statique) (`components/ui/ThemeToggle.tsx`, `next.config.mjs`). · P1 · S
- **T10. CSP dev sans erreurs `eval()`** — autoriser `'unsafe-eval'` uniquement si `NODE_ENV==='development'` (`next.config.mjs`). · P2 · S
- **T11. En-tête `Content-Security-Policy-Report-Only` + endpoint de rapport** — collecter les violations avant durcissement (`app/api/csp-report`). · P2 · S
- **T12. Anti-SSRF sur re-direction** — revalider chaque saut de redirection (`redirect: 'manual'`) dans le scanner et les webhooks sortants (`lib/scanner.ts`, `lib/notify.ts`, `lib/ssrf.ts`). · P0 · M
- **T13. Anti-DNS-rebinding** — épingler l'IP résolue pour la requête (agent `lookup` personnalisé) au lieu de résoudre puis refaire un fetch (`lib/ssrf.ts`). · P1 · M
- **T14. Valider les URLs de webhook Slack/générique** — passer par `validateTargetUrl` à l'enregistrement et à l'envoi (`app/api/team/settings`, `lib/notify.ts`). · P0 · S
- **T15. Rotation des secrets de session** — support de `AUTH_SECRET_PREVIOUS` pour vérifier les anciens JWT pendant la rotation (`lib/jwt.ts`). · P1 · S
- **T16. Révocation de session** — colonne `users.session_version` incluse dans le JWT ; incrémentée au changement de mot de passe (`lib/auth.ts`, `app/api/account/password`). · P1 · M
- **T17. Bcrypt coût 12** + rehash transparent à la connexion (`lib/auth.ts`). · P2 · S
- **T18. Limite de taille des corps JSON** — refuser > 64 Ko sur les routes publiques, > 5 Mo sur `jobs/ingest` (`app/api/*`). · P1 · S
- **T19. Validation de schéma des entrées** — `zod` (ou validateurs maison centralisés) sur toutes les routes API (`app/api/**/route.ts`). · P1 · M
- **T20. Protection CSRF explicite** — vérifier `Origin`/`Sec-Fetch-Site` sur les POST/PATCH/DELETE à cookie de session (`proxy.ts` ou helper `lib/csrf.ts`). · P1 · S
- **T21. Scope des clés API** — permissions par clé (`scan:read`, `pentest:launch`…) et expiration (`lib/apikeys.ts`, `app/api/mcp/route.ts`). · P1 · M
- **T22. Rate-limit MCP et ingest** — appliquer le limiteur aux clés API et au webhook GitHub (`app/api/mcp`, `app/api/integrations/github/webhook`). · P1 · S
- **T23. Anti-rejeu du webhook GitHub** — stocker `X-GitHub-Delivery` et refuser les doublons (`lib/githubApp.ts`). · P2 · S
- **T24. Purge des données de scan** — politique de rétention (ex. 12 mois) via le cron, cohérente avec la page confidentialité (`vercel.json`, `app/confidentialite`). · P1 · S
- **T25. Journal d'audit infalsifiable** — chaînage par hash (`prev_hash`) sur `audit_log` (`lib/audit.ts`). · P2 · M
- **T26. `security.txt` signé et daté** — champ `Expires` à jour + `Policy` vers une page de divulgation (`public/.well-known/security.txt`). · P2 · S
- **T27. En-tête `Cross-Origin-Embedder-Policy`** évalué (compatibilité images) (`next.config.mjs`). · P2 · S
- **T28. Dépendances épinglées et Renovate/Dependabot groupé** — fusionner les 5 branches Dependabot en attente après CI verte (`package.json`, `.github/dependabot.yml`). · P1 · S

## A2. Architecture & données

- **T29. Migrations versionnées** — remplacer le DDL runtime `ensureSchema()` par des fichiers SQL numérotés + table `schema_migrations` exécutés au déploiement (`lib/db.ts`, `scripts/migrate.ts`). · P0 · M
- **T30. Ne plus appeler `ensureSchema()` à chaque requête** — coût et verrous ; l'exécuter uniquement en migration (`lib/*.ts`). · P1 · S
- **T31. Pool Postgres adapté au serverless** — utiliser l'URL poolée (PgBouncer/Neon pooler/Supavisor) et `max` configurable par env (`lib/db.ts:23`). · P1 · S
- **T32. Purge de `rate_events`** — suppression des événements > 24 h dans le cron + index `(key, created_at)` (`lib/db.ts`, `app/api/cron/run-scheduled`). · P0 · S
- **T33. Index manquants** — `scans(user_id, created_at)`, `jobs(org_id, created_at)`, `job_findings(job_id, status)`, `audit_log(org_id, created_at)` (`lib/db.ts`). · P1 · S
- **T34. Clés étrangères + `ON DELETE CASCADE`** cohérentes (suppression de compte/org) (`lib/db.ts`). · P1 · M
- **T35. Couche d'accès typée** — requêtes regroupées par domaine avec types de lignes partagés (`lib/repo/*.ts`) plutôt que SQL dispersé. · P2 · L
- **T36. Scan passif asynchrone** — passer le scan de la fonction 60 s synchrone à un job (comme les pentests) pour éviter les timeouts (`app/api/scan/route.ts`, `lib/jobs.ts`). · P1 · M
- **T37. SSE sans polling DB** — `LISTEN/NOTIFY` Postgres (ou Supabase Realtime) au lieu du poll 2 s, et reconnexion avec `Last-Event-ID` (`app/api/jobs/[id]/stream/route.ts`). · P1 · M
- **T38. Reprise SSE propre** — envoyer `retry:` et `id:` à chaque événement pour que la fermeture à 55 s soit invisible (`app/api/jobs/[id]/stream/route.ts:75`). · P1 · S
- **T39. Idempotence de l'ingest** — clé `(job_id, seq)` et réponses idempotentes pour les ré-envois du runner (`app/api/jobs/ingest`). · P1 · S
- **T40. Timeout des jobs orphelins** — le cron passe en `error` les jobs `running` depuis > 90 min (`lib/jobs.ts`, cron). · P0 · S
- **T41. Variables d'environnement validées au démarrage** — module `lib/env.ts` qui échoue tôt si `AUTH_SECRET` etc. manquent (`lib/env.ts`). · P1 · S
- **T42. Server Actions pour les formulaires du dashboard** — moins de routes API ad hoc, revalidation intégrée (`components/dashboard/*`). · P2 · L
- **T43. Découper `PentestConsole.tsx` (623 l.)** en sous-composants (liste de findings, détail, graphe, actions) (`components/dashboard/PentestConsole.tsx`). · P1 · M
- **T44. Découper `DashboardClient.tsx` (512 l.)** — formulaire de scan, historique, domaines séparés (`components/dashboard/DashboardClient.tsx`). · P1 · M
- **T45. Types partagés front/back** — `types/finding.ts`, `types/job.ts` utilisés par API, UI et `push_findings.py` (schéma JSON). · P1 · S
- **T46. Schéma JSON du contrat d'ingest** versionné et validé côté serveur (`worker/github-actions/push_findings.py`, `app/api/jobs/ingest`). · P1 · S
- **T47. Runner dans un dépôt dédié versionné** — plus de copie manuelle des workflows ; tag de version vérifié à l'ingest (`worker/github-actions/*`). · P1 · M
- **T48. Stockage d'artefacts** (captures, rapports) sur Supabase Storage / Vercel Blob avec URLs signées (`lib/storage.ts`). · P1 · M
- **T49. Cache des CVE avec TTL** et rafraîchissement en tâche de fond (`lib/cve.ts`, `cve_cache`). · P2 · S
- **T50. Feature flags simples** (`lib/flags.ts`, variables Vercel) pour livrer progressivement. · P2 · S

## A3. Performance

- **T51. Mesurer les Core Web Vitals en prod** — `@vercel/speed-insights` ou `web-vitals` maison (`app/layout.tsx`). · P1 · S
- **T52. Lighthouse CI dans le workflow** avec budget (LCP < 2,5 s, CLS < 0,1) (`.github/workflows/ci.yml`). · P1 · S
- **T53. Animation du hero sans masquer le LCP** — le titre démarre à opacité ~0 (« reveal ») : afficher le h1 immédiatement, animer seulement le décor (`components/Hero.tsx`, `app/globals.css`). · P1 · S
- **T54. Images en AVIF/WebP + tailles `sizes`** sur toutes les `next/image` (`components/*.tsx`). · P2 · S
- **T55. Logo SVG** au lieu de PNG si possible (`public/`, `components/Header.tsx`). · P2 · S
- **T56. Chargement différé des sections basses** de la home (Faq, Integrations) via `dynamic()` si elles sont clientes (`app/page.tsx`). · P2 · S
- **T57. Réduire le JS client** — convertir en Server Components les sections marketing qui n'ont pas d'état (`components/*.tsx`). · P1 · M
- **T58. Skeletons du dashboard** (◻136) via `loading.tsx` par sous-route (`app/dashboard/*/loading.tsx`). · P2 · S
- **T59. Streaming + Suspense** pour l'historique des scans et la liste des jobs (`app/dashboard/page.tsx`). · P2 · M
- **T60. Cache HTTP des exports** (`ETag`) et des pages légales (statique) (`app/api/jobs/[id]/export`). · P2 · S
- **T61. Pagination serveur** de l'historique des scans, des jobs et de l'audit (`app/api/scan`, `app/api/jobs`, `app/api/team`). · P1 · S
- **T62. Virtualisation** des longues listes de findings (> 200) (`PentestConsole.tsx`). · P2 · M
- **T63. Concurrence bornée du scanner** — `p-limit` pour les sondes d'exposition/recon (`lib/exposure.ts`, `lib/recon.ts`). · P1 · S
- **T64. Préchargement `preconnect`** vers les origines tierces utilisées (◻133) (`app/layout.tsx`). · P2 · S
- **T65. Analyse du bundle** (`@next/bundle-analyzer`) en CI sur demande (`next.config.mjs`). · P2 · S

## A4. Qualité, tests & observabilité

- **T66. Tests e2e Playwright** — inscription, connexion, scan passif, vérification domaine, export (`tests/e2e/*`). · P0 · M
- **T67. Tests de routes API** avec base Postgres éphémère (service CI) (`tests/api/*`, `.github/workflows/ci.yml`). · P1 · M
- **T68. Tests d'autorisation (IDOR)** — un utilisateur ne lit pas le scan/job/finding d'un autre ni d'une autre org (`tests/api/authz.test.ts`). · P0 · M
- **T69. Tests composants** (Testing Library) pour `ScanResultView`, `PentestConsole` (`tests/components/*`). · P2 · M
- **T70. Couverture de code mesurée** (`c8`) avec seuil en CI (`package.json`). · P2 · S
- **T71. Sentry (ou GlitchTip gratuit)** client + serveur avec scrubbing des URLs/jetons (`instrumentation.ts`). · P0 · S
- **T72. Logs structurés JSON** (`lib/log.ts`) avec `request_id`, `user_id`, `job_id` ; jamais de secrets. · P1 · S
- **T73. `request_id` propagé** du `proxy.ts` aux routes et au runner (en-tête `x-request-id`). · P2 · S
- **T74. Endpoint de santé enrichi** — état DB, dernière exécution du cron, âge du plus vieux job en file (`app/api/health`). · P1 · S
- **T75. Monitoring de disponibilité externe** (UptimeRobot/Better Stack gratuit) + page statut. · P1 · S
- **T76. Alerte en cas d'échec du runner** — notification si un dispatch GitHub échoue ou si aucun ingest sous 15 min (`lib/github.ts`). · P1 · S
- **T77. Semgrep bloquant sur règles critiques** et SARIF publié dans l'onglet Security GitHub (`.github/workflows/ci.yml`). · P2 · S
- **T78. `typecheck` strict sur `worker/`** (mypy/ruff) dans la CI (`worker/`). · P2 · S
- **T79. Script `npm run check`** = lint + tsc + tests, utilisé localement et en CI (`package.json`). · P2 · S
- **T80. Preview Vercel protégée + seed de démo** pour tester chaque PR (`scripts/seed.ts`). · P2 · M

## A5. SEO

- **T81. Sitemap complet** — ajouter `/cgv`, pages légales, futures pages produit ; retirer `/login` (`app/sitemap.ts`). · P1 · S
- **T82. Ne plus bloquer les pages légales dans robots.txt** — préférer `noindex` en meta ; aujourd'hui `/mentions-legales`, `/confidentialite`, `/cgu`, `/accessibilite` sont bloquées, ce qui empêche Google de lire le `noindex` (`public/robots.txt`). · P1 · S
- **T83. `alternates.canonical` par page** (◻98) (`app/**/page.tsx`). · P1 · S
- **T84. Images OG dynamiques** par page via `opengraph-image.tsx` (◻170) (`app/opengraph-image.tsx`). · P2 · S
- **T85. Pages produit dédiées** : `/pentest-ia`, `/scan-securite-gratuit`, `/audit-manage`, `/api-mcp` (`app/*/page.tsx`). · P1 · L
- **T86. Blog / centre de ressources** en MDX (◻100) (`app/blog/`). · P2 · L
- **T87. Glossaire cybersécurité** (◻179) — pages statiques longue traîne (`app/glossaire/`). · P2 · M
- **T88. Scanner public d'en-têtes** (« Testez votre site ») en page d'acquisition, résultats limités sans compte (`app/test-securite/page.tsx`). · P1 · M
- **T89. JSON-LD `SoftwareApplication` + `Offer`** cohérent avec `Pricing.tsx` (`app/page.tsx`). · P2 · S
- **T90. `BreadcrumbList`** sur les pages internes (◻102) (`components/LegalShell.tsx`). · P2 · S
- **T91. Version anglaise** avec `hreflang` (◻184/103) — `app/[lang]/` ou sous-domaine. · P2 · L
- **T92. Données vérifiables dans le hero** (◻177) — chiffres sourcés ou retirés (`components/Hero.tsx`). · P1 · S

## A6. Accessibilité (RGAA / WCAG 2.2 AA)

- **T93. Audit axe-core automatisé en CI** via Playwright (`tests/e2e/a11y.spec.ts`). · P1 · S
- **T94. Piège de focus et Échap** dans le menu mobile et les modales (◻121/122) (`components/Header.tsx`, `ConsoleHeader.tsx`). · P1 · S
- **T95. Erreurs reliées aux champs** `aria-describedby` + `aria-invalid` (◻124) (`components/auth/*`, `AccountForm.tsx`). · P1 · S
- **T96. Annonce des étapes de pentest** via `aria-live="polite"` dans la console (`PentestConsole.tsx`). · P2 · S
- **T97. Contrastes vérifiés dans les deux thèmes** (terracotta sur blanc, textes `muted`) (◻120) (`app/globals.css`). · P1 · S
- **T98. Taille de cible ≥ 24 px** (WCAG 2.2 2.5.8) pour les icônes du dashboard (`components/dashboard/*`). · P2 · S
- **T99. Tableaux de findings sémantiques** (`<table>`, `scope`, `caption`) ou rôles grid (`ScanResultView.tsx`). · P2 · M
- **T100. Graphe d'agents accessible** — alternative textuelle (liste arborescente) (`PentestConsole.tsx` / `AgentGraph`). · P2 · S
- **T101. Gravité non portée par la couleur seule** — icône + libellé sur badges risk/warn/safe (`components/dashboard/*`). · P1 · S
- **T102. Taux de conformité RGAA publié** sur `/accessibilite` après audit (◻118) (`app/accessibilite`). · P2 · M
- **T103. Bannière cookies accessible au clavier** et non bloquante pour la lecture (`components/CookieBanner.tsx`). · P2 · S

## A7. Design system & UI

- **T104. Composant `Button`** (variantes primary/secondary/ghost/danger, tailles, état loading) remplaçant les classes `btn*` (`components/ui/Button.tsx`). · P1 · M
- **T105. Composants `Input`, `Select`, `Textarea`, `Checkbox`, `Field`** avec label/erreur/aide (`components/ui/`). · P1 · M
- **T106. Composant `Dialog`/`Sheet`** accessible (`<dialog>` natif) pour confirmations et détails (`components/ui/Dialog.tsx`). · P1 · M
- **T107. Composant `Table`** triable/filtrable pour historique, jobs, audit (`components/ui/Table.tsx`). · P1 · M
- **T108. `Badge`/`SeverityBadge`** unifié (critical/high/medium/low/info) (`components/ui/Badge.tsx`). · P1 · S
- **T109. `Tabs`, `Tooltip`, `DropdownMenu`, `EmptyState`, `Skeleton`, `Card`** (`components/ui/`). · P2 · M
- **T110. Page `/dev/ui`** (non indexée, dev uniquement) servant de catalogue des composants. · P2 · S
- **T111. Icônes centralisées** — un seul module SVG (`components/ui/icons.tsx`) au lieu de SVG inline répétés. · P2 · S
- **T112. Échelle de gravité CVSS** en tokens (`--sev-critical`…) dans les deux thèmes (`app/globals.css`). · P1 · S
- **T113. Tokens de focus** (`--focus-ring`) homogènes sur tous les éléments interactifs (`app/globals.css`). · P2 · S
- **T114. Typographie chiffrée** `font-variant-numeric: tabular-nums` pour scores, CVSS, coûts (`app/globals.css`). · P2 · S
- **T115. Micro-interactions sur les findings** (◻162) — survol, ouverture fluide, copie confirmée (`ScanResultView.tsx`). · P2 · S
- **T116. Pictos par catégorie de contrôle** (◻167) — en-têtes, TLS, exposition, DNS… (`components/ui/icons.tsx`). · P2 · M
- **T117. Toasts unifiés** pour toutes les actions (le `Toast` existe : l'utiliser partout) (`components/ui/Toast.tsx`). · P2 · S

## A8. UX du dashboard

- **T118. Navigation latérale persistante** sur desktop (scans, pentests, monitoring, intégrations, équipe, compte) (`components/dashboard/ConsoleHeader.tsx`). · P1 · M
- **T119. Page d'accueil du dashboard « vue d'ensemble »** — score moyen, findings ouverts par gravité, derniers jobs (`app/dashboard/page.tsx`). · P1 · M
- **T120. Onboarding en 3 étapes** (◻166) : vérifier un domaine → scan passif → lancer un pentest (`app/dashboard`). · P1 · M
- **T121. Fil d'Ariane console** (Pentests › Cible › Job) (`ConsoleHeader.tsx`). · P2 · S
- **T122. Détail de finding en panneau latéral** avec PoC, remédiation, CVSS, historique de statut (`PentestConsole.tsx`). · P1 · M
- **T123. Filtres avancés** par gravité, statut, catégorie, recherche texte (`PentestConsole.tsx`, `ScanResultView.tsx`). · P1 · S
- **T124. Actions groupées** sur les findings (marquer corrigé / faux positif en lot) (`app/api/jobs/[id]/findings`). · P2 · M
- **T125. Barre de progression réelle** basée sur les événements SSE (◻169) (`PentestConsole.tsx`). · P2 · S
- **T126. États d'erreur explicites** — cause + action (« domaine non vérifié → vérifier ») au lieu de messages génériques (`components/dashboard/*`). · P1 · S
- **T127. Confirmation avant actions destructrices** (supprimer clé API, retirer un membre, annuler un job) (`ApiKeysPanel.tsx`, `TeamPanel.tsx`). · P1 · S
- **T128. Raccourcis clavier** (`/` recherche, `g p` pentests, `n` nouveau scan) (`components/dashboard/*`). · P2 · S
- **T129. Palette de commandes** (Ctrl+K) pour naviguer et lancer un scan (`components/ui/CommandPalette.tsx`). · P2 · M
- **T130. Mémoriser filtres et onglets** par utilisateur (localStorage protégé par try/catch) (`PentestConsole.tsx`). · P2 · S
- **T131. Horodatage relatif + absolu au survol**, fuseau Europe/Paris (`lib/format.ts`). · P2 · S
- **T132. Rapport imprimable soigné** — page de garde, sommaire, sauts de page, en-têtes répétés (`PentestReport.tsx`, `@media print`). · P1 · S
- **T133. Vue mobile du rapport et des findings** (cartes empilées au lieu de tableaux) (`ScanResultView.tsx`). · P2 · S
- **T134. Comparaison visuelle de deux scans** (◻19 diff détaillé) — nouveaux / corrigés / inchangés (`app/dashboard/compare`). · P1 · M

## A9. Marketing & visuel du site

- **T135. Captures réelles du produit** dans le hero et la section Plateforme au lieu du seul terminal simulé (`components/Hero.tsx`, `Features.tsx`). · P1 · S
- **T136. Démo vidéo courte** (30–60 s) d'un pentest avec graphe d'agents (`components/HowItWorks.tsx`). · P2 · M
- **T137. Exemple de rapport téléchargeable** (PDF anonymisé) — preuve concrète (`public/exemple-rapport.pdf`, `Offers.tsx`). · P1 · S
- **T138. Section « Ce que Sentinel a trouvé »** — cas anonymisés (◻178) (`components/`). · P1 · M
- **T139. Tableau comparatif** Sentinel vs scanner classique vs pentest manuel (◻181) (`components/Compare.tsx`). · P2 · S
- **T140. Pricing lisible** — 3 colonnes avec limites claires, toggle mensuel/annuel, FAQ prix (`components/Pricing.tsx`). · P1 · S
- **T141. Badges de confiance** — hébergement UE, RGPD, divulgation responsable, nombre de contrôles (`components/Group.tsx`). · P2 · S
- **T142. CTA secondaire « Scan gratuit sans compte »** relié à T88 (`components/Hero.tsx`, `CtaFinal.tsx`). · P1 · S
- **T143. Section Intégrations avec logos** (GitHub, Slack, Jira, Linear, Claude/MCP) (`components/Integrations.tsx`). · P2 · S
- **T144. Formulaire de contact qualifié** (taille d'entreprise, périmètre, échéance) (`components/ContactForm.tsx`). · P2 · S
- **T145. Page 404 utile** — liens vers scan gratuit, tarifs, contact (`app/not-found.tsx`). · P2 · S

## A10. Mode clair / sombre

- **T146. Sélecteur à 3 états** Clair / Sombre / Système (clair reste le défaut) (`components/ui/ThemeToggle.tsx`). · P2 · S
- **T147. Mémoriser le thème côté compte** (colonne `users.theme`) pour le retrouver sur un autre appareil (`app/api/account`). · P2 · S
- **T148. `theme-color` dynamique** — mettre à jour la meta quand l'utilisateur passe en sombre (`ThemeToggle.tsx`). · P2 · S
- **T149. Audit visuel du mode sombre** sur toutes les pages du dashboard (badges, graphes, code) (`app/globals.css`). · P1 · S
- **T150. Coloration syntaxique des PoC** adaptée aux deux thèmes (`PentestConsole.tsx`). · P2 · S
- **T151. Rapport imprimé toujours en clair**, quel que soit le thème actif (`@media print` dans `app/globals.css`). · P1 · S
- **T152. Images/logos adaptés au sombre** (variantes ou `filter` contrôlé) (`components/Header.tsx`, `Footer.tsx`). · P2 · S
- **T153. Tests de régression visuelle** clair + sombre (Playwright `toHaveScreenshot`) (`tests/e2e/visual.spec.ts`). · P2 · M
- **T154. Toggle de thème présent dans la console** (pas seulement sur le site public) (`ConsoleHeader.tsx`). · P2 · S
- **T155. Respect de `prefers-contrast: more`** — variante contraste élevé (◻125) (`app/globals.css`). · P2 · M

---

# Partie B — Améliorations fonctionnelles (application & outil)

## B1. Authentification & compte

- **F1. Réinitialisation du mot de passe par e-mail** — jeton à usage unique 30 min (◻29) (`app/api/auth/reset`, `lib/email.ts`). · P0 · M
- **F2. Vérification de l'e-mail à l'inscription** (◻53) — obligatoire avant tout pentest (`app/api/auth/verify`). · P0 · M
- **F3. Connexion Google / GitHub (OAuth)** (◻30) (`app/api/auth/oauth/*`). · P1 · M
- **F4. MFA TOTP** (+ codes de secours), imposable par l'org (`lib/mfa.ts`, `qrcode` déjà en dev-deps). · P1 · M
- **F5. Passkeys / WebAuthn** en option (`lib/webauthn.ts`). · P2 · L
- **F6. Liste des sessions actives** et déconnexion à distance (dépend de T16) (`app/dashboard/account`). · P2 · M
- **F7. Suppression de compte et export RGPD** de ses données (`app/api/account/delete`, `/export`). · P1 · M
- **F8. Captcha léger** (Turnstile gratuit) après échecs répétés (◻51) (`app/api/auth/login`). · P1 · S

## B2. Facturation, offres & quotas

- **F9. Plans réels** (Gratuit / Pro / Équipe / Managé) en base, reflétés dans `Pricing.tsx` (`lib/plans.ts`). · P0 · M
- **F10. Quotas par plan** (◻28) — scans passifs/jour, pentests/mois, domaines, membres (`lib/quota.ts`, `app/api/jobs`, `app/api/scan`). · P0 · M
- **F11. Paiement Stripe** (Checkout + portail client + webhooks) (`app/api/billing/*`). · P1 · L
- **F12. Suivi du coût LLM par job et par org** — `cost_usd` agrégé, plafond mensuel (`lib/jobs.ts`). · P1 · S
- **F13. Page « Utilisation »** — consommation vs quota, historique de facturation (`app/dashboard/usage`). · P1 · M
- **F14. Essai gratuit Pro 14 jours** avec rappel e-mail avant fin (`lib/plans.ts`, cron). · P2 · M
- **F15. Devis automatique pour l'audit managé** depuis le formulaire (périmètre → fourchette) (`components/ContactForm.tsx`). · P2 · M

## B3. Organisations & équipes

- **F16. Invitations par e-mail** pour les personnes sans compte (lien signé, expiration) (`lib/orgs.ts`, `app/api/team/invite`). · P0 · M
- **F17. Domaines vérifiés au niveau de l'organisation** (et non par utilisateur) (`lib/domains.ts`, table `verified_domains.org_id`). · P0 · M
- **F18. Plusieurs organisations par utilisateur** avec sélecteur d'org dans la console (`ConsoleHeader.tsx`). · P1 · M
- **F19. Projets / actifs** (◻26) — regrouper cibles, scans et pentests par application (`lib/projects.ts`). · P1 · L
- **F20. Transfert de propriété d'org** et départ d'un membre (`app/api/team`). · P2 · S
- **F21. SSO SAML/OIDC** pour l'offre Équipe/Entreprise (`lib/sso.ts`). · P2 · L
- **F22. Export de l'audit log** (CSV) et filtres par membre/action (`app/api/team/audit`). · P2 · S

## B4. Cibles & vérification de domaine

- **F23. Vérification par balise meta HTML** en plus de TXT/fichier (`lib/domains.ts`). · P2 · S
- **F24. Re-vérification périodique** — la propriété expire si l'enregistrement TXT disparaît (cron) (`lib/domains.ts`). · P1 · S
- **F25. Périmètre d'autorisation signé** — l'utilisateur accepte une lettre d'autorisation (date, périmètre, exclusions) avant tout pentest ; PDF archivé (`app/dashboard/pentest`, `lib/audit.ts`). · P0 · M
- **F26. Exclusions de chemins et fenêtres horaires** pour les pentests (ex. pas de `/checkout`, uniquement la nuit) (`lib/jobs.ts`, `lib/playbooks.ts`). · P1 · M
- **F27. Cibles authentifiées** — fournir un compte de test / cookie / en-tête pour scanner derrière le login (secret chiffré, T6) (`lib/jobs.ts`, worker). · P1 · L
- **F28. Cibles API** — import OpenAPI/Postman pour tester une API (`worker/`, `lib/playbooks.ts`). · P1 · L

## B5. Moteur de scan passif

- **F29. Versions TLS / suites faibles** (◻74) via `node:tls` (`lib/deepchecks.ts`). · P1 · S
- **F30. DKIM** (◻81) — sélecteurs courants (`lib/deepchecks.ts`). · P2 · S
- **F31. Score vie privée** — trackers tiers chargés, cookies déposés avant consentement (◻85) (`lib/scanner.ts`). · P1 · M
- **F32. En-têtes CDN / `Vary` / cache** (◻84) (`lib/scanner.ts`). · P2 · S
- **F33. Détection de bibliothèques JS vulnérables** (jQuery, Angular… via signatures + OSV) (`lib/cve.ts`). · P1 · M
- **F34. Vérification DNSSEC, CAA, MTA-STS** (`lib/deepchecks.ts`). · P2 · S
- **F35. Takeover de sous-domaines** — CNAME pendants vers services tiers (`lib/recon.ts`). · P1 · M

## B6. Moteur Strix (pentest IA)

- **F36. Choix du modèle LLM par plan** — remplacer le défaut `gemini-2.0-flash` par un modèle plus capable pour Pro/Managé, budget configurable (`worker/github-actions/strix-pentest.yml:34`). · P1 · S
- **F37. Budget par job visible et ajustable** (0,50 $ par défaut) avec estimation avant lancement (`app/dashboard/pentest`, `lib/jobs.ts`). · P1 · S
- **F38. Annulation d'un pentest en cours** (cancel du run GitHub Actions) (`app/api/jobs/[id]/cancel`, `lib/github.ts`). · P1 · S
- **F39. Re-test d'un finding** — relancer uniquement la vérification d'une vuln corrigée (`lib/playbooks.ts`). · P1 · M
- **F40. Déduplication inter-jobs** — même vuln sur plusieurs runs = un seul finding avec historique (`lib/jobs.ts`). · P1 · M
- **F41. Score de confiance / validation humaine** des findings IA avant export client (`PentestConsole.tsx`). · P1 · S
- **F42. Captures de preuve** (T2.5 de la roadmap) liées au stockage (T48) (`lib/screenshot.ts`). · P1 · M
- **F43. Playbooks personnalisés par org** (éditeur + versionnage) (`lib/playbooks.ts`). · P2 · M
- **F44. File d'attente visible** — position et temps d'attente estimé quand plusieurs jobs sont en attente (`app/dashboard/pentest`). · P2 · S

## B7. Rapports & conformité

- **F45. PDF généré côté serveur** (Playwright/Chromium) au lieu de `window.print()` — rapport signé, horodaté, avec logo client (`app/api/jobs/[id]/pdf`). · P1 · M
- **F46. Rapport exécutif + rapport technique** séparés (synthèse pour la direction) (`PentestReport.tsx`). · P1 · S
- **F47. Correspondance référentiels** — OWASP Top 10, ISO 27001 A.8, NIS2, PCI-DSS par finding (`lib/compliance.ts`). · P1 · M
- **F48. Lien de partage en lecture seule** d'un rapport (expiration, mot de passe) (`app/r/[token]`). · P2 · M
- **F49. Export XLSX** (◻ roadmap T3.3) (`app/api/jobs/[id]/export`). · P2 · S
- **F50. Attestation « dernier audit »** (badge / page publique de confiance) pour les clients (`app/trust/[org]`). · P2 · M

## B8. Intégrations, API & MCP

- **F51. Notifications Microsoft Teams et Discord** en plus de Slack (`lib/notify.ts`). · P2 · S
- **F52. Synchronisation bidirectionnelle Jira/Linear** — un ticket fermé passe le finding en « corrigé » (webhooks entrants) (`lib/tickets.ts`). · P2 · M
- **F53. API REST publique documentée** (OpenAPI) pour scans, jobs, findings (`app/api/v1/*`, `public/openapi.json`). · P1 · M
- **F54. Outils MCP supplémentaires** — `list_findings`, `update_finding_status`, `verify_domain`, `get_report` (`app/api/mcp/route.ts`). · P2 · S
- **F55. Webhooks sortants signés (HMAC)** par événement (job.done, finding.created, score.regression) (`lib/notify.ts`). · P1 · S

---

# Partie C — Top 15 à faire en premier

| # | Item | Pourquoi maintenant | Effort |
|---|---|---|---|
| 1 | **T1 + T2 + T3** — Corriger le rapprochement des domaines (+ PSL + tests) | Faille d'autorisation : l'apex débloque tous les sous-domaines, les sous-domaines vérifiés ne marchent pas | S |
| 2 | **F25** — Lettre d'autorisation de pentest signée et archivée | Protection juridique avant tout test offensif | M |
| 3 | **T6 + T7** — Chiffrer et masquer les secrets d'intégration | Jetons Jira/Linear/Slack en clair en base | M |
| 4 | **T4** — TLS Postgres vérifié | `rejectUnauthorized: false` permet une interception | S |
| 5 | **T5 + T14 + T12** — Secret cron constant-time, webhooks validés, redirections revalidées | Correctifs sécurité rapides | S–M |
| 6 | **T29 + T32 + T40** — Migrations versionnées, purge `rate_events`, jobs orphelins | Stabilité de la base et de la file | M |
| 7 | **F1 + F2** — Réinitialisation du mot de passe et vérification e-mail | Fonctions attendues de tout SaaS | M |
| 8 | **F16 + F17** — Invitations par e-mail et domaines au niveau de l'org | Débloque l'usage en équipe | M |
| 9 | **F9 + F10** — Plans et quotas réels | La page Tarifs ne correspond à rien côté produit | M |
| 10 | **T71 + T72** — Sentry et logs structurés | On ne voit pas les erreurs en prod aujourd'hui | S |
| 11 | **T66 + T68** — e2e Playwright et tests d'autorisation | Filet de sécurité avant les gros chantiers | M |
| 12 | **T104 → T108** — Primitives UI (Button, Input, Dialog, Table, Badge) | Prérequis pour découper les gros composants | M |
| 13 | **T43 + T44** — Découper `PentestConsole` et `DashboardClient` | Maintenabilité (623 et 512 lignes) | M |
| 14 | **F45 + F36** — PDF serveur et modèle LLM selon le plan | Qualité perçue du livrable payant | M |
| 15 | **T81 + T82 + T53** — Sitemap, robots.txt, h1 du hero visible | Gains SEO/LCP rapides | S |
