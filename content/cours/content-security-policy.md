---
title: Content-Security-Policy : bloquer les scripts malveillants
description: Comprendre la CSP, écrire une politique stricte avec nonces ou hashes, la tester en mode rapport et la déployer sans casser votre site.
track: site-web
level: intermediaire
order: 3
minutes: 7
updated: 2026-11-22
tags: csp, content-security-policy, xss, nonce, strict-dynamic, en-têtes http
---
Si un attaquant parvient à glisser un script dans l'une de vos pages, par un commentaire mal filtré, un plugin vulnérable ou une bibliothèque tierce compromise, ce script s'exécute avec les mêmes droits que le vôtre : il peut lire ce que tape le visiteur, détourner sa session ou le rediriger. La **Content-Security-Policy** (CSP) est un en-tête HTTP qui indique au navigateur quels scripts et quelles ressources il a le droit de charger. Bien écrite, elle transforme une faille XSS exploitable en simple message d'erreur dans la console. C'est l'en-tête le plus puissant, et aussi le plus délicat à mettre en place.

## Ce que vous allez apprendre

- Comment fonctionne une CSP et comment lire ses directives.
- Pourquoi les listes de domaines autorisés protègent mal, et ce qu'apportent les nonces et les hashes.
- À quoi sert `strict-dynamic`.
- Comment tester une politique sans rien casser grâce au mode rapport.

## Le principe : une liste de sources autorisées

Une CSP est une suite de **directives**, séparées par des points-virgules. Chacune vise un type de ressource :

```http
Content-Security-Policy: default-src 'self'; img-src 'self' https://images.exemple-cdn.fr; object-src 'none'; base-uri 'self'; frame-ancestors 'self'
```

- `default-src` : règle par défaut pour toutes les ressources non précisées.
- `script-src`, `style-src`, `img-src`, `connect-src`, `font-src` : règles par type (scripts, styles, images, requêtes JavaScript, polices).
- `object-src 'none'` : interdit les anciens plugins (Flash, applets), vecteur d'attaque inutile aujourd'hui.
- `base-uri 'self'` : empêche un attaquant d'injecter une balise `<base>` qui redirigerait vos scripts relatifs.
- `frame-ancestors` : contrôle qui peut afficher votre site dans un cadre (voir [les en-têtes de sécurité](/blog/en-tetes-de-securite-http)).

Le mot-clé `'self'` désigne votre propre origine (même protocole, même domaine, même port). Par défaut, une CSP qui restreint les scripts **bloque aussi les scripts en ligne** (le code écrit directement dans une balise `<script>` ou dans un attribut `onclick`) : c'est justement la forme que prennent la plupart des injections XSS.

> [!attention] Ajouter `'unsafe-inline'` dans `script-src` pour « faire marcher le site » annule l'essentiel de la protection : tout script injecté dans la page redevient exécutable. Il en va de même pour `'unsafe-eval'`, qui autorise `eval()` et ses équivalents.

## Pourquoi les listes de domaines ne suffisent pas

L'approche intuitive consiste à lister les domaines de confiance : `script-src 'self' https://cdn.exemple.com https://www.google-analytics.com`. Les études de l'équipe sécurité de Google ont montré que ces politiques sont très souvent contournables : un domaine autorisé héberge parfois d'autres scripts exploitables (anciennes bibliothèques, points d'accès JSONP), qu'un attaquant peut appeler depuis votre page. Ces listes sont aussi pénibles à maintenir.

La recommandation actuelle, reprise par l'OWASP, est une **CSP stricte**, fondée non pas sur l'origine d'un script mais sur une preuve qu'il a été voulu par vous.

## Nonces, hashes et strict-dynamic

> [!definition] Nonce : valeur aléatoire, imprévisible et **régénérée à chaque réponse**, placée à la fois dans l'en-tête CSP et dans l'attribut `nonce` de chaque balise `<script>` légitime. Un script injecté par un attaquant n'a pas le bon nonce, donc il est bloqué.

```http
Content-Security-Policy: script-src 'nonce-R4nd0mV4lu3' 'strict-dynamic'; object-src 'none'; base-uri 'self'
```

```html
<script nonce="R4nd0mV4lu3" src="/js/app.js"></script>
```

Le nonce doit être généré côté serveur, avec un générateur aléatoire sûr, pour chaque page envoyée. Un nonce fixe, écrit en dur dans la configuration, ne protège rien.

Pour un site statique où vous ne pouvez pas générer de nonce, utilisez un **hash** : l'empreinte SHA-256 (ou SHA-384, SHA-512) du contenu exact d'un script en ligne, encodée en base64. Le navigateur calcule l'empreinte du script et ne l'exécute que si elle figure dans la politique : `script-src 'sha256-…'`. Le moindre espace modifié change l'empreinte.

Le mot-clé `'strict-dynamic'` résout le problème des scripts qui en chargent d'autres (gestionnaire de balises, widget de paiement) : la confiance accordée à un script muni du bon nonce se transmet aux scripts qu'il ajoute lui-même. Dans les navigateurs qui le comprennent, `strict-dynamic` fait ignorer les listes de domaines et `'self'` dans `script-src`. Et dès qu'un nonce ou un hash est présent, `'unsafe-inline'` est ignoré : on peut donc le laisser comme solution de repli pour les très vieux navigateurs, sans affaiblir la politique ailleurs.

