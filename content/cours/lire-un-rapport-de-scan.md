---
title: Lire un rapport de scan de sécurité et prioriser les corrections
description: Note globale, niveaux de gravité, faux positifs, gains rapides : comment comprendre un rapport de scan et décider quoi corriger en premier.
track: site-web
level: intermediaire
order: 9
minutes: 7
updated: 2026-11-22
tags: scan de sécurité, rapport, priorisation, gravité, cvss, faux positifs
---
Vous venez de lancer un scan de sécurité sur votre site, ou votre prestataire vous a transmis un rapport. Une note, des dizaines de lignes colorées, des termes techniques : la première réaction est souvent de tout vouloir corriger d'un coup, ou au contraire de ranger le rapport dans un tiroir. Aucune des deux n'est la bonne. Un rapport de scan est un outil de décision : il dit ce qui a été observé, avec quel niveau de risque, et vous aide à choisir l'ordre des corrections. Ce cours vous apprend à le lire comme un professionnel.

## Ce que vous allez apprendre

- Ce que mesure un scan passif, et ce qu'il ne voit pas.
- Comment interpréter une note globale et les niveaux de gravité.
- Comment repérer un faux positif.
- Comment construire un plan de correction en croisant gravité et effort.

## Ce que voit un scan, et ce qu'il ne voit pas

Il existe deux grandes familles de scans :

- **le scan passif** observe votre site comme le ferait un visiteur attentif : configuration HTTPS et certificat, en-têtes de sécurité, cookies, enregistrements DNS et de messagerie, versions de logiciels visibles, fichiers exposés par erreur. Il n'envoie aucune charge d'attaque ;
- **le test actif** (scan de vulnérabilités ou test d'intrusion) essaie réellement d'exploiter des failles : injections, contournement d'authentification, contrôle d'accès. Il est plus profond, mais il doit être encadré.

> [!attention] Un test actif sur un site qui ne vous appartient pas, sans autorisation écrite de son propriétaire, est illégal en France (article 323-1 du Code pénal). Même sur votre propre site, prévenez votre hébergeur et évitez les heures de forte affluence.

Un scan passif ne peut pas tout voir : une faille dans la logique de votre application, comme un client qui accède aux commandes d'un autre (voir [le contrôle d'accès](/blog/controle-acces-idor)), ne se détecte pas de l'extérieur sans tester les fonctions. Une bonne note n'est donc pas un certificat de sécurité : c'est le signe d'une configuration saine, ce qui est déjà beaucoup.

## La note globale : un indicateur, pas un objectif

La plupart des outils résument le résultat par une **note de A à F**, sur le modèle des bulletins scolaires : A pour une configuration exemplaire, F pour des problèmes sérieux. Cette note est calculée à partir des constats, pondérés par leur gravité ; la méthode varie d'un outil à l'autre, et deux scanners peuvent donner des notes différentes au même site.

Utilisez-la pour deux choses : **communiquer** (un dirigeant comprend « nous sommes passés de D à B ») et **suivre l'évolution** dans le temps avec le même outil. Ne la poursuivez pas pour elle-même : gagner une lettre en ajoutant un en-tête mineur est moins utile que corriger une seule faille critique.

## Les niveaux de gravité

Chaque constat reçoit un niveau de gravité. Les intitulés varient, mais on retrouve presque toujours ces quatre niveaux, souvent inspirés de l'échelle CVSS (une note de 0 à 10) :

- **Critique** : exploitable facilement, avec des conséquences graves (prise de contrôle, fuite massive de données). Exemple : un fichier de sauvegarde de la base de données téléchargeable publiquement. À traiter **immédiatement**.
- **Élevée** : risque sérieux, mais qui demande une condition particulière. Exemple : une version de CMS touchée par une faille connue. À traiter **sous quelques jours**.
- **Moyenne** : affaiblit la sécurité ou facilite une autre attaque. Exemple : absence de HSTS, cookie de session sans `Secure`. À planifier **dans le mois**.
- **Faible** : bonne pratique manquante, impact limité. Exemple : numéro de version du serveur visible dans les en-têtes. À traiter **quand l'occasion se présente**.

Certains rapports ajoutent un niveau **informatif** : ce n'est pas un problème, mais un élément utile à connaître.

> [!astuce] Ajustez la gravité à votre contexte. Une faille moyenne sur la page de paiement mérite plus d'attention que la même faille sur une page de démonstration qui doit disparaître. À l'inverse, un constat critique sur un sous-domaine que vous supprimez demain se règle… en le supprimant.

## Les faux positifs

