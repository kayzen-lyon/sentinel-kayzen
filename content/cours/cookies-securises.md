---
title: Cookies sécurisés : Secure, HttpOnly et SameSite
description: Les attributs qui protègent vos cookies de session contre le vol et les requêtes forcées, et les préfixes __Host- et __Secure- expliqués simplement.
track: site-web
level: intermediaire
order: 4
minutes: 7
updated: 2026-11-22
tags: cookies, session, samesite, httponly, csrf, xss
---
Quand vous vous connectez à un site, le serveur vous remet un **cookie de session** : un petit identifiant que le navigateur renvoie à chaque requête pour prouver que c'est bien vous. Ce cookie vaut autant que votre mot de passe : quiconque le récupère entre dans votre compte, sans connaître le mot de passe et souvent même sans passer par la double authentification. Trois attributs, ajoutés au moment où le cookie est créé, réduisent fortement les risques de vol et d'abus. Ils sont simples à poser, et pourtant régulièrement oubliés.

## Ce que vous allez apprendre

- Comment un cookie est créé et quels attributs l'accompagnent.
- Ce que protègent `Secure`, `HttpOnly` et `SameSite`, et leurs limites.
- Comment les préfixes `__Host-` et `__Secure-` verrouillent un cookie.
- Comment régler la portée et la durée de vie d'un cookie de session.

## Anatomie d'un cookie

Le serveur crée un cookie avec l'en-tête de réponse `Set-Cookie`. Le nom et la valeur viennent d'abord, puis les attributs :

```http
Set-Cookie: session=8f3a…c21; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=7200
```

Ensuite, à chaque requête vers le site, le navigateur renvoie automatiquement le cookie dans l'en-tête `Cookie`. C'est ce renvoi automatique qui rend les cookies pratiques… et qui crée les risques que nous allons voir.

## Secure : jamais en clair

L'attribut `Secure` interdit au navigateur d'envoyer le cookie sur une connexion HTTP non chiffrée. Sans lui, un simple lien `http://` vers votre site, sur un Wi-Fi public, suffit à faire circuler le cookie en clair, lisible par un intermédiaire.

Tout site en HTTPS (voir [le cours sur HTTPS](/blog/https-et-certificats)) devrait poser `Secure` sur tous ses cookies, sans exception. Les navigateurs modernes empêchent d'ailleurs une page en HTTP de créer ou d'écraser un cookie marqué `Secure`.

## HttpOnly : hors de portée du JavaScript

Par défaut, un script de la page peut lire les cookies via `document.cookie`. Si votre site contient une faille XSS (voir [le cours sur le XSS](/blog/xss-comprendre-et-prevenir)), le script injecté peut alors lire le cookie de session et l'envoyer à l'attaquant.

L'attribut `HttpOnly` rend le cookie invisible pour JavaScript : il reste envoyé au serveur, mais aucun script ne peut le lire.

> [!attention] `HttpOnly` empêche le vol du cookie, pas l'exploitation de la faille XSS. Le script malveillant peut toujours agir dans la page au nom de la victime pendant qu'elle est connectée. C'est une protection en profondeur, pas une correction.

Règle pratique : un cookie de session ou d'authentification doit toujours être `HttpOnly`. Seuls les cookies que votre code JavaScript doit réellement lire (une préférence d'affichage, par exemple) peuvent s'en passer, et ils ne doivent rien contenir de sensible.

## SameSite : limiter les requêtes venues d'ailleurs

