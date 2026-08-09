# Sentinel by Kayzen — 200 améliorations

Statut : ✅ appliquée · 🔄 partielle · ◻ backlog priorisé

Ce tour a transformé le site vitrine en **outil opérationnel** (authentification + scanner
de sécurité réel + dashboard) et l'a durci. Beaucoup d'items ✅ ci-dessous sont donc déjà
en production ; les ◻ constituent une feuille de route claire et exécutable.

---

## A. Produit & fonctionnel
1. ✅ Scanner de sécurité réel exécuté côté serveur (plus de simple maquette)
2. ✅ Saisie d'URL par le client et lancement direct du scan
3. ✅ Authentification obligatoire avant tout scan (client identifié)
4. ✅ Inscription e-mail + mot de passe
5. ✅ Connexion / déconnexion
6. ✅ Sessions signées (JWT httpOnly, 7 jours)
7. ✅ Protection des routes `/dashboard` (proxy/middleware)
8. ✅ Redirection post-login vers la page demandée (`?next=`)
9. ✅ Historique des scans par utilisateur (persisté en base)
10. ✅ Consultation d'un scan passé (détail complet)
11. ✅ Note de sécurité A→F + score /100
12. ✅ Regroupement des findings par gravité
13. ✅ Recommandation concrète par finding
14. ✅ Progression animée en temps réel pendant le scan
15. ✅ État vide (aucun scan) soigné
16. ✅ Mode démo si base non connectée (scan quand même fonctionnel)
17. ✅ CTA du site reliés au vrai produit (`/signup`, `/login`)
18. ✅ Ré-exécuter un scan en un clic depuis l'historique
19. 🔄 Comparaison de scans (sparkline d'évolution ✅ ; diff détaillé ◻)
20. ✅ Export PDF du rapport de scan (impression / PDF)
21. ✅ Export JSON + CSV des findings
22. ✅ Envoi du rapport par e-mail (Resend, `lib/email.ts` — auto en fin de pentest + envoi manuel)
23. ✅ Scans planifiés (quotidien / hebdomadaire) — `lib/scheduled.ts` + Vercel Cron
24. ✅ Alertes en cas de régression du score — notification Slack/webhook (`/dashboard/monitoring`)
25. ✅ Vérification de propriété du domaine (DNS TXT / fichier) avant scans approfondis
26. ◻ Multi-cibles / projets par compte
27. ✅ Rôles & équipes (organisations + RBAC owner/admin/member/viewer, `lib/orgs.ts`, `/dashboard/team`)
28. ◻ Quotas selon l'offre (gratuit vs plateforme)
29. 🔄 Gestion du compte + changement de mot de passe ✅ ; réinitialisation par e-mail ◻
30. ◻ Connexion via Google / GitHub (OAuth)

## B. Sécurité applicative (notre propre site)
31. ✅ Garde anti-SSRF (blocage localhost, IP privées, 169.254.169.254)
32. ✅ Validation stricte du schéma (http/https only)
33. ✅ Résolution DNS avant scan (refus des cibles internes)
34. ✅ Content-Security-Policy sur tout le site
35. ✅ HSTS (max-age 2 ans, includeSubDomains, preload)
36. ✅ X-Content-Type-Options: nosniff
37. ✅ X-Frame-Options: SAMEORIGIN
38. ✅ Referrer-Policy: strict-origin-when-cross-origin
39. ✅ Permissions-Policy restrictive
40. ✅ Cross-Origin-Opener-Policy: same-origin
41. ✅ Suppression de l'en-tête `X-Powered-By`
42. ✅ Cookies de session httpOnly + Secure (en prod) + SameSite=Lax
43. ✅ `AUTH_SECRET` fort injecté dans Vercel (prod + dev)
44. ✅ Hachage des mots de passe (bcrypt, coût 10)
45. ✅ Politique de mot de passe (8+, casse mixte, chiffre)
46. ✅ Message de connexion générique (anti-énumération de comptes)
47. ✅ `/.well-known/security.txt` publié (RFC 9116)
48. ✅ Timeouts sur toutes les requêtes sortantes du scanner
49. ✅ User-Agent identifiable et transparent pour le scanner
50. ✅ Rate-limiting des endpoints d'auth, de scan et de domaines (Postgres, fenêtre glissante)
51. 🔄 Protection anti-bruteforce (rate-limit par IP ✅ ; captcha ◻)
52. ◻ CSP par nonce (retirer `unsafe-inline` sur les scripts)
53. ◻ Vérification e-mail à l'inscription (double opt-in)
54. ✅ Journalisation des connexions et audit trail (`lib/audit.ts`, table `audit_log`, vue `/dashboard/team`)
55. ◻ Rotation programmée du secret de session

## C. Scanner — couverture des contrôles
56. ✅ HTTPS actif / absent
57. ✅ Redirection HTTP → HTTPS
58. ✅ HSTS présent et robuste
59. ✅ Content-Security-Policy (+ détection unsafe-inline/eval)
60. ✅ X-Content-Type-Options
61. ✅ X-Frame-Options / frame-ancestors
62. ✅ Referrer-Policy
63. ✅ Permissions-Policy
64. ✅ Cookies (Secure / HttpOnly / SameSite)
65. ✅ CORS trop permissif (`*`)
66. ✅ Divulgation de version serveur (Server / X-Powered-By)
67. ✅ Présence de security.txt
68. ✅ Exposition de `.env`
69. ✅ Exposition de `.git/config`
70. ✅ Exposition de `server-status`
71. ✅ Temps de réponse mesuré
72. ✅ Scoring pondéré par gravité + note A→F
73. ✅ Analyse du certificat TLS (émetteur, expiration, validité) — scan approfondi
74. ◻ Détection des versions TLS/ciphers faibles
75. ✅ Vérification `robots.txt` / `sitemap.xml` — scan approfondi
76. ✅ Détection de la techno (Server, X-Powered-By, Vercel, Next.js, WordPress…)
77. ✅ Correspondance versions ↔ CVE connues (NVD, `lib/cve.ts`, cache Postgres, clé `NVD_API_KEY` optionnelle)
78. ✅ Détection de contenu mixte (mixed content) — scan approfondi
79. ✅ Contrôle `Cache-Control` sur la réponse principale
80. ✅ Détection de sous-domaines (énumération passive via Certificate Transparency / crt.sh, `lib/recon.ts`)
81. 🔄 Enregistrements SPF / DMARC ✅ (scan approfondi) — DKIM ◻
82. ✅ Détection de pages d'admin/login exposées (balayage GET borné, `lib/recon.ts`)
83. ✅ Analyse des formulaires (CSRF token, autocomplete) via `node-html-parser`
84. ◻ Vérification des en-têtes de cache CDN / Vary
85. ◻ Score de confidentialité (trackers tiers chargés)

## D. SEO & découvrabilité
86. ✅ `metadataBase` défini
87. ✅ Titre + template de titre par page
88. ✅ Meta description riche
89. ✅ Open Graph complet + image 1200×630
90. ✅ Twitter Card `summary_large_image`
91. ✅ JSON-LD Organization + WebSite + Service (@graph)
92. ✅ `sitemap.xml` généré
93. ✅ `robots.txt` (sans BOM)
94. ✅ Pages privées en `noindex` (login, dashboard, légal)
95. ✅ `lang="fr"` sur `<html>`
96. ✅ Favicon + apple-icon
97. ✅ Manifest PWA (theme-color, icônes)
98. ◻ Balise canonical explicite par page
99. ◻ Sitemap enrichi (lastmod dynamique par contenu)
100. ◻ Page blog + articles (contenu SEO cybersécurité)
101. ✅ FAQ structurée en JSON-LD (`FAQPage`)
102. ◻ Fil d'Ariane + `BreadcrumbList`
103. ◻ Balises hreflang (si version EN)
104. ◻ Optimisation Core Web Vitals (mesure Lighthouse)
105. ◻ Données structurées `AggregateRating` (avec vrais avis)

## E. Accessibilité (RGAA / WCAG 2.1 AA)
106. ✅ Lien d'évitement « Aller au contenu »
107. ✅ Structure sémantique (header/main/footer/nav)
108. ✅ Titres hiérarchisés (un seul h1 par page)
109. ✅ `aria-label` sur les boutons icônes
110. ✅ `aria-expanded` sur menu mobile et FAQ
111. ✅ `aria-live` sur la zone de résultats de scan
112. ✅ `role="alert"` sur les messages d'erreur
113. ✅ Respect de `prefers-reduced-motion`
114. ✅ Labels explicites sur les champs de formulaire
115. ✅ Focus visibles (ring sur inputs)
116. ✅ Textes alternatifs sur images informatives
117. ✅ Icônes décoratives `aria-hidden`
118. ◻ Audit RGAA complet + taux de conformité
119. ◻ Test lecteur d'écran (NVDA / VoiceOver)
120. ◻ Contrôle automatisé des contrastes (tous états)
121. ◻ Piège de focus dans le menu mobile
122. ◻ Gestion de la touche Échap (fermer menus/modales)
123. ◻ Ordre de tabulation vérifié de bout en bout
124. ◻ Messages d'erreur reliés aux champs (`aria-describedby`)
125. ◻ Version « contraste élevé »

## F. Performance
126. ✅ Polices auto-hébergées via `next/font` (pas de FOUT)
127. ✅ `font-display: swap`
128. ✅ Images servies via `next/image` (optimisation)
129. ✅ `priority` sur le logo au-dessus de la ligne de flottaison
130. ✅ Lazy-loading des images hors écran
131. ✅ Rendu statique des pages marketing
132. ✅ CSS via Tailwind v4 (purge automatique)
133. ◻ Préchargement `preconnect` des origines critiques
134. ◻ Budget de performance + suivi Lighthouse CI
135. ◻ Compression Brotli vérifiée (Vercel par défaut)
136. ◻ Squelettes de chargement (skeletons) sur le dashboard
137. ◻ Cache des résultats de scan côté client
138. ◻ Découpage de code plus fin (dynamic import)
139. ◻ Optimisation du poids du logo (WebP/AVIF)
140. ◻ Streaming SSR pour le dashboard

## G. UX & visuel
141. ✅ Charte graphique reprise de Nexus (cohérence groupe)
142. ✅ Logo Sentinel intégré (emblème détouré) partout
143. ✅ Thème sombre cohérent (fond zinc-950)
144. ✅ Grille lumineuse + halo bleu sur le hero
145. ✅ Aperçu terminal de scan dans le hero
146. ✅ Cartes avec hover (élévation + bordure)
147. ✅ Boutons primaires avec glow de marque
148. ✅ Animations d'entrée (reveal) échelonnées
149. ✅ Accordéon FAQ animé
150. ✅ Menu mobile plein écran
151. ✅ Header sticky avec fond au scroll
152. ✅ Badges de gravité colorés (risk/warn/safe)
153. ✅ Note A→F en pastille colorée
154. ✅ Spinner de scan + étapes de progression
155. ✅ Page 404 personnalisée
156. ✅ Écran d'erreur (error boundary) stylé
157. ✅ Écran de chargement global
158. ✅ Console dashboard (header dédié + déconnexion)
159. ✅ Historique cliquable en barre latérale
160. ◻ Notifications toast (succès / erreur)
161. ◻ Mode clair optionnel (toggle thème)
162. ◻ Micro-interactions au survol des findings
163. ✅ Sparkline d'évolution du score par domaine
164. ✅ Filtre des findings (tous / problèmes uniquement)
165. ✅ Copie en un clic d'une recommandation
166. ◻ Onboarding (première visite du dashboard)
167. ◻ Illustrations / pictos personnalisés par catégorie
168. ✅ Animation de la note qui « compte » jusqu'au score
169. ◻ Barre de progression réelle (SSE) plutôt qu'estimée
170. ◻ Aperçu OG dynamique par scan partagé

## H. Contenu & copywriting
171. ✅ Discours aligné sur l'offre hybride (managé + self-service)
172. ✅ Section « constat » (pourquoi maintenant)
173. ✅ Capacités décrites depuis les vraies fonctions Strix
174. ✅ Couverture OWASP présentée (8 familles)
175. ✅ FAQ orientée objections client
176. ✅ Écosystème Kayzen (Nexus, Konforme) mis en avant
177. ◻ Chiffres du hero remplacés par des données vérifiables
178. ◻ Études de cas / témoignages réels
179. ◻ Glossaire cybersécurité (SEO longue traîne)
180. ◻ Page « Comment ça marche » détaillée
181. ◻ Comparatif Sentinel vs scanners classiques
182. ◻ Page dédiée à l'audit managé
183. ◻ Ton et relecture professionnelle FR complète
184. ◻ Version anglaise du site
185. ◻ Newsletter sécurité (capture d'e-mails)

## I. Technique, DX & conformité
186. ✅ Next.js 16 + React 19 + TypeScript strict
187. ✅ Postgres standard (Neon / Vercel / Supabase) via `DATABASE_URL`
188. ✅ Schéma auto-créé (idempotent) — zéro migration manuelle
189. ✅ Séparation logique JWT pure / cookies serveur (edge-safe)
190. ✅ Runtime Node explicite sur les routes sensibles
191. ✅ `maxDuration` configuré pour les scans
192. ✅ Build de production validé (0 erreur TS)
193. ✅ Convention `proxy` de Next 16 (plus de warning middleware)
194. ✅ Auto-déploiement GitHub → Vercel actif
195. ✅ 4 pages légales FR (structure prête)
196. ✅ Tests automatisés (SSRF, validation, domaines) — `npm test` (node:test)
197. ◻ CI GitHub Actions (lint + build + tests)
198. ◻ Surveillance d'erreurs (Sentry ou équivalent)
199. ◻ Analytics respectueux de la vie privée (Plausible)
200. ◻ Bannière cookies / consentement si trackers ajoutés

---

### Prochaines priorités recommandées
1. Brancher Neon (`DATABASE_URL`) → active comptes + historique persistants.
2. Rate-limiting auth + scan (item 50) et vérification e-mail (53).
3. Vérification de propriété du domaine (item 25) pour débloquer des contrôles plus poussés.
4. Export PDF/JSON des rapports (20-21) et re-scan en un clic (18).
5. Analyse TLS/certificat (73-74) et détection techno ↔ CVE (76-77).
