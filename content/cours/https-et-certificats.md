---
title: HTTPS et certificats TLS : comprendre et bien configurer
description: Chiffrement, certificats Let's Encrypt, versions TLS, HSTS et renouvellement automatique : tout ce qu'il faut pour un HTTPS solide et sans mauvaise surprise.
track: site-web
level: intermediaire
order: 1
minutes: 7
updated: 2026-11-22
tags: https, tls, certificat, lets encrypt, hsts, nginx
---
Le petit cadenas dans la barre d'adresse est devenu banal, et c'est tant mieux : sans HTTPS, tout ce qui circule entre le navigateur et votre site (mots de passe, formulaires, cookies de session) peut être lu ou modifié par quiconque se trouve sur le chemin, par exemple sur un Wi-Fi public. Mais avoir « un certificat » ne suffit pas. Un HTTPS mal configuré accepte de vieux protocoles, laisse passer une première connexion en clair ou expire un dimanche matin. Ce cours vous donne les bons réglages.

## Ce que vous allez apprendre

- Ce que HTTPS protège réellement, et ce qu'il ne protège pas.
- Comment fonctionne un certificat et pourquoi sa durée de validité raccourcit.
- Quelles versions de TLS accepter en 2026, et lesquelles refuser.
- Comment forcer HTTPS durablement avec la redirection et l'en-tête HSTS.
- Comment automatiser le renouvellement pour ne jamais tomber en panne.

## Ce que HTTPS protège

HTTPS, c'est HTTP transporté dans un tunnel **TLS** (*Transport Layer Security*). TLS apporte trois garanties :

- **la confidentialité** : les échanges sont chiffrés, illisibles pour un intermédiaire ;
- **l'intégrité** : un intermédiaire ne peut pas modifier une page en transit (par exemple pour y injecter de la publicité ou un script malveillant) ;
- **l'authentification du serveur** : le navigateur vérifie qu'il parle bien au domaine demandé, grâce au certificat.

> [!attention] HTTPS ne rend pas un site sûr. Il protège le trajet, pas le contenu. Un site en HTTPS peut très bien héberger une faille XSS, une injection SQL ou une page d'hameçonnage. Le cadenas signifie « connexion chiffrée vers ce domaine », pas « site de confiance ».

## Le certificat : une carte d'identité qui expire

> [!definition] Certificat TLS : fichier signé par une autorité de certification (AC) qui associe un nom de domaine à une clé publique. Le navigateur fait confiance au certificat parce qu'il fait confiance à l'AC qui l'a signé.

