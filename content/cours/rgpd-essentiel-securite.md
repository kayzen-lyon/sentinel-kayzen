---
title: RGPD : ce que la sécurité des données vous impose
description: Article 32, notification des violations à la CNIL sous 72 heures, information des personnes : les obligations de sécurité du RGPD expliquées simplement.
track: entreprise
level: intermediaire
order: 3
minutes: 7
updated: 2026-11-22
tags: RGPD, CNIL, données personnelles, violation de données, article 32
---
Le RGPD, le règlement général sur la protection des données, ne parle pas seulement de consentement et de bandeaux de cookies. Il impose aussi à toute organisation qui traite des données personnelles, de la TPE à l'association, de les **protéger** et de réagir correctement quand elles sont compromises. Fichier clients, dossiers des salariés, liste des adhérents, devis contenant des coordonnées : dès que vous manipulez des informations sur des personnes, ces règles vous concernent. Ce cours présente les obligations de sécurité, à titre d'information générale ; pour une situation précise, rapprochez-vous de la CNIL ou d'un professionnel du droit.

## Ce que vous allez apprendre

- Ce que l'article 32 du RGPD demande en matière de sécurité.
- Ce qu'est une violation de données personnelles, avec des exemples concrets.
- Quand et comment notifier la CNIL, et dans quel délai.
- Quand il faut informer les personnes concernées.
- Ce que vous devez exiger de vos sous-traitants.

## L'article 32 : une obligation de moyens adaptés au risque

L'article 32 du RGPD impose au responsable du traitement, et à son sous-traitant, de mettre en œuvre des **mesures techniques et organisationnelles appropriées** pour garantir un niveau de sécurité adapté au risque. Le texte ne fixe pas de liste fermée : il demande de tenir compte de l'état des connaissances, des coûts, de la nature des données et des risques pour les personnes.

> [!definition] Responsable du traitement : l'organisation qui décide pourquoi et comment des données personnelles sont traitées (par exemple votre entreprise pour son fichier clients). Sous-traitant : l'organisation qui traite ces données pour votre compte (hébergeur, éditeur de logiciel en ligne, prestataire de paie).

L'article cite plusieurs exemples de mesures, selon les besoins :

- la pseudonymisation et le chiffrement des données ;
- des moyens garantissant la confidentialité, l'intégrité, la disponibilité et la résilience des systèmes ;
- des moyens de rétablir la disponibilité des données et l'accès à celles-ci en temps utile après un incident, autrement dit des sauvegardes qui fonctionnent ;
- une procédure pour tester et évaluer régulièrement l'efficacité des mesures.

En pratique, les mesures de base décrites dans [les 10 premières mesures](/blog/cyber-tpe-pme-premiers-pas) répondent déjà à une bonne partie de cette exigence : mots de passe solides, double authentification, droits d'accès limités, mises à jour, sauvegardes testées. La CNIL publie un **guide de la sécurité des données personnelles** qui détaille ces précautions.

> [!astuce] Documentez vos mesures. En cas de contrôle ou d'incident, vous devrez montrer ce que vous avez mis en place : c'est le principe de responsabilité (« accountability ») du RGPD.

## Qu'est-ce qu'une violation de données ?

Une violation de données personnelles est un incident de sécurité qui entraîne, de façon accidentelle ou illicite, la **destruction, la perte, l'altération, la divulgation non autorisée ou l'accès non autorisé** à des données personnelles. Elle ne se limite pas au piratage :

- un ordinateur portable non chiffré volé dans une voiture ;
- un e-mail contenant des bulletins de paie envoyé au mauvais destinataire ;
- une messagerie piratée dont l'attaquant a pu lire les échanges avec les clients ;
- des fichiers rendus inaccessibles par un rançongiciel, sans sauvegarde.

## Notifier la CNIL : 72 heures

Selon l'article 33 du RGPD, le responsable du traitement notifie la violation à l'autorité de contrôle, la **CNIL** en France, dans les meilleurs délais et, si possible, **72 heures au plus tard après en avoir pris connaissance**. La notification n'est pas requise si la violation n'est pas susceptible d'engendrer un risque pour les droits et libertés des personnes. Si le délai de 72 heures est dépassé, la notification doit indiquer les motifs du retard. Les informations peuvent être transmises en plusieurs fois si l'enquête est en cours.