Un scanner automatique se trompe parfois : il signale un problème qui n'existe pas (**faux positif**). Exemple classique : l'outil détecte une ancienne version d'un logiciel d'après son numéro, alors que votre distribution Linux a appliqué le correctif sans changer le numéro principal.

Avant de mobiliser une équipe, vérifiez chaque constat critique ou élevé : le rapport doit fournir une **preuve** (en-tête reçu, URL concernée, réponse du serveur). Si vous concluez à un faux positif, notez pourquoi, pour ne pas refaire l'analyse au scan suivant. Dans le doute, considérez le constat comme réel.

## Prioriser : gravité et effort

Pour construire votre plan, croisez deux questions : **quelle est la gravité ?** et **combien d'effort faut-il pour corriger ?** Les bons rapports indiquent l'effort estimé (faible, moyen, important).

1. **Critique ou élevé, quel que soit l'effort** : en premier, sans attendre.
2. **Gains rapides** (*quick wins*) : gravité moyenne ou faible, mais quelques minutes de travail. Ajouter des en-têtes de sécurité (voir [le cours dédié](/blog/en-tetes-de-securite-http)), poser les attributs des cookies (voir [les cookies sécurisés](/blog/cookies-securises)), masquer une version. Regroupez-les en une seule intervention.
3. **Moyen avec effort important** : planifiez-les, par exemple la mise en place d'une [Content-Security-Policy](/blog/content-security-policy) stricte, qui demande des tests.
4. **Faible avec effort important** : notez-les, et traitez-les lors d'une refonte.

> [!exemple] Le rapport du site d'un cabinet d'architectes affiche la note D et dix-sept constats. Un seul est critique : le dossier `/.git/` est accessible, ce qui permet de télécharger le code source et un mot de passe de base de données qui s'y trouve. L'agence bloque l'accès au dossier dans l'heure et change le mot de passe (voir [les secrets dans le code](/blog/secrets-dans-le-code)). Le lendemain, elle traite en vingt minutes onze gains rapides : en-têtes de sécurité, attributs de cookies, version du serveur masquée. La note passe à B. Les deux constats restants, une CSP stricte et une mise à jour majeure du CMS, sont planifiés pour le mois suivant.

## Vérifier et suivre

Une correction n'est terminée que lorsqu'elle est **vérifiée** : relancez le scan après chaque série de corrections. Gardez les rapports successifs pour mesurer les progrès et repérer les régressions, par exemple un en-tête qui disparaît après une mise à jour du serveur. Un scan ponctuel est une photographie ; la sécurité se suit dans la durée (voir [la surveillance continue](/blog/surveiller-son-site-en-continu)).

Si vous voulez vous exercer sur votre propre site, Sentinel propose un [scan passif gratuit](/dashboard/scan), sans aucune charge d'attaque.

## À retenir

- Un scan passif vérifie la configuration visible ; il ne remplace pas un test des fonctions de l'application.
- La note globale sert à communiquer et à suivre l'évolution, pas à être optimisée pour elle-même.
- Critique : immédiatement. Élevé : sous quelques jours. Moyen : dans le mois. Faible : à l'occasion.
- Vérifiez la preuve de chaque constat important pour écarter les faux positifs.
- Regroupez les gains rapides, puis relancez le scan pour confirmer les corrections.

## Quiz

?? Que permet de détecter un scan passif ?
- [ ] Toutes les failles de logique de l'application
- [x] Les problèmes de configuration visibles, comme les en-têtes ou le certificat
- [ ] Les mots de passe faibles des utilisateurs
=> Un scan passif observe ce que le site expose publiquement ; il n'essaie pas d'exploiter les fonctions de l'application.

?? Un rapport contient un constat critique et dix constats faibles faciles à corriger. Par quoi commencer ?
- [x] Par le constat critique
- [ ] Par les dix constats faibles, pour faire monter la note
- [ ] Par celui qui fait gagner le plus de points
=> Un risque critique peut entraîner une compromission ; les gains rapides viennent juste après.

?? Qu'est-ce qu'un faux positif dans un rapport de scan ?
- [ ] Une faille réelle mais sans importance
- [x] Un problème signalé par l'outil qui n'existe pas réellement
- [ ] Une faille corrigée depuis le dernier scan
=> L'outil se trompe parfois, par exemple sur un numéro de version ; la preuve fournie permet de le vérifier.

?? Qu'appelle-t-on un gain rapide (quick win) ?
- [ ] Une faille critique corrigée en urgence
- [ ] Une mise à jour majeure du CMS
- [x] Une correction de faible effort qui améliore nettement la sécurité
=> Ajouter des en-têtes ou des attributs de cookies prend quelques minutes et réduit plusieurs risques à la fois.
