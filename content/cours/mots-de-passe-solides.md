---
title: Créer des mots de passe solides et ne plus jamais les oublier
description: Longueur, phrases de passe, gestionnaire de mots de passe : la méthode simple pour des comptes vraiment protégés, sans tout retenir.
track: fondamentaux
level: debutant
order: 2
minutes: 8
updated: 2026-11-22
tags: mots de passe, gestionnaire, phrase de passe, fuite de données
---
Un mot de passe est la clé de votre vie numérique : messagerie, banque, réseaux sociaux, outils de travail. Or la plupart des piratages de comptes ne viennent pas d'attaques sophistiquées, mais de mots de passe trop simples ou réutilisés sur plusieurs sites. La bonne nouvelle : quelques habitudes suffisent à vous mettre hors de portée de la grande majorité des attaques.

## Ce que vous allez apprendre

- Pourquoi un mot de passe court est cassé en quelques instants, même s'il contient des symboles.
- Comment fabriquer une phrase de passe longue et facile à retenir.
- Pourquoi la réutilisation d'un mot de passe est le risque numéro un.
- Comment un gestionnaire de mots de passe retient tout à votre place.
- Que faire quand un site où vous êtes inscrit est victime d'une fuite.

## Comment les mots de passe sont cassés

Les attaquants ne devinent pas votre mot de passe en essayant à la main. Ils utilisent des programmes qui testent des milliards de combinaisons, en commençant par les plus probables : mots du dictionnaire, prénoms, dates de naissance, suites de clavier comme `azerty123`, et les variantes classiques où l'on remplace un « a » par « @ » ou un « e » par « 3 ».

Ils disposent aussi de listes de mots de passe réels, issues de fuites de données publiées sur Internet. Si votre mot de passe y figure, il sera testé parmi les premiers.

> [!definition] Attaque par force brute : essai automatique d'un très grand nombre de combinaisons jusqu'à trouver la bonne. Sa difficulté dépend surtout de la longueur du mot de passe.

C'est pourquoi la **longueur** compte davantage que la complexité. Chaque caractère ajouté multiplie le nombre de combinaisons à tester. Un mot de passe de 8 caractères, même avec des symboles, peut être cassé rapidement par du matériel courant ; une phrase de 5 ou 6 mots choisis au hasard résiste pendant des siècles.

## La phrase de passe : longue et mémorisable

Plutôt qu'un mot compliqué impossible à retenir, utilisez une suite de mots sans rapport entre eux :

```text
girafe-violon-nuage-tartine-boussole
```

Ce type de phrase est très long, donc très résistant, et vous pouvez vous en souvenir en imaginant une scène absurde : une girafe qui joue du violon sur un nuage en mangeant une tartine.

Pour qu'elle soit vraiment solide :

1. Choisissez au moins 5 mots, vraiment au hasard (tirage au dé, générateur).
2. N'utilisez ni citation, ni paroles de chanson, ni proverbe : ils figurent dans les dictionnaires d'attaque.
3. Évitez les informations personnelles (prénoms, animaux, ville, dates).

> [!astuce] L'ANSSI propose des recommandations détaillées sur l'authentification par mot de passe. La CNIL met aussi en ligne un générateur de mots de passe et des conseils grand public.

## Le vrai danger : réutiliser le même mot de passe

Imaginons que vous utilisiez le même mot de passe pour un petit site de recettes et pour votre messagerie. Le site de recettes est piraté et sa base de données publiée. Les attaquants récupèrent votre adresse e-mail et votre mot de passe… puis les essaient automatiquement sur des centaines d'autres services. Cette technique s'appelle le **bourrage d'identifiants** (*credential stuffing*).

> [!exemple] Une comptable utilise le même mot de passe pour un forum de jardinage et pour sa messagerie professionnelle. Le forum subit une fuite. Quelques jours plus tard, quelqu'un se connecte à sa messagerie, lit ses échanges avec les fournisseurs et envoie une fausse demande de changement de RIB à un client. Le virement part vers le compte de l'escroc.

