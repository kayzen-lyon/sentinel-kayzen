---
title: Clés API et secrets dans le code : éviter les fuites
description: Dépôt Git, bundle JavaScript, journaux, images Docker : où fuient les clés API, comment les protéger et que faire en urgence quand l'une d'elles est exposée.
track: developpeurs
level: avance
order: 9
minutes: 7
updated: 2026-11-22
tags: secrets, clés API, Git, variables d'environnement, rotation, CI/CD
---
Une clé API, un mot de passe de base de données ou une clé de signature de jetons donnent un accès direct à vos systèmes, sans passer par aucune page de connexion. Or ces secrets se retrouvent régulièrement là où ils ne devraient pas : dans un dépôt Git public, dans le JavaScript envoyé au navigateur, dans un journal d'erreurs ou dans une image Docker publiée. Des robots parcourent en permanence les plateformes publiques à la recherche de ces fuites, et une clé exposée peut être exploitée en quelques minutes.

## Ce que vous allez apprendre

- Les endroits où les secrets fuient le plus souvent.
- Pourquoi supprimer un secret d'un fichier ne suffit pas avec Git.
- Le piège des variables d'environnement exposées au navigateur.
- Comment stocker, limiter et détecter les secrets.
- La procédure à suivre quand une clé a fuité.

## Où fuient les secrets

> [!definition] Secret : toute information qui donne un accès ou une capacité et qui ne doit être connue que des systèmes autorisés : clés API, mots de passe de services, clés de signature, jetons d'accès, clés privées, chaînes de connexion.

Les sources de fuite les plus courantes :

- **Le code source** : une clé écrite « temporairement » dans un fichier, puis commitée.
- **L'historique Git** : un fichier `.env` ajouté par erreur puis supprimé reste présent dans l'historique.
- **Le code client** : tout ce qui est envoyé au navigateur ou embarqué dans une application mobile est lisible par l'utilisateur.
- **Les journaux** : en-têtes d'autorisation, URL contenant des jetons ou objets de configuration journalisés en entier.
- **Les artefacts** : images Docker, archives de déploiement, cartes de sources (source maps), journaux d'intégration continue.

L'utilisation d'identifiants codés en dur est une faiblesse répertoriée (CWE-798), rattachée dans le [Top 10 OWASP](/blog/owasp-top-10-explique) 2021 à la catégorie **A07:2021 – Identification and Authentication Failures**.

## Le piège de l'historique Git

```javascript
// Vulnérable : la clé est dans le code
const stripe = new Stripe("sk_live_51H...");
```

Le développeur s'en aperçoit et corrige dans un nouveau commit :

```javascript
// Corrigé : la clé est lue depuis l'environnement
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
```

Mais le commit précédent existe toujours. Toute personne qui clone le dépôt peut le consulter. Réécrire l'historique est possible, mais les clones, les copies et les caches existants conservent l'ancienne version. **Un secret commité doit être considéré comme compromis**, même si le dépôt est privé : il est accessible à tous ceux qui ont accès au dépôt, aux outils connectés et aux sauvegardes.

> [!exemple] Une développeuse rend public le dépôt d'un projet interne pour le présenter dans son portfolio. Trois ans plus tôt, un commit contenait un fichier `.env` avec la clé d'accès au compte de stockage cloud de l'entreprise, supprimé le lendemain. La clé n'a jamais été changée. Quelques heures après la publication, des machines virtuelles de minage de cryptomonnaie sont lancées sur le compte de l'entreprise, et la facture grimpe. La clé aurait dû être révoquée le jour même de la première erreur.

## Le piège des variables d'environnement côté client

Les frameworks modernes distinguent les variables lisibles uniquement par le serveur de celles injectées dans le code envoyé au navigateur. Dans Next.js, toute variable préfixée par `NEXT_PUBLIC_` est intégrée au bundle client ; dans Vite, c'est le préfixe `VITE_`.

```typescript
// Vulnérable : la clé secrète finit dans le JavaScript public
const client = new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_KEY, dangerouslyAllowBrowser: true });

// Corrigé : l'appel passe par une route serveur qui garde la clé
// app/api/resume/route.ts (exécuté uniquement côté serveur)
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
```

> [!attention] Certaines clés sont conçues pour être publiques (clé publiable d'un prestataire de paiement, clé « anonyme » d'un backend comme service). Elles ne sont sûres que si la protection repose ailleurs : règles d'accès côté serveur, politiques au niveau des lignes de la base, restrictions de domaine. Vérifiez la documentation du fournisseur pour chaque clé exposée.

## Stocker et limiter les secrets

L'[aide-mémoire OWASP sur la gestion des secrets](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html) détaille les bonnes pratiques. L'essentiel :