La notification se fait en ligne via le téléservice dédié sur [cnil.fr](https://www.cnil.fr/). Elle décrit notamment la nature de la violation, les catégories et le nombre approximatif de personnes et d'enregistrements concernés, les conséquences probables et les mesures prises.

> [!attention] Quelle que soit la décision de notifier ou non, **toute violation doit être documentée en interne** : faits, effets, mesures prises. Tenez un registre des violations, même pour les incidents mineurs.

Le sous-traitant, de son côté, doit avertir le responsable du traitement dans les meilleurs délais après avoir pris connaissance d'une violation. D'où l'importance de clauses claires dans vos contrats.

## Informer les personnes concernées

L'article 34 prévoit que, lorsque la violation est susceptible d'engendrer un **risque élevé** pour les droits et libertés des personnes, le responsable du traitement les en informe dans les meilleurs délais, en termes clairs et simples. Cette information n'est pas exigée notamment si les données étaient protégées de façon à les rendre incompréhensibles (par exemple un chiffrement solide), si des mesures ultérieures ont fait disparaître le risque élevé, ou si cela exigerait des efforts disproportionnés, auquel cas une communication publique peut la remplacer.

> [!exemple] Une association sportive se fait voler un ordinateur portable non chiffré contenant les noms, adresses et certificats médicaux de ses 300 adhérents. Les données de santé rendent le risque élevé : l'association notifie la CNIL sous 72 heures, puis écrit aux adhérents pour expliquer ce qui s'est passé et les inviter à la vigilance face aux tentatives d'escroquerie. Si le disque avait été chiffré, l'information des adhérents n'aurait probablement pas été nécessaire, mais l'incident aurait tout de même été consigné dans le registre interne.

## Vos sous-traitants et les sanctions

L'article 28 impose de ne recourir qu'à des sous-traitants présentant des garanties suffisantes, et d'encadrer la relation par un contrat qui prévoit notamment des mesures de sécurité et l'assistance en cas de violation. Vérifiez les conditions de vos outils en ligne : hébergement, sauvegardes, localisation des données, notification des incidents.

En cas de manquement aux obligations de sécurité et de notification, le RGPD prévoit des amendes administratives pouvant atteindre 10 millions d'euros ou 2 % du chiffre d'affaires annuel mondial, le montant le plus élevé étant retenu. La CNIL tient compte de nombreux critères, dont la gravité, la taille de l'organisme et sa coopération ; elle peut aussi prononcer des mises en demeure ou des rappels à l'ordre.

## À retenir

- L'article 32 exige des mesures de sécurité adaptées au risque, et la capacité à les démontrer.
- Une violation de données n'est pas forcément un piratage : perte, vol, erreur d'envoi comptent aussi.
- Notification à la CNIL dans les meilleurs délais, si possible sous 72 heures, sauf absence de risque.
- Information des personnes en cas de risque élevé, sauf exceptions comme des données correctement chiffrées.
- Toute violation est consignée dans un registre interne, et les contrats de sous-traitance prévoient la sécurité.

## Quiz

?? Quel est le délai prévu par le RGPD pour notifier une violation à la CNIL ?
- [ ] 24 heures après l'incident, sans exception
- [x] Dans les meilleurs délais et, si possible, 72 heures au plus tard après en avoir pris connaissance
- [ ] Un mois après la fin de l'enquête
=> L'article 33 fixe ce délai ; en cas de retard, la notification doit en expliquer les motifs.

?? Lequel de ces événements peut constituer une violation de données personnelles ?
- [ ] Une panne de courant sans conséquence sur les données
- [x] L'envoi par erreur de bulletins de paie au mauvais destinataire
- [ ] La mise à jour d'un logiciel de comptabilité
=> Une divulgation non autorisée, même accidentelle, est une violation de données personnelles.

?? Que faire d'une violation qui ne présente aucun risque pour les personnes ?
- [ ] Rien du tout
- [ ] La notifier obligatoirement à la CNIL
- [x] La documenter dans le registre interne des violations
=> La notification n'est pas requise sans risque, mais toute violation doit être documentée.

?? Dans quel cas l'information des personnes concernées n'est-elle généralement pas exigée ?
- [x] Lorsque les données perdues étaient chiffrées de façon à être incompréhensibles
- [ ] Lorsque l'entreprise compte moins de 50 salariés
- [ ] Lorsque l'incident est gênant pour l'image de l'entreprise
=> Un chiffrement solide fait partie des exceptions prévues par l'article 34 ; la taille de l'entreprise n'en est pas une.
