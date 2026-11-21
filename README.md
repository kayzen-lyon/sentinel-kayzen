# Sentinel by Kayzen

[![CI](https://github.com/skyymar69-rgb/sentinel-kayzen/actions/workflows/ci.yml/badge.svg)](https://github.com/skyymar69-rgb/sentinel-kayzen/actions/workflows/ci.yml)
[![Licence: MIT](https://img.shields.io/badge/licence-MIT-blue.svg)](LICENSE)
[![Sécurité : divulgation coordonnée](https://img.shields.io/badge/sécurité-SECURITY.md-brightgreen.svg)](SECURITY.md)


Site vitrine de **Sentinel**, la nouvelle entité cybersécurité du groupe **Kayzen**
(aux côtés de [Nexus](https://nexus.kayzen-lyon.com) — SEO/IA — et
[Konforme](https://konforme.kayzen-lyon.com) — accessibilité EAA).

Sentinel propose du **pentest IA autonome** basé sur le moteur open-source
[Strix](https://strix.ai) : des agents qui trouvent, exploitent et prouvent les
vulnérabilités par des PoC réels. Offre **hybride** : audit managé par l'agence
Kayzen **+** plateforme self-service intégrée à la CI/CD.

## Application self-service (opérationnelle)

Au-delà de la vitrine, le projet embarque un **outil fonctionnel** :

- **Authentification** e-mail + mot de passe (sessions JWT httpOnly, `bcrypt`).
- **Scanner de sécurité passif réel** (`lib/scanner.ts`) : le client saisit son URL et
  Sentinel analyse en direct HTTPS/HSTS, en-têtes de sécurité, CSP, cookies, CORS,
  fuites serveur, `security.txt` et expositions (`.env`, `.git`…). Note **A→F** + score.
- **Scan approfondi du JavaScript client** (`lib/jssurface.ts`, domaine vérifié) : secrets
  exposés (clés cloud, jetons, clés privées — valeurs masquées) et **carte de surface**
  (endpoints, formulaires, paramètres → classes d'attaque), réutilisée pour cibler Strix.
- **Contrôle qualité des findings du pentest** : audit de périmètre des preuves
  (`lib/scopeAudit.ts`), relecture contradictoire par un second modèle
  (`worker/github-actions/validate_findings.py`), grille de triage en 7 questions
  (`lib/triage.ts`) et registre de couverture dans le rapport (`lib/coverage.ts`).
- **Garde anti-SSRF** (`lib/ssrf.ts`) : refuse localhost, IP privées et métadonnées cloud.
- **Dashboard** `/dashboard` protégé, avec historique des scans par utilisateur.

> Le scan est **passif et non-intrusif** (requêtes GET). Le pentest offensif complet
> (moteur Strix, exploitation, PoC) reste l'offre **audit managé**, exécutée sur infra Docker.

### Variables d'environnement

| Variable | Rôle | Requis |
|---|---|---|
| `AUTH_SECRET` | Clé de signature des sessions JWT | **Oui en prod** (défini sur Vercel) |
| `DATABASE_URL` | Postgres (Neon, Vercel Postgres ou Supabase) — comptes + historique | Oui pour l'auth |

**Brancher la base (Neon, gratuit) :** dans Vercel → projet → **Storage → Create Database
→ Neon**. La variable `DATABASE_URL` (ou `POSTGRES_URL`) est injectée automatiquement ;
au premier appel, le schéma (`users`, `scans`) est créé tout seul. Sans base, le scan
fonctionne quand même (mode démo, sans historique persistant).

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (design tokens dans `app/globals.css`)
- Polices `Outfit` (titres) + `Inter` (corps) via `next/font`
- Charte graphique reprise à l'identique de Nexus (bleu `#2563EB`, base zinc-950,
  échelle nombre d'or, typographie fluide `clamp()`).

## Démarrer

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build    # build de production
npm run start    # sert le build
```

## Structure

```
app/
  layout.tsx           # metadata SEO + Open Graph, fonts, skip-link
  page.tsx             # assemblage des sections + JSON-LD
  globals.css          # design tokens (charte Kayzen) + prose légal
  icon.png             # favicon (emblème) — auto-détecté par Next
  apple-icon.png       # icône iOS
  mentions-legales/    # \
  confidentialite/     #  } pages légales (structure FR + placeholders)
  cgu/                 #  }
  accessibilite/       # /
components/             # Header, Hero, Problem, Features, HowItWorks,
                        # Offers, Coverage, Pricing, Group, Faq, CtaFinal,
                        # Footer, LegalShell
public/
  logo-full.png        # logo complet détouré (fond transparent)
  logo-mark.png        # emblème seul (header, footer, favicon)
  og-image.png         # image de partage 1200×630
```

## Identité de marque

Logo officiel **Sentinel by Kayzen** (bouclier + aigle métallique) intégré :
fond blanc détouré → PNG transparents. L'emblème sert de marque dans le header,
le footer et le favicon ; le wordmark navy est réservé aux fonds clairs
(`logo-full.png`).

## Open source & qualité

Sentinel est **open source** sous licence **MIT** (voir [`LICENSE`](LICENSE)) :
réutilisation libre, y compris commerciale, à condition de conserver la mention
de copyright. Pour un modèle open-core protégeant l'hébergement SaaS, basculez le
fichier `LICENSE` en AGPL-3.0 et ajustez les mentions.

Chaîne de vérification **100 % open source**, exécutée en CI sur chaque PR
([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) :

| Étape | Outil | Rôle |
|---|---|---|
| Types | `tsc` | typage strict |
| Lint | ESLint + `eslint-plugin-security` | qualité + patterns dangereux |
| SAST | Semgrep (OWASP Top 10, React, Next.js, secrets) | analyse statique |
| Secrets | gitleaks | fuite de secrets dans git |
| Dépendances | OSV-Scanner + `npm audit` | CVE des paquets |
| MàJ | Dependabot | mises à jour de sécurité |

En local : `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.
Contribuer : [`CONTRIBUTING.md`](CONTRIBUTING.md) · Sécurité : [`SECURITY.md`](SECURITY.md).

## À personnaliser avant mise en ligne

- **Pages légales** — la structure est en place, mais chaque champ `[À COMPLÉTER]`
  (SIRET, hébergeur, DPO, durées…) doit être renseigné et **relu par un juriste**.
  Ces pages sont volontairement en `noindex` tant qu'elles ne sont pas finalisées.
- **Tarifs** (`components/Pricing.tsx`) — valeurs indicatives à valider.
- **Contact** — `contact@kayzen-lyon.fr` en `mailto` ; brancher un vrai formulaire /
  l'URL de la plateforme self-service.
- **Statistiques du hero** (100+, 24/7…) — à remplacer par des chiffres vérifiables.

## Licence

[MIT](LICENSE) © 2026 Kayzen Web. Composants tiers adaptés : voir [NOTICE](NOTICE).
