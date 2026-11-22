---
title: Nom de domaine et DNS : expiration, DNSSEC, CAA, sous-domaines oubliés
description: Protéger le domaine dont dépendent votre site et vos e-mails : renouvellement, verrous, DNSSEC, enregistrements CAA et sous-domaines oubliés.
track: site-web
level: intermediaire
order: 8
minutes: 7
updated: 2026-11-22
tags: dns, nom de domaine, dnssec, caa, sous-domaine, registrar
---
Votre nom de domaine est le socle de toute votre présence en ligne : le site, mais aussi les e-mails, les certificats HTTPS et souvent la réinitialisation des mots de passe de vos outils. Celui qui contrôle le domaine ou sa configuration DNS peut rediriger vos visiteurs, recevoir vos e-mails ou obtenir un certificat valide à votre nom. Pourtant, le domaine est souvent géré à la va-vite : acheté par un ancien salarié, renouvelé avec une carte bancaire expirée, rempli d'enregistrements dont plus personne ne connaît l'usage. Ce cours passe en revue les risques et les protections, de l'administratif au technique.

## Ce que vous allez apprendre

- Comment éviter de perdre votre domaine par expiration ou par vol du compte.
- Ce que protège DNSSEC, et ce qu'il ne protège pas.
- Comment un enregistrement CAA limite les autorités qui peuvent émettre vos certificats.
- Ce qu'est une prise de contrôle de sous-domaine et comment l'éviter.

## Le domaine : un actif à protéger comme un compte bancaire

> [!definition] Bureau d'enregistrement (*registrar*) : la société auprès de laquelle vous louez votre nom de domaine (par exemple pour un an), et qui transmet vos réglages au registre de l'extension, comme l'Afnic pour le `.fr`.

Un domaine n'est jamais acheté définitivement : il se loue et se renouvelle. S'il expire, il cesse de fonctionner après un délai de grâce, puis peut être racheté par n'importe qui, y compris quelqu'un qui récupérera les e-mails encore envoyés à vos anciennes adresses.

Les bons réflexes :

1. **Activez le renouvellement automatique** et vérifiez que le moyen de paiement est à jour.
2. **Utilisez une adresse de contact pérenne**, partagée par l'équipe (par exemple une adresse générique), et surtout pas une adresse sur le domaine lui-même : s'il expire, vous ne recevrez plus les rappels.
3. **Sécurisez le compte du bureau d'enregistrement** : mot de passe unique, double authentification (voir [le cours dédié](/blog/double-authentification)), accès limités aux personnes qui en ont besoin.
4. **Activez le verrou de transfert** (*transfer lock*), proposé par la plupart des bureaux d'enregistrement, pour empêcher un transfert du domaine vers un autre prestataire sans votre accord.
5. **Gardez le domaine au nom de l'entreprise**, pas au nom personnel d'un salarié ou d'un prestataire.

> [!exemple] Une PME confie son site à une agence, qui achète le domaine sur son propre compte. Quelques années plus tard, l'agence ferme. Le domaine n'est pas renouvelé : le site disparaît, les e-mails de l'entreprise ne sont plus distribués, et un spéculateur rachète le nom pour le revendre à prix d'or. Faute de pouvoir prouver facilement qu'elle en était titulaire, la PME doit changer de nom de domaine, réimprimer ses documents et prévenir tous ses clients.

## DNSSEC : authentifier les réponses DNS

Le DNS traduit un nom comme `www.exemple.fr` en adresse IP. Dans sa forme d'origine, rien ne garantit que la réponse reçue est authentique : un attaquant capable d'injecter de fausses réponses peut envoyer les visiteurs vers un serveur qu'il contrôle (on parle d'empoisonnement de cache).