Les attributs de type `onclick="…"` ne peuvent pas recevoir de nonce : il faut les remplacer par des écouteurs d'événements dans vos fichiers JavaScript.

## Tester avant d'appliquer : le mode rapport

Déployer une CSP d'un coup, c'est risquer de bloquer un script de paiement ou de mesure d'audience. Commencez par l'en-tête `Content-Security-Policy-Report-Only` : le navigateur n'applique rien, mais signale chaque violation, dans la console et à l'adresse que vous indiquez.

```http
Reporting-Endpoints: csp="https://www.exemple.fr/csp-rapports"
Content-Security-Policy-Report-Only: script-src 'nonce-R4nd0mV4lu3' 'strict-dynamic'; object-src 'none'; base-uri 'self'; report-to csp; report-uri https://www.exemple.fr/csp-rapports
```

La directive `report-to` est la version moderne : elle désigne un point de collecte nommé, déclaré dans l'en-tête `Reporting-Endpoints`. L'ancienne directive `report-uri` est obsolète, mais encore utile car tous les navigateurs ne gèrent pas `report-to` ; les navigateurs qui comprennent `report-to` ignorent `report-uri`. Mettre les deux est la pratique recommandée par MDN.

> [!exemple] Une boutique en ligne veut une CSP stricte. Elle active d'abord le mode rapport pendant deux semaines. Les rapports révèlent trois sources oubliées : le widget de chat, le script du prestataire de paiement et un ancien pixel publicitaire qu'on croyait supprimé. L'équipe retire le pixel, ajoute le nonce aux deux scripts légitimes, puis bascule en `Content-Security-Policy`. Un mois plus tard, une extension de commentaires vulnérable est exploitée : le script injecté est bloqué par le navigateur, et l'alerte arrive par les rapports.

Une fois les rapports stabilisés, remplacez l'en-tête par `Content-Security-Policy`. Vous pouvez garder une version plus stricte en `Report-Only` en parallèle pour préparer l'étape suivante.

> [!astuce] Le [CSP Evaluator](https://csp-evaluator.withgoogle.com/) de Google analyse une politique et signale ses faiblesses. La fiche [Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html) de l'OWASP et la [documentation MDN](https://developer.mozilla.org/fr/docs/Web/HTTP/Headers/Content-Security-Policy) détaillent chaque directive.

## Les pièges courants

- **Plusieurs en-têtes CSP** : si votre serveur et votre application en envoient chacun un, le navigateur applique les deux, et une ressource doit satisfaire les deux politiques. Centralisez la CSP à un seul endroit.
- **CSP dans une balise `<meta>`** : possible, mais `frame-ancestors`, `report-uri` et `report-to` y sont ignorés. Préférez l'en-tête HTTP.
- **La CSP comme seule défense** : elle limite les dégâts d'une injection, elle ne la corrige pas. Échappez toujours les données affichées (voir [le cours sur le XSS](/blog/xss-comprendre-et-prevenir)).

## À retenir

- La CSP dit au navigateur quelles ressources il peut charger et bloque les scripts injectés.
- Évitez `'unsafe-inline'` et `'unsafe-eval'` dans `script-src`.
- Préférez une CSP stricte : nonce aléatoire par réponse ou hash, avec `'strict-dynamic'`.
- Testez toujours en `Content-Security-Policy-Report-Only` avant d'appliquer.
- Déclarez `report-to` et gardez `report-uri` pour la compatibilité.

## Quiz

?? Quelle est la propriété essentielle d'un nonce CSP ?
- [ ] Il est identique sur toutes les pages pour simplifier la configuration
- [x] Il est aléatoire et régénéré à chaque réponse du serveur
- [ ] Il correspond au nom de domaine du site
=> Un nonce prévisible ou fixe pourrait être recopié par l'attaquant dans son script injecté.

?? Que produit l'ajout de 'unsafe-inline' dans script-src, sans nonce ni hash ?
- [x] Les scripts injectés dans la page redeviennent exécutables
- [ ] Les scripts externes sont bloqués
- [ ] Le site devient plus rapide
=> Les injections XSS prennent souvent la forme de scripts en ligne : les autoriser vide la CSP de son intérêt.

?? À quoi sert l'en-tête Content-Security-Policy-Report-Only ?
- [ ] À appliquer la politique uniquement aux administrateurs
- [ ] À masquer la politique aux attaquants
- [x] À signaler les violations sans rien bloquer, pour tester une politique
=> Le mode rapport permet de repérer les ressources légitimes oubliées avant d'appliquer la politique.

?? Que permet 'strict-dynamic' ?
- [ ] D'autoriser tous les scripts du même domaine
- [x] De transmettre la confiance d'un script muni du bon nonce aux scripts qu'il charge
- [ ] De recharger la politique à chaque clic
=> Les scripts légitimes qui en chargent d'autres continuent de fonctionner sans liste de domaines à maintenir.