Le renvoi automatique des cookies a un effet pervers : si un site piégé déclenche une requête vers votre site (un formulaire caché qui s'envoie tout seul), le navigateur joint le cookie de la victime. Votre serveur croit que la demande vient d'elle. C'est l'attaque **CSRF** (*Cross-Site Request Forgery*), détaillée dans [le cours dédié](/blog/csrf-et-samesite).

L'attribut `SameSite` dit au navigateur quand joindre le cookie à une requête venant d'un autre site :

- `Strict` : jamais. Le plus sûr, mais un visiteur qui arrive sur votre site depuis un lien externe (un e-mail, un moteur de recherche) n'apparaît pas connecté sur cette première page.
- `Lax` : seulement pour une navigation de premier niveau avec une méthode « sûre », typiquement un clic sur un lien (requête `GET`). Les formulaires `POST` envoyés depuis un autre site et les requêtes en arrière-plan n'emportent pas le cookie. C'est un bon réglage par défaut pour une session.
- `None` : toujours. Nécessaire pour les cookies utilisés dans un contexte tiers (un widget intégré dans un autre site), et obligatoirement accompagné de `Secure`, sinon le navigateur rejette le cookie.

Certains navigateurs, dont Chrome, appliquent `Lax` quand l'attribut est absent, mais pas tous. Ne comptez pas sur ce comportement : écrivez `SameSite` explicitement.

> [!exemple] Un site de petites annonces stocke la session dans un cookie sans `SameSite`, et la page « changer d'adresse e-mail » se contente d'un formulaire `POST` sans jeton anti-CSRF. Un escroc publie une fausse annonce renvoyant vers sa page, qui soumet en silence ce formulaire avec sa propre adresse. Les victimes connectées voient leur e-mail remplacé, puis l'escroc réinitialise leur mot de passe. Avec `SameSite=Lax`, le navigateur n'aurait pas joint le cookie au formulaire envoyé depuis l'autre site.

`SameSite` est une excellente protection complémentaire, mais il ne remplace pas complètement les jetons anti-CSRF : la notion de « même site » englobe vos sous-domaines, et un sous-domaine compromis ou mal configuré peut contourner la protection.

## Les préfixes __Host- et __Secure-

Un attaquant qui contrôle un sous-domaine (par exemple un ancien sous-domaine oublié, voir [le cours sur le DNS](/blog/nom-de-domaine-et-dns)) peut parfois déposer un cookie valable pour tout votre domaine et écraser le vôtre. Les **préfixes de nom** empêchent cela, car le navigateur refuse tout cookie qui ne respecte pas leurs règles :

- `__Secure-` : le cookie doit avoir l'attribut `Secure` et être créé depuis une page HTTPS.
- `__Host-` : en plus, il ne doit pas avoir d'attribut `Domain` et doit avoir `Path=/`. Il est donc lié à l'hôte exact qui l'a créé, et aucun sous-domaine ne peut le définir ni l'écraser.

```http
Set-Cookie: __Host-session=8f3a…c21; Path=/; Secure; HttpOnly; SameSite=Lax
```

Pour un cookie de session, `__Host-` est le choix le plus sûr, sauf si la session doit réellement être partagée entre plusieurs sous-domaines.

## Portée et durée de vie

- **Domain** : sans cet attribut, le cookie n'est envoyé qu'à l'hôte exact qui l'a créé. Avec `Domain=exemple.fr`, il est envoyé à tous les sous-domaines, y compris ceux que vous maîtrisez mal. N'élargissez la portée qu'en cas de besoin.
- **Max-Age** ou **Expires** : sans eux, le cookie disparaît à la fermeture du navigateur (mais certains navigateurs restaurent les sessions). Une session sensible doit expirer rapidement côté serveur, quelle que soit la durée du cookie.
- **Rotation** : générez un nouvel identifiant de session après la connexion, et invalidez-le côté serveur à la déconnexion. Supprimer le cookie dans le navigateur ne suffit pas si le serveur l'accepte encore.

> [!astuce] Pour vérifier vos cookies, ouvrez les outils de développement du navigateur, onglet Application (ou Stockage), rubrique Cookies : les colonnes indiquent `Secure`, `HttpOnly` et `SameSite` pour chacun. La fiche [Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) de l'OWASP approfondit le sujet.

## À retenir

- Un cookie de session volé équivaut à un compte volé.
- `Secure` : jamais sur une connexion non chiffrée. `HttpOnly` : jamais lisible par JavaScript.
- `SameSite=Lax` (ou `Strict`) limite les requêtes forcées ; `None` exige `Secure`.
- Le préfixe `__Host-` empêche un sous-domaine de définir ou d'écraser votre cookie.
- Limitez la portée, renouvelez l'identifiant à la connexion et invalidez-le côté serveur.

## Quiz

?? Quel attribut empêche un script injecté de lire le cookie de session ?
- [ ] Secure
- [x] HttpOnly
- [ ] SameSite=None
=> HttpOnly rend le cookie inaccessible à document.cookie, tout en le laissant envoyé au serveur.

?? Que se passe-t-il pour un cookie déclaré SameSite=None sans l'attribut Secure ?
- [ ] Il est envoyé partout, sans restriction
- [x] Les navigateurs modernes le rejettent
- [ ] Il devient automatiquement HttpOnly
=> SameSite=None impose Secure : sans lui, le cookie n'est pas accepté.

?? Quelle condition fait partie des règles du préfixe __Host- ?
- [ ] Le cookie doit avoir un attribut Domain
- [ ] Le cookie doit expirer en moins d'une heure
- [x] Le cookie ne doit pas avoir d'attribut Domain et doit avoir Path=/
=> Sans Domain et avec Path=/, le cookie est lié à l'hôte exact : aucun sous-domaine ne peut l'écraser.

?? Contre quelle attaque SameSite=Lax protège-t-il principalement ?
- [ ] L'injection SQL
- [x] La falsification de requête intersite (CSRF)
- [ ] Le vol de certificat TLS
=> Le cookie n'est pas joint aux formulaires POST envoyés depuis un autre site, ce qui bloque la plupart des CSRF.
