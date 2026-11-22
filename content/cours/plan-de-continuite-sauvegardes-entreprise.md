---
title: Sauvegardes et continuité d'activité en entreprise
description: Activités vitales, perte de données acceptable, sauvegarde du cloud, tests de restauration : bâtir un plan de continuité réaliste pour une PME.
track: entreprise
level: intermediaire
order: 9
minutes: 7
updated: 2026-11-22
tags: sauvegardes, continuité d'activité, PCA, restauration, cloud
---
Un rançongiciel, un incendie, un dégât des eaux, la panne d'un serveur ou la fermeture soudaine d'un service en ligne : les causes d'interruption sont nombreuses, mais la question est toujours la même. Combien de temps votre activité peut-elle tenir sans ses outils informatiques, et combien de données pouvez-vous perdre ? Avoir des sauvegardes ne suffit pas : il faut savoir quoi restaurer en premier, en combien de temps, et comment continuer à travailler en attendant. C'est l'objet d'un plan de continuité d'activité, qui peut tenir en quelques pages pour une petite structure.

## Ce que vous allez apprendre

- Comment identifier les activités et les données vraiment vitales.
- Ce que signifient la durée d'interruption et la perte de données acceptables.
- Pourquoi les données hébergées dans le cloud doivent aussi être sauvegardées.
- Comment organiser des sauvegardes résistantes aux attaques.
- Comment tester le plan pour qu'il fonctionne le jour J.

## Étape 1 : identifier ce qui est vital

Réunissez la direction et les responsables d'activité, et posez une question simple pour chaque activité : **que se passe-t-il si elle s'arrête une heure, un jour, une semaine ?** Facturation, paie, prise de commandes, production, accueil des clients, site de vente en ligne : toutes n'ont pas la même urgence.

Pour chaque activité vitale, notez les outils et les données dont elle dépend : logiciel de gestion, fichiers partagés, messagerie, téléphonie, accès bancaire, et les prestataires impliqués.

## Étape 2 : fixer deux objectifs chiffrés

> [!definition] Durée maximale d'interruption admissible (DMIA, en anglais RTO) : temps au-delà duquel l'arrêt d'une activité devient inacceptable. Perte de données maximale admissible (PDMA, en anglais RPO) : quantité de données, exprimée en durée, que l'on accepte de perdre, par exemple « une journée de saisie ».

Ces deux valeurs guident tous les choix techniques. Si vous ne pouvez pas perdre plus de quelques heures de commandes, une sauvegarde hebdomadaire ne suffit pas. Si la facturation peut attendre trois jours, inutile d'investir dans une solution de reprise instantanée pour elle.

> [!exemple] Une boulangerie-traiteur de douze salariés fait l'exercice. La prise de commandes des clients professionnels ne peut pas s'arrêter plus d'une demi-journée ; la comptabilité peut attendre une semaine. Elle décide donc de sauvegarder le logiciel de commandes chaque nuit avec une copie hors site, de garder un ordinateur portable de secours prêt à l'emploi, et de prévoir un carnet de commandes papier avec la liste des clients imprimée chaque mois. Lors d'une panne du serveur un vendredi matin, les commandes continuent au téléphone et sur papier, puis sont ressaisies l'après-midi sur le poste de secours.

## Étape 3 : des sauvegardes qui tiennent face aux attaques

La base reste la règle 3-2-1 : trois copies des données, sur deux supports différents, dont une hors site. Voir [le cours sur la règle 3-2-1](/blog/sauvegardes-3-2-1). En entreprise, ajoutez :

- **au moins une copie hors ligne ou immuable**, que personne, y compris un attaquant ayant pris le contrôle d'un compte administrateur, ne peut effacer ou chiffrer (voir [se préparer au rançongiciel](/blog/ransomware-se-preparer)) ;
- **des identifiants dédiés** pour l'outil de sauvegarde, protégés par double authentification et distincts des comptes du réseau ;
- **plusieurs générations** de sauvegardes, pour revenir à une date antérieure à une infection passée inaperçue ;
- **le chiffrement** des copies emportées hors site ou stockées chez un tiers, avec une clé conservée en lieu sûr ;
- **une surveillance** : quelqu'un vérifie chaque semaine que les sauvegardes se sont bien déroulées.

## Étape 4 : ne pas oublier le cloud