La règle est donc simple : **un mot de passe différent pour chaque compte**. Personne ne peut retenir cinquante phrases de passe : c'est exactement le rôle d'un gestionnaire de mots de passe.

## Le gestionnaire de mots de passe

Un gestionnaire est un coffre-fort chiffré qui retient tous vos mots de passe. Vous n'en mémorisez plus qu'un seul : le **mot de passe maître**, qui ouvre le coffre.

Il apporte trois avantages :

- il génère des mots de passe longs et aléatoires, différents pour chaque site ;
- il les remplit automatiquement, ce qui évite les fautes de frappe ;
- il ne propose le remplissage que sur le vrai site, ce qui vous protège aussi contre les faux sites d'hameçonnage.

Il existe des gestionnaires gratuits et open source, ainsi que des solutions intégrées aux navigateurs et aux systèmes d'exploitation. L'important est de choisir un outil reconnu, de protéger le coffre par une phrase de passe solide et d'activer la double authentification dessus.

> [!attention] Le mot de passe maître ne doit être utilisé nulle part ailleurs. Si vous l'oubliez, la plupart des gestionnaires ne peuvent pas le récupérer : notez-le sur papier et rangez-le en lieu sûr, chez vous.

## Quand un site où vous êtes inscrit est piraté

Les fuites de données sont fréquentes. Pour savoir si une de vos adresses e-mail apparaît dans une fuite connue, vous pouvez utiliser un service de vérification reconnu comme [Have I Been Pwned](https://haveibeenpwned.com/). Si c'est le cas :

1. Changez immédiatement le mot de passe du site concerné.
2. Changez-le aussi partout où vous l'aviez réutilisé.
3. Activez la double authentification sur vos comptes importants (voir [le cours dédié](/blog/double-authentification)).
4. Méfiez-vous des e-mails des jours suivants : les fuites alimentent souvent des campagnes d'hameçonnage ciblées.

## À retenir

- La longueur protège mieux que la complexité : visez une phrase de passe d'au moins 5 mots aléatoires.
- Un mot de passe différent pour chaque compte, sans exception pour les comptes importants.
- Un gestionnaire de mots de passe retient tout à votre place et vous protège des faux sites.
- Le mot de passe maître est unique, long, et protégé par la double authentification.
- En cas de fuite : changer le mot de passe partout où il était réutilisé.

## Quiz

?? Quel mot de passe est le plus résistant ?
- [ ] P@ssw0rd!
- [ ] Martin1985
- [x] lampe-fougere-cactus-orbite-velo
=> La longueur et le hasard comptent plus que les symboles : une suite de 5 mots aléatoires est bien plus difficile à casser.

?? Pourquoi est-il dangereux d'utiliser le même mot de passe sur plusieurs sites ?
- [ ] Parce que les sites le détectent et bloquent le compte
- [x] Parce qu'une fuite sur un seul site permet d'entrer dans tous les autres comptes
- [ ] Parce que le mot de passe s'use à force d'être utilisé
=> Les attaquants testent automatiquement les identifiants volés sur d'autres services : c'est le bourrage d'identifiants.

?? Quel est le principal rôle d'un gestionnaire de mots de passe ?
- [ ] Envoyer vos mots de passe par e-mail en cas d'oubli
- [x] Générer et retenir un mot de passe unique et solide pour chaque compte
- [ ] Remplacer la double authentification
=> Il crée et mémorise des mots de passe différents pour chaque site ; la double authentification reste recommandée en complément.

?? Votre adresse e-mail apparaît dans une fuite de données. Que faites-vous en premier ?
- [ ] Vous supprimez votre adresse e-mail
- [ ] Vous attendez que le site vous contacte
- [x] Vous changez le mot de passe concerné, et partout où il était réutilisé
=> Il faut rendre inutilisable le mot de passe exposé, sur le site concerné comme sur les autres comptes qui le partageaient.
