---
title: CSRF : la falsification de requête et ses parades
description: Comment un site tiers peut agir au nom de vos utilisateurs connectés, et comment SameSite, les jetons anti-CSRF et la vérification d'origine l'en empêchent.
track: developpeurs
level: avance
order: 6
minutes: 7
updated: 2026-11-22
tags: CSRF, SameSite, cookies, jeton anti-CSRF, Fetch Metadata
---
Quand un utilisateur est connecté à votre application, son navigateur joint automatiquement le cookie de session à chaque requête vers votre domaine, quelle que soit la page qui la déclenche. Une page piégée sur un autre site peut donc faire envoyer à votre serveur une requête parfaitement authentifiée, sans que l'utilisateur ne s'en rende compte. C'est le principe de la falsification de requête intersite, ou CSRF. Les navigateurs modernes ont beaucoup réduit ce risque, mais pas au point de pouvoir s'en passer.

## Ce que vous allez apprendre

- Pourquoi les cookies rendent possible une requête forgée depuis un autre site.
- Comment l'attribut SameSite limite l'envoi des cookies, et ses limites.
- Le fonctionnement des jetons anti-CSRF.
- Comment vérifier l'origine d'une requête avec les en-têtes du navigateur.
- Les erreurs de conception qui rendent une application vulnérable.

## Le mécanisme

> [!definition] CSRF (Cross-Site Request Forgery) : attaque qui amène le navigateur d'une victime authentifiée à envoyer à une application une requête qu'elle n'a pas voulue. L'attaquant ne voit pas la réponse, mais l'action est exécutée.

Imaginons une banque en ligne dont le virement se fait par un formulaire classique :

```http
POST /virements HTTP/1.1
Host: banque.exemple
Cookie: session=8f3a...
Content-Type: application/x-www-form-urlencoded

iban=FR76...&montant=500
```

Si le serveur se contente de vérifier le cookie de session, une page hébergée ailleurs peut contenir un formulaire qui cible cette adresse et se soumet automatiquement au chargement. Le navigateur de la victime, connectée à sa banque dans un autre onglet, joint le cookie : le serveur voit une requête authentifiée et exécute le virement.

L'attaque ne nécessite aucune faille dans le code au sens classique : elle exploite le fait que le serveur ne vérifie pas **d'où vient** la demande. Dans le [Top 10 OWASP](/blog/owasp-top-10-explique) 2021, la CSRF est rattachée à la catégorie **A01:2021 – Broken Access Control**.

## Première parade : l'attribut SameSite

L'attribut `SameSite` d'un cookie indique au navigateur s'il doit l'envoyer lorsque la requête provient d'un autre site. La documentation de référence est sur [MDN](https://developer.mozilla.org/fr/docs/Web/HTTP/Cookies).

- `SameSite=Strict` : le cookie n'est jamais envoyé dans une requête intersite, même quand l'utilisateur clique sur un lien vers votre site depuis un autre. Très sûr, mais l'utilisateur arrive déconnecté depuis un lien externe.
- `SameSite=Lax` : le cookie est envoyé lors d'une navigation de premier niveau en `GET` (clic sur un lien), mais pas dans les sous-requêtes intersites (formulaire `POST`, image, `fetch`). C'est un bon compromis pour un cookie de session.
- `SameSite=None` : le cookie est toujours envoyé, ce qui exige l'attribut `Secure`. À réserver aux cas qui le nécessitent vraiment (contenu intégré chez des tiers).

```javascript
res.cookie("session", idSession, {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
});
```

Les navigateurs basés sur Chromium appliquent `Lax` par défaut aux cookies sans attribut, avec des exceptions temporaires. Le comportement n'est pas identique partout : définissez toujours `SameSite` explicitement. Le cours sur [les cookies sécurisés](/blog/cookies-securises) détaille les autres attributs.

> [!attention] Pour le navigateur, « même site » signifie même domaine enregistrable : `app.exemple.fr` et `blog.exemple.fr` sont du même site. Un sous-domaine compromis ou vulnérable au XSS peut donc contourner SameSite. Et avec `Lax`, toute action qui modifie des données via une requête `GET` reste exposée.

## Deuxième parade : le jeton anti-CSRF

