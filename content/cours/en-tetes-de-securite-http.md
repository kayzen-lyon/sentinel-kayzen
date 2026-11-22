---
title: Les en-têtes de sécurité HTTP indispensables
description: HSTS, nosniff, Referrer-Policy, Permissions-Policy, frame-ancestors : les en-têtes qui renforcent votre site en quelques lignes de configuration.
track: site-web
level: intermediaire
order: 2
minutes: 6
updated: 2026-11-22
tags: en-têtes http, hsts, clickjacking, referrer-policy, permissions-policy, nginx, apache
---
À chaque page envoyée, votre serveur transmet au navigateur des **en-têtes HTTP** : des lignes invisibles pour le visiteur, qui décrivent la réponse et donnent des consignes. Certains de ces en-têtes activent des protections intégrées aux navigateurs : interdiction d'afficher votre site dans un cadre piégé, refus de deviner le type d'un fichier, limitation des informations transmises aux autres sites. Ils ne remplacent pas un code sûr, mais ils coûtent quelques lignes de configuration et bloquent des familles entières d'attaques. Ce sont aussi les premiers points vérifiés par un scanner de sécurité.

## Ce que vous allez apprendre

- Quels en-têtes de sécurité mettre en place, et à quoi sert chacun.
- La différence entre `X-Frame-Options` et la directive `frame-ancestors`.
- Quels en-têtes sont obsolètes et ne valent plus la peine d'être ajoutés.
- Comment les configurer dans nginx et Apache, et comment vérifier le résultat.

## Les en-têtes à mettre en place

### Strict-Transport-Security (HSTS)

Il oblige le navigateur à n'utiliser que HTTPS pour votre domaine pendant la durée indiquée par `max-age`. `includeSubDomains` étend la consigne aux sous-domaines, et `preload` permet de demander l'inscription du domaine dans la liste intégrée aux navigateurs. Le détail, et les précautions pour l'activer sans risque, sont dans [le cours sur HTTPS](/blog/https-et-certificats).

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### X-Content-Type-Options

Certains navigateurs essayaient autrefois de « deviner » le type d'un fichier à partir de son contenu (*MIME sniffing*). Un attaquant pouvait alors téléverser un fichier présenté comme une image, mais contenant du JavaScript, qui finissait exécuté. La valeur `nosniff` interdit cette devinette : le navigateur s'en tient au `Content-Type` envoyé par le serveur.

```http
X-Content-Type-Options: nosniff
```

### Referrer-Policy