Beaucoup d'entreprises pensent que leurs données en ligne (suite bureautique, messagerie, logiciel de gestion en ligne) sont automatiquement sauvegardées par le fournisseur. Le fournisseur assure généralement la disponibilité de son service, mais **pas forcément la récupération de vos données** après une suppression par erreur, un compte piraté qui efface tout, ou la fin de votre abonnement.

> [!attention] Lisez les conditions de vos services en ligne : durée de conservation des éléments supprimés, possibilité d'export, sauvegardes incluses ou non. Si la protection est insuffisante pour vos besoins, prévoyez un export régulier ou un outil de sauvegarde tiers.

Pensez aussi aux éléments souvent oubliés : configuration du site web et de sa base de données, zone DNS, configuration des équipements réseau, licences et codes d'activation, liste des comptes et des accès.

## Étape 5 : le mode dégradé et l'organisation de crise

Le plan décrit comment travailler pendant que les outils sont indisponibles :

- procédures papier ou manuelles pour les activités vitales ;
- matériel de secours (un ordinateur portable préparé, un routeur 4G ou 5G) ;
- moyens de communication de secours si la messagerie est hors service : liste téléphonique imprimée, groupe de messagerie prévu à l'avance ;
- qui décide, qui contacte le prestataire, l'assureur, les clients.

Conservez ce plan **hors du système d'information** : une version imprimée chez le dirigeant et le référent, une copie sur un support déconnecté. Voir aussi [gérer un incident de sécurité](/blog/gerer-un-incident-de-securite).

## Étape 6 : tester, encore et toujours

Une sauvegarde jamais restaurée est un pari. Programmez :

1. **Un test de restauration de fichiers** chaque mois, sur un dossier choisi au hasard.
2. **Une restauration complète** d'un serveur ou d'une application vitale une à deux fois par an, en chronométrant l'opération : est-elle compatible avec votre durée d'interruption admissible ?
3. **Un exercice sur table** une fois par an : l'équipe se réunit autour d'un scénario (« le serveur est chiffré lundi à 8 h ») et déroule le plan pour repérer les trous.

Notez les résultats et les corrections apportées. Ces traces démontrent aussi votre capacité à rétablir les données en temps utile, exigée par l'article 32 du RGPD (voir [le cours RGPD](/blog/rgpd-essentiel-securite)).

## À retenir

- Identifiez les activités vitales et ce dont elles dépendent avant de choisir des solutions.
- Fixez pour chacune une durée d'interruption et une perte de données acceptables.
- Gardez au moins une sauvegarde hors ligne ou immuable, avec des identifiants dédiés.
- Les données hébergées dans le cloud doivent aussi faire l'objet d'une sauvegarde ou d'un export.
- Prévoyez un mode dégradé, imprimez le plan, et testez restauration et organisation chaque année.

## Quiz

?? Que désigne la perte de données maximale admissible ?
- [ ] Le nombre de disques de sauvegarde à acheter
- [x] La quantité de données, exprimée en durée, que l'on accepte de perdre
- [ ] Le temps nécessaire pour réparer un ordinateur
=> Si vous acceptez de perdre une journée de saisie au plus, il faut au moins une sauvegarde par jour.

?? Vos documents sont dans une suite bureautique en ligne. Sont-ils forcément sauvegardés ?
- [ ] Oui, le fournisseur garantit toujours la récupération de tout
- [x] Pas forcément : il faut vérifier les conditions et prévoir un export ou une sauvegarde si besoin
- [ ] Oui, à condition de payer l'abonnement
=> Le fournisseur assure la disponibilité du service, pas nécessairement la restauration après suppression ou piratage.

?? Où conserver le plan de continuité ?
- [ ] Uniquement sur le serveur de fichiers de l'entreprise
- [x] Sur papier et sur un support déconnecté, en plus de la version de travail
- [ ] Dans la boîte e-mail du dirigeant
=> Le jour de l'incident, le serveur et la messagerie peuvent être inaccessibles.

?? Comment savoir si vos sauvegardes permettent de respecter la durée d'interruption admissible ?
- [ ] En vérifiant que le voyant du disque s'allume
- [ ] En faisant confiance au prestataire
- [x] En réalisant une restauration complète chronométrée
=> Seul un test réel montre si la restauration fonctionne et en combien de temps.