Pour obtenir un certificat, vous prouvez à l'autorité que vous contrôlez le domaine, par exemple en publiant un fichier sur le site ou un enregistrement dans le DNS. Ce processus est automatisé par le protocole **ACME**, utilisé par [Let's Encrypt](https://letsencrypt.org/), une autorité gratuite et à but non lucratif, et par de nombreux hébergeurs qui l'intègrent directement dans leur panneau d'administration.

La durée de validité des certificats raccourcit d'année en année. Le CA/Browser Forum, qui fixe les règles pour les autorités, a adopté en 2025 un calendrier de réduction : 200 jours maximum depuis mars 2026, puis 100 jours en 2027 et 47 jours en 2029. De son côté, Let's Encrypt délivre des certificats de 90 jours et a annoncé un passage progressif à 45 jours d'ici 2028. Conclusion pratique : **le renouvellement manuel n'est plus une option**.

Tous les certificats émis publiquement sont aussi inscrits dans des journaux publics appelés *Certificate Transparency*. Vous pouvez y rechercher votre domaine (par exemple sur [crt.sh](https://crt.sh/)) pour repérer un certificat que vous n'auriez pas demandé.

## Les bonnes versions de TLS

Les anciennes versions SSL 3.0, TLS 1.0 et TLS 1.1 présentent des faiblesses connues et sont abandonnées par les navigateurs. Aujourd'hui, n'acceptez que **TLS 1.2 et TLS 1.3**. TLS 1.3 est plus rapide (moins d'allers-retours pour établir la connexion) et ne propose que des algorithmes modernes.

Voici une configuration nginx raisonnable :

```nginx
server {
    listen 443 ssl;
    server_name www.exemple.fr;

    ssl_certificate     /etc/letsencrypt/live/www.exemple.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.exemple.fr/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
}
```

Et l'équivalent pour Apache :

```apache
SSLProtocol -all +TLSv1.2 +TLSv1.3
```

> [!astuce] L'ANSSI publie un guide de « Recommandations de sécurité relatives à TLS », et l'OWASP propose une fiche [Transport Layer Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html). Sur un hébergement mutualisé, ces réglages sont souvent gérés par l'hébergeur : vérifiez simplement le résultat avec un outil de test TLS en ligne.

## Forcer HTTPS : redirection et HSTS

Toutes les requêtes en HTTP doivent être redirigées vers HTTPS, avec un code 301 :

```nginx
server {
    listen 80;
    server_name exemple.fr www.exemple.fr;
    return 301 https://www.exemple.fr$request_uri;
}
```

La redirection ne suffit pas : la toute première requête part encore en clair, et un attaquant placé sur le réseau peut l'intercepter avant la redirection. C'est le rôle de l'en-tête **HSTS** (*HTTP Strict Transport Security*) : il ordonne au navigateur de n'utiliser que HTTPS pour ce domaine pendant une durée donnée.

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

- `max-age` : durée en secondes pendant laquelle le navigateur retient la consigne (ici un an).
- `includeSubDomains` : la consigne s'applique aussi à tous les sous-domaines.
- `preload` : à ajouter seulement si vous voulez inscrire le domaine sur la liste HSTS intégrée aux navigateurs, via [hstspreload.org](https://hstspreload.org/). Il faut alors un `max-age` d'au moins un an, `includeSubDomains`, et HTTPS sur tous les sous-domaines.

> [!attention] HSTS est difficile à annuler : les navigateurs gardent la consigne jusqu'à expiration du `max-age`, et une sortie de la liste de préchargement prend des mois. Commencez par un `max-age` court (par exemple 300 secondes), vérifiez que tous vos sous-domaines fonctionnent en HTTPS, puis augmentez progressivement.

Enfin, chassez le **contenu mixte** : une page HTTPS qui charge une image ou un script en `http://` affaiblit la protection. Les navigateurs bloquent désormais la plupart de ces ressources, ce qui peut casser l'affichage. Remplacez les URL par leur version `https://`.

## Automatiser et surveiller le renouvellement

Un certificat expiré, c'est un site inaccessible : les navigateurs affichent une alerte plein écran que la plupart des visiteurs ne franchiront pas.

> [!exemple] Une agence gère le site d'un restaurant. Le certificat avait été installé à la main deux ans plus tôt, et le rappel d'échéance arrivait sur la boîte d'un ancien stagiaire. Un vendredi soir, le certificat expire : les clients qui veulent réserver tombent sur « Votre connexion n'est pas privée ». Il faut tout le week-end pour retrouver les accès à l'hébergement. Depuis, le renouvellement est automatique et une sonde vérifie la date d'expiration chaque jour.

Les bonnes pratiques :

1. Utilisez un client ACME (Certbot, acme.sh, ou celui de votre hébergeur) qui renouvelle automatiquement, bien avant l'échéance.
2. Testez le renouvellement à blanc, par exemple avec `certbot renew --dry-run`.
3. Ne comptez pas sur les e-mails de rappel : Let's Encrypt a cessé de les envoyer en 2025. Mettez en place votre propre surveillance (voir [le cours sur la surveillance continue](/blog/surveiller-son-site-en-continu)).
4. Protégez la clé privée : droits de lecture limités, jamais dans un dépôt Git (voir [les secrets dans le code](/blog/secrets-dans-le-code)).

## À retenir

- HTTPS chiffre et authentifie la connexion, mais ne corrige aucune faille applicative.
- N'acceptez que TLS 1.2 et TLS 1.3.
- Redirigez tout le trafic HTTP en 301, puis ajoutez HSTS avec un `max-age` augmenté progressivement.
- Les certificats durent de moins en moins longtemps : le renouvellement doit être automatique.
- Surveillez vous-même la date d'expiration, et consultez les journaux Certificate Transparency.

## Quiz

?? Quelles versions du protocole TLS faut-il accepter aujourd'hui ?
- [ ] SSL 3.0 et TLS 1.0, pour la compatibilité
- [ ] Toutes, le navigateur choisira la meilleure
- [x] TLS 1.2 et TLS 1.3 uniquement
=> Les versions antérieures ont des faiblesses connues et ne sont plus prises en charge par les navigateurs modernes.

?? À quoi sert l'en-tête Strict-Transport-Security ?
- [ ] À chiffrer les fichiers stockés sur le serveur
- [x] À obliger le navigateur à n'utiliser que HTTPS pour le domaine pendant une durée donnée
- [ ] À renouveler automatiquement le certificat
=> HSTS évite qu'une connexion parte en clair, même si l'utilisateur tape l'adresse sans « https:// ».

?? Pourquoi faut-il automatiser le renouvellement des certificats ?
- [ ] Parce que les certificats automatiques sont plus chiffrés
- [x] Parce que leur durée de validité diminue et qu'un oubli rend le site inaccessible
- [ ] Parce que c'est obligatoire pour obtenir le cadenas
=> Avec des certificats de quelques semaines à quelques mois, un renouvellement manuel finit toujours par être oublié.

?? Un site affiche le cadenas HTTPS. Qu'est-ce que cela garantit ?
- [ ] Que le site ne contient aucune faille
- [ ] Que l'entreprise derrière le site est honnête
- [x] Que la connexion est chiffrée vers le domaine affiché
=> HTTPS protège le transport des données ; il ne dit rien de la sécurité de l'application ni des intentions du propriétaire.