Quand un visiteur clique sur un lien sortant, le navigateur peut indiquer au site de destination l'adresse de la page d'origine (l'en-tête `Referer`). Si vos URL contiennent des informations sensibles (identifiant de commande, jeton de réinitialisation, termes de recherche), elles fuient vers des tiers. La valeur `strict-origin-when-cross-origin` envoie l'adresse complète à votre propre site, mais seulement le nom de domaine aux autres, et rien du tout lors d'un passage de HTTPS à HTTP.

```http
Referrer-Policy: strict-origin-when-cross-origin
```

### Permissions-Policy

Cet en-tête désactive les fonctions sensibles du navigateur dont votre site n'a pas besoin : caméra, micro, géolocalisation, paiement… Si un script tiers est compromis, il ne pourra pas les solliciter. Les parenthèses vides signifient « autorisé pour personne ».

```http
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```

## Le clickjacking : X-Frame-Options ou frame-ancestors ?

> [!definition] Clickjacking : attaque où un site malveillant affiche votre site dans un cadre invisible (`iframe`), superposé à un faux bouton. La victime croit cliquer sur « Jouer » et clique en réalité sur « Supprimer mon compte » ou « Valider le virement » chez vous.

La parade consiste à interdire l'affichage de vos pages dans un cadre sur un autre site. Deux mécanismes existent :

- `X-Frame-Options: DENY` (aucun cadre) ou `SAMEORIGIN` (cadres autorisés seulement sur votre propre site). C'est l'ancien en-tête, encore largement reconnu.
- La directive `frame-ancestors` de la **Content-Security-Policy**, qui le remplace. Elle est plus précise : elle accepte une liste de domaines autorisés.

```http
Content-Security-Policy: frame-ancestors 'self'
X-Frame-Options: SAMEORIGIN
```

Quand les deux sont présents, les navigateurs modernes appliquent `frame-ancestors` et ignorent `X-Frame-Options`. Garder les deux reste utile pour les très vieux navigateurs. N'utilisez pas `ALLOW-FROM`, une valeur de `X-Frame-Options` obsolète que les navigateurs actuels ne comprennent pas. Attention aussi : `frame-ancestors` ne fonctionne que dans un en-tête HTTP, pas dans une balise `<meta>`.

> [!exemple] Une association propose sur son site un bouton « Faire un don » qui déclenche un paiement en un clic pour les membres connectés. Un faux jeu-concours charge cette page dans un cadre transparent et place le bouton « Participer » exactement au-dessus. Plusieurs membres font un don sans le savoir. Une seule ligne, `frame-ancestors 'self'`, aurait rendu l'attaque impossible : le navigateur aurait refusé d'afficher la page dans le cadre.

## Les en-têtes obsolètes ou à retirer

- `X-XSS-Protection` : il activait un filtre anti-XSS aujourd'hui retiré des navigateurs, et ce filtre pouvait lui-même créer des failles. L'OWASP recommande de ne pas le définir, ou de le mettre à `0`. La vraie protection contre le XSS est une [Content-Security-Policy](/blog/content-security-policy) et un code qui échappe correctement les données (voir [le cours sur le XSS](/blog/xss-comprendre-et-prevenir)).
- `Expect-CT` : il servait à exiger la *Certificate Transparency*, désormais imposée par défaut. Il est obsolète.
- `Server` et `X-Powered-By` : ils annoncent votre logiciel et sa version (par exemple `nginx/1.18.0` ou `PHP/7.4`). Ce n'est pas une faille en soi, mais cela aide un attaquant à cibler les vulnérabilités connues. Masquez la version.

## Configurer les en-têtes

Avec nginx, dans le bloc `server` :

```nginx
server_tokens off;

add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header Content-Security-Policy "frame-ancestors 'self'" always;
```

Le mot-clé `always` applique l'en-tête aussi aux pages d'erreur. Piège classique : si un bloc `location` contient lui-même une directive `add_header`, il n'hérite plus de celles du bloc `server`. Répétez-les ou regroupez-les dans un fichier inclus.

Avec Apache (module `mod_headers` activé) :

```apache
ServerTokens Prod
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
Header always set X-Content-Type-Options "nosniff"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
Header always set X-Frame-Options "SAMEORIGIN"
```

Sur un hébergement sans accès au serveur (Vercel, Netlify, certains mutualisés), les en-têtes se déclarent dans un fichier de configuration de la plateforme ou dans le framework.

> [!astuce] Pour vérifier, ouvrez les outils de développement du navigateur (onglet Réseau), cliquez sur la requête de la page et lisez les en-têtes de réponse. En ligne de commande : `curl -I https://www.exemple.fr`. La fiche [HTTP Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html) de l'OWASP détaille chaque en-tête.

## À retenir

- Quelques en-têtes bien choisis activent des protections gratuites dans le navigateur.
- Le socle : HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` et une protection contre le clickjacking.
- `frame-ancestors` remplace `X-Frame-Options`, mais garder les deux ne pose pas de problème.
- `X-XSS-Protection` est obsolète : ne l'activez pas.
- Vérifiez toujours le résultat réel, pages d'erreur comprises.

## Quiz

?? Que fait l'en-tête X-Content-Type-Options: nosniff ?
- [ ] Il chiffre le contenu des pages
- [x] Il interdit au navigateur de deviner le type d'un fichier
- [ ] Il bloque les robots d'indexation
=> Le navigateur respecte strictement le Content-Type annoncé, ce qui empêche d'exécuter un fichier déguisé en image.

?? Quelle protection contre le clickjacking est la plus moderne ?
- [ ] X-Frame-Options: ALLOW-FROM
- [x] La directive CSP frame-ancestors
- [ ] X-XSS-Protection: 1
=> frame-ancestors remplace X-Frame-Options et accepte une liste précise de sites autorisés ; ALLOW-FROM n'est plus reconnu.

?? Que faire de l'en-tête X-XSS-Protection aujourd'hui ?
- [ ] L'activer avec mode=block sur toutes les pages
- [x] Ne pas le définir, ou le mettre à 0, et s'appuyer sur une CSP
- [ ] Le remplacer par X-Powered-By
=> Le filtre qu'il activait a été retiré des navigateurs et pouvait introduire des failles.

?? Pourquoi limiter le Referer avec Referrer-Policy ?
- [ ] Pour améliorer le référencement
- [ ] Pour empêcher les autres sites de créer des liens vers vous
- [x] Pour éviter que des informations contenues dans vos URL fuient vers des sites tiers
=> Les URL peuvent contenir des identifiants ou des jetons ; strict-origin-when-cross-origin n'envoie que le domaine aux autres sites.