Le jeton anti-CSRF (synchronizer token) est la défense historique, et toujours recommandée par l'[aide-mémoire OWASP sur la CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html). Le serveur génère une valeur aléatoire liée à la session, l'insère dans chaque formulaire, et vérifie qu'elle revient avec chaque requête qui modifie des données. Le site de l'attaquant ne peut pas lire cette valeur (la politique de même origine l'en empêche), il ne peut donc pas forger une requête valide.

```javascript
import crypto from "node:crypto";

// À la création de la session
req.session.csrf = crypto.randomBytes(32).toString("hex");

// Vérification pour toute méthode qui modifie l'état
function verifierCsrf(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const recu = Buffer.from(String(req.get("x-csrf-token") ?? req.body._csrf ?? ""));
  const attendu = Buffer.from(req.session.csrf ?? "");
  if (recu.length !== attendu.length || !crypto.timingSafeEqual(recu, attendu)) {
    return res.status(403).send("Requête refusée");
  }
  next();
}
```

La plupart des frameworks fournissent ce mécanisme intégré (Django, Rails, Laravel, Spring Security, ASP.NET) : activez-le plutôt que de le réécrire. Pour les applications sans état côté serveur, la variante « double soumission » avec un cookie **signé** par le serveur joue le même rôle.

## Troisième parade : vérifier l'origine

Les navigateurs modernes envoient des en-têtes que les pages ne peuvent pas falsifier :

- `Origin` indique le site à l'origine de la requête, pour les `POST` notamment.
- `Sec-Fetch-Site` (en-têtes « Fetch Metadata ») vaut `same-origin`, `same-site`, `cross-site` ou `none`.

```javascript
function refuserIntersite(req, res, next) {
  const site = req.get("sec-fetch-site");
  if (req.method !== "GET" && site && !["same-origin", "none"].includes(site)) {
    return res.status(403).send("Requête intersite refusée");
  }
  next();
}
```

Cette vérification est simple et efficace en complément, mais prévoyez le cas des clients qui n'envoient pas ces en-têtes (anciens navigateurs, outils) selon votre politique.

> [!exemple] Une plateforme d'e-learning protège bien ses formulaires par jeton, mais l'action « changer l'adresse e-mail du compte » est aussi accessible via `GET /compte/email?nouveau=...`, ajoutée pour une ancienne application mobile. Le cookie de session est en `SameSite=Lax`, donc envoyé lors d'une navigation de premier niveau. Un simple lien piégé suffit à modifier l'adresse e-mail d'un utilisateur connecté, puis à réinitialiser son mot de passe. La correction : n'accepter cette action qu'en `POST` avec jeton, et demander le mot de passe actuel pour tout changement d'e-mail.

## Les bonnes pratiques de conception

- **Jamais de modification d'état en `GET`** : les requêtes `GET` doivent être sans effet de bord.
- **Réauthentification pour les actions sensibles** : changement d'e-mail, de mot de passe, ajout d'un bénéficiaire, suppression du compte.
- **CORS restrictif** : une politique CORS qui accepte n'importe quelle origine avec les identifiants ouvre bien plus grand que la CSRF.
- **API à jeton** : une API qui s'authentifie uniquement par un en-tête `Authorization` (et non par cookie) n'est pas exposée à la CSRF, puisque le navigateur n'ajoute pas cet en-tête automatiquement.

> [!attention] Pour vous exercer, utilisez les laboratoires [CSRF de PortSwigger](https://portswigger.net/web-security/csrf) ou [OWASP Juice Shop](https://owasp.org/www-project-juice-shop/). Déclencher une action sur le compte d'autrui sur un service réel, même pour démontrer une faille, est illégal sans autorisation écrite (Code pénal, articles 323-1 et 323-3).

## À retenir

- La CSRF exploite l'envoi automatique des cookies par le navigateur, quelle que soit la page d'origine.
- SameSite=Lax ou Strict réduit fortement le risque, mais ne couvre ni les sous-domaines ni les actions en GET.
- Les jetons anti-CSRF restent la défense de référence pour les applications à cookies de session.
- Les en-têtes Origin et Sec-Fetch-Site permettent de refuser simplement les requêtes intersites.
- Aucune action en GET, et une réauthentification pour les opérations sensibles.

## Quiz

?? Pourquoi une attaque CSRF fonctionne-t-elle sans connaître le mot de passe de la victime ?
- [ ] Parce que l'attaquant vole le cookie de session
- [x] Parce que le navigateur de la victime joint automatiquement son cookie de session à la requête forgée
- [ ] Parce que le serveur n'utilise pas HTTPS
=> L'attaquant n'a jamais le cookie : il fait envoyer la requête par le navigateur de la victime, qui l'ajoute de lui-même.

?? Avec un cookie de session en SameSite=Lax, quelle action reste exposée à la CSRF ?
- [ ] Un formulaire POST soumis depuis un autre site
- [x] Une modification de données déclenchée par une requête GET
- [ ] Une requête fetch intersite vers une API
=> Lax envoie le cookie lors d'une navigation GET de premier niveau : une action en GET reste donc déclenchable par un simple lien.

?? Pourquoi le site de l'attaquant ne peut-il pas fournir un jeton anti-CSRF valide ?
- [x] Parce que la politique de même origine l'empêche de lire la page qui contient le jeton
- [ ] Parce que le jeton est chiffré avec le mot de passe de l'utilisateur
- [ ] Parce que le navigateur supprime les champs cachés des formulaires
=> Le jeton est aléatoire et lié à la session ; une page d'une autre origine ne peut pas lire la réponse qui le contient.

?? Quelle valeur de l'en-tête Sec-Fetch-Site doit faire refuser une requête POST sensible ?
- [ ] same-origin
- [ ] none
- [x] cross-site
=> cross-site indique que la requête a été déclenchée depuis un autre site, ce qui est le schéma d'une CSRF.