1. **Hors du code** : variables d'environnement configurées dans la plateforme d'hébergement, ou gestionnaire de secrets dédié (coffre du fournisseur cloud, Vault, etc.).
2. **Fichiers locaux ignorés** : `.env` et ses variantes dans le `.gitignore` dès la création du projet, avec un fichier `.env.example` sans valeurs réelles pour documenter les variables attendues.
3. **Moindre privilège** : une clé par usage et par environnement, avec uniquement les droits nécessaires (lecture seule si possible, restriction par domaine ou adresse IP quand le fournisseur le permet).
4. **Rotation** : prévoyez de pouvoir changer une clé sans interruption, et faites-le régulièrement.
5. **Journaux propres** : masquez les en-têtes `Authorization` et les champs sensibles avant de journaliser.

```bash
# .gitignore
.env
.env.*
!.env.example
```

## Détecter avant qu'il ne soit trop tard

La détection automatique rattrape les erreurs humaines :

- **Avant le commit** : un crochet (hook) de pré-commit avec un outil d'analyse de secrets comme gitleaks ou trufflehog bloque les commits contenant des motifs de clés connus.
- **À l'envoi** : les plateformes d'hébergement de code proposent une analyse des secrets et une protection qui refuse l'envoi d'un commit contenant une clé reconnue. Activez-les.
- **Dans l'intégration continue** : analysez aussi les images Docker et les artefacts produits, et vérifiez que les journaux de CI masquent les secrets.

## Quand une clé a fuité : la procédure

L'ordre des actions compte :

1. **Révoquer ou changer la clé immédiatement** chez le fournisseur. C'est l'action prioritaire : nettoyer le dépôt sans révoquer la clé ne protège de rien.
2. **Déployer la nouvelle clé** dans l'environnement concerné.
3. **Analyser les journaux du fournisseur** pour savoir si la clé a été utilisée et ce qui a été fait.
4. **Nettoyer l'historique** si nécessaire, avec un outil dédié comme `git filter-repo`, en sachant que cela ne supprime pas les copies existantes.
5. **Comprendre la cause** et ajouter la protection manquante (analyse pré-commit, `.gitignore`, revue).

Si des données personnelles ont pu être consultées, la violation doit être évaluée au titre du RGPD, avec une éventuelle notification à la CNIL dans les 72 heures.

> [!attention] Si vous trouvez une clé exposée dans le dépôt public d'un tiers, ne l'utilisez jamais, même pour « vérifier qu'elle fonctionne » : ce serait un accès frauduleux (Code pénal, article 323-1). Signalez-la au propriétaire. Pour vous entraîner à repérer des fuites, [OWASP Juice Shop](https://owasp.org/www-project-juice-shop/) contient des défis dédiés, et certains programmes de bug bounty acceptent les signalements de fuites dans leur périmètre.

## À retenir

- Un secret commité, même supprimé ensuite, doit être considéré comme compromis.
- Tout ce qui est envoyé au navigateur est public : attention aux préfixes NEXT_PUBLIC_ et VITE_.
- Secrets hors du code, une clé par usage, droits minimaux et rotation possible.
- Analyse des secrets avant le commit et à l'envoi pour rattraper les erreurs.
- En cas de fuite : révoquer d'abord, analyser ensuite, nettoyer enfin.

## Quiz

?? Vous avez commité une clé API par erreur, puis l'avez supprimée dans le commit suivant. Est-ce suffisant ?
- [ ] Oui, la clé n'est plus visible dans le code
- [ ] Oui, si le dépôt est privé
- [x] Non, la clé reste dans l'historique et doit être révoquée
=> L'historique Git conserve l'ancienne version ; seule la révocation de la clé supprime le risque.

?? Dans Next.js, que devient une variable nommée NEXT_PUBLIC_API_SECRET ?
- [ ] Elle reste uniquement sur le serveur
- [x] Elle est intégrée au JavaScript envoyé au navigateur, donc publique
- [ ] Elle est chiffrée automatiquement
=> Le préfixe NEXT_PUBLIC_ indique explicitement une variable destinée au code client.

?? Une clé a fuité sur un dépôt public. Quelle est la première action ?
- [x] Révoquer ou changer la clé chez le fournisseur
- [ ] Réécrire l'historique Git
- [ ] Rendre le dépôt privé
=> Tant que la clé est valide, elle peut être utilisée par quiconque l'a copiée ; le nettoyage vient après.

?? Quel outil permet de bloquer un commit contenant un secret avant qu'il ne quitte votre poste ?
- [ ] Un pare-feu applicatif
- [x] Un crochet de pré-commit avec un outil d'analyse de secrets
- [ ] Un certificat TLS
=> L'analyse au moment du commit arrête la fuite avant même l'envoi vers le dépôt distant.