**DNSSEC** ajoute des signatures cryptographiques aux enregistrements DNS. Les résolveurs qui vérifient DNSSEC rejettent toute réponse dont la signature est invalide. L'activation se fait en deux temps : votre hébergeur DNS signe la zone, puis le bureau d'enregistrement publie dans la zone parente une empreinte de votre clé (l'enregistrement `DS`), ce qui crée la chaîne de confiance. Chez de nombreux prestataires, c'est une simple case à cocher. L'Afnic et l'ANSSI encouragent son déploiement.

> [!attention] DNSSEC ne chiffre pas les requêtes DNS et ne protège pas contre le vol de votre compte chez le bureau d'enregistrement : un attaquant qui s'y connecte peut modifier la configuration en toute légitimité. Attention aussi en cas de changement d'hébergeur DNS : si l'enregistrement `DS` n'est pas mis à jour, les résolveurs qui valident DNSSEC considéreront votre domaine comme invalide et votre site deviendra injoignable pour une partie des visiteurs.

## CAA : choisir qui peut émettre vos certificats

Par défaut, n'importe quelle autorité de certification peut délivrer un certificat pour votre domaine, à condition que le demandeur prouve qu'il le contrôle. Un enregistrement **CAA** (*Certification Authority Authorization*) restreint cette liste : les autorités sont tenues de le consulter avant d'émettre un certificat, et doivent refuser si elles n'y figurent pas.

```text
exemple.fr.  IN  CAA  0 issue "letsencrypt.org"
exemple.fr.  IN  CAA  0 issuewild ";"
exemple.fr.  IN  CAA  0 iodef "mailto:securite@exemple.fr"
```

- `issue` : autorités autorisées à émettre des certificats pour ce domaine.
- `issuewild` : règles pour les certificats génériques (`*.exemple.fr`) ; `";"` les interdit tous.
- `iodef` : adresse où signaler une demande refusée (toutes les autorités ne l'utilisent pas).

Avant de publier un CAA, listez les autorités réellement utilisées : celle de votre hébergeur, de votre CDN, de votre plateforme de messagerie. En oublier une bloquera le prochain renouvellement. En complément, surveillez les journaux *Certificate Transparency* (voir [HTTPS et certificats](/blog/https-et-certificats)) pour détecter un certificat émis à votre insu.

## Les sous-domaines oubliés

Au fil des années, une zone DNS accumule des sous-domaines : `boutique`, `promo-2022`, `test`, `ancien-blog`. Beaucoup pointent, via un enregistrement `CNAME`, vers des services externes : hébergement de pages, stockage cloud, plateforme de support, outil de création de pages de campagne.

> [!definition] Prise de contrôle de sous-domaine (*subdomain takeover*) : le service externe vers lequel pointe un sous-domaine a été supprimé, mais l'enregistrement DNS est resté. Un attaquant crée un compte sur ce même service, réclame le nom libéré et publie son propre contenu sur votre sous-domaine.

Le contenu s'affiche alors sous votre nom de domaine, avec toute la confiance qui s'y attache : page d'hameçonnage crédible, cookies définis pour l'ensemble du domaine (voir [les cookies sécurisés](/blog/cookies-securises)), voire certificat HTTPS obtenu légitimement pour ce sous-domaine.

Pour l'éviter :

1. **Supprimez l'enregistrement DNS en premier**, avant ou en même temps que le service externe, jamais après.
2. **Faites l'inventaire** de votre zone DNS au moins une fois par an, et identifiez un responsable pour chaque sous-domaine.
3. **Repérez les enregistrements « orphelins »** : un `CNAME` qui pointe vers un service répondant « domaine inconnu » ou « page introuvable » est un signal d'alerte.

Les journaux *Certificate Transparency* révèlent d'ailleurs vos sous-domaines à tout le monde : les attaquants s'en servent pour les trouver, servez-vous-en aussi.

Enfin, le DNS porte aussi la protection de vos e-mails contre l'usurpation (SPF, DKIM, DMARC), détaillée dans [le cours sur la messagerie](/blog/securiser-messagerie-spf-dkim-dmarc).

## À retenir

- Renouvellement automatique, contact pérenne, double authentification et verrou de transfert protègent le domaine lui-même.
- Le domaine doit appartenir à l'entreprise, pas à un salarié ou à un prestataire.
- DNSSEC authentifie les réponses DNS ; pensez à l'enregistrement `DS` lors d'un changement d'hébergeur.
- Un enregistrement CAA limite les autorités autorisées à émettre vos certificats.
- Supprimez l'enregistrement DNS avant le service externe, et inventoriez régulièrement vos sous-domaines.

## Quiz

?? Que permet un enregistrement CAA ?
- [ ] Chiffrer les requêtes DNS
- [x] Indiquer quelles autorités de certification peuvent émettre des certificats pour le domaine
- [ ] Renouveler automatiquement le nom de domaine
=> Les autorités doivent consulter le CAA et refuser d'émettre un certificat si elles n'y sont pas autorisées.

?? Qu'apporte DNSSEC ?
- [x] Des signatures qui permettent de vérifier l'authenticité des réponses DNS
- [ ] Le chiffrement de toutes les requêtes DNS
- [ ] Une protection contre le vol du compte chez le bureau d'enregistrement
=> DNSSEC garantit l'authenticité et l'intégrité des réponses, mais pas leur confidentialité.

?? Vous arrêtez une page de campagne hébergée sur un service externe via un CNAME. Dans quel ordre agir ?
- [ ] Supprimer le service, puis l'enregistrement DNS quelques mois plus tard
- [ ] Garder l'enregistrement DNS au cas où
- [x] Supprimer l'enregistrement DNS avant ou en même temps que le service
=> Un CNAME qui pointe vers un service supprimé peut être réclamé par un attaquant : c'est la prise de contrôle de sous-domaine.

?? Pourquoi ne pas utiliser une adresse sur le domaine lui-même comme contact du bureau d'enregistrement ?
- [ ] Parce que c'est interdit par l'Afnic
- [x] Parce que si le domaine expire, les rappels n'arrivent plus
- [ ] Parce que ces adresses reçoivent trop de spam
=> Une adresse dépendant du domaine cesse de fonctionner précisément au moment où vous avez besoin des alertes.
