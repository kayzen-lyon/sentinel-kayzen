# Politique de sécurité

Sentinel est un outil de cybersécurité : la sécurité de son propre code est une
priorité de premier ordre. Merci de nous aider à la maintenir.

## Signaler une vulnérabilité

**Ne créez pas d'issue publique pour une faille de sécurité.**

Contactez-nous en privé :

- **security@kayzen-lyon.fr** (canal privilégié)
- Sauvegarde : contact@kayzen-lyon.fr

Voir aussi notre [`security.txt`](https://sentinel.kayzen-lyon.com/.well-known/security.txt)
(RFC 9116).

Merci d'inclure, dans la mesure du possible :

- une description de la vulnérabilité et de son impact ;
- les étapes de reproduction (PoC) ;
- la version / le commit concerné ;
- toute atténuation que vous auriez identifiée.

## Notre engagement

- **Accusé de réception** sous 72 h.
- **Évaluation initiale** (sévérité, périmètre) sous 7 jours.
- Nous vous tenons informé de la correction et créditons publiquement les
  rapporteurs qui le souhaitent (sauf demande d'anonymat).
- Nous vous demandons un **délai raisonnable de correction** avant toute
  divulgation publique (divulgation coordonnée).

## Périmètre

En scope : le code de ce dépôt et le service déployé sur
`https://sentinel.kayzen-lyon.com`.

Hors scope : les rapports générés automatiquement sans preuve d'exploitabilité,
les attaques nécessitant un accès physique ou l'ingénierie sociale d'employés, le
déni de service volumétrique.

## Versions supportées

Seule la branche `main` (et le dernier déploiement de production) reçoit des
correctifs de sécurité. Ce projet suit un modèle de livraison continue.

## Chaîne de sécurité automatisée

Chaque _pull request_ et _push_ sur `main` déclenche (voir
[`.github/workflows/ci.yml`](.github/workflows/ci.yml)) :

- **ESLint + eslint-plugin-security** — analyse statique des patterns dangereux ;
- **Semgrep** — SAST (rulesets OWASP Top 10, TypeScript, React, Next.js, secrets) ;
- **gitleaks** — détection de secrets dans l'historique git ;
- **OSV-Scanner + `npm audit`** — vulnérabilités des dépendances ;
- **Dependabot** — mises à jour de sécurité automatiques.

Les résultats SAST remontent dans l'onglet **Security** du dépôt (SARIF).
