---
title: Surveiller la sécurité de son site en continu
description: Disponibilité, certificats, intégrité, journaux, alertes et scans réguliers : une surveillance simple qui repère les problèmes avant vos visiteurs.
track: site-web
level: intermediaire
order: 10
minutes: 7
updated: 2026-11-22
tags: surveillance, monitoring, journaux, alertes, certificats, scan régulier
---
Un site sécurisé le jour de sa mise en ligne ne le reste pas tout seul. Un certificat arrive à expiration, une mise à jour du serveur fait disparaître un en-tête, une extension se révèle vulnérable, un collègue ajoute un script tiers, un sous-domaine est oublié. Et quand une intrusion a lieu, la question décisive devient : combien de temps avant que quelqu'un s'en aperçoive ? Sans surveillance, la réponse se compte souvent en semaines, et c'est un client, Google ou un attaquant qui vous prévient. Ce cours vous aide à mettre en place une surveillance proportionnée, même avec peu de moyens.

## Ce que vous allez apprendre

- Quels signaux surveiller en priorité sur un site web.
- Comment détecter une modification non autorisée du site.
- Quoi journaliser, et comment éviter de noyer les alertes importantes.
- Comment organiser des scans réguliers et une routine de suivi.
- Que faire quand une alerte se déclenche.

## Les signaux à surveiller en priorité

Commencez par ce qui casse le plus souvent et se voit le plus vite :

- **La disponibilité** : une sonde externe interroge votre site toutes les quelques minutes et vous alerte s'il ne répond plus ou renvoie une erreur. De nombreux services proposent une offre gratuite suffisante pour un petit site.
- **Le certificat HTTPS** : alerte au moins trois semaines avant l'expiration, puis à nouveau quelques jours avant. Avec des durées de validité qui raccourcissent et des autorités qui n'envoient plus forcément de rappels, c'est indispensable (voir [HTTPS et certificats](/blog/https-et-certificats)).
- **Le nom de domaine** : date d'expiration et modifications de la zone DNS (voir [le cours sur le DNS](/blog/nom-de-domaine-et-dns)).
- **Les nouveaux certificats émis pour votre domaine**, visibles dans les journaux *Certificate Transparency* : un certificat que vous n'avez pas demandé est un signal d'alerte sérieux.
- **La réputation** : la [Google Search Console](https://search.google.com/search-console) vous prévient si Google détecte un logiciel malveillant ou du contenu piraté sur votre site.

> [!astuce] Envoyez les alertes vers une adresse ou un canal partagé par l'équipe, pas vers la boîte d'une seule personne. Les congés et les départs sont la première cause d'alertes ignorées.

## Détecter les modifications non autorisées

Après une intrusion, l'attaquant modifie souvent des fichiers : script ajouté en bas des pages, porte dérobée dans un dossier, page d'hameçonnage cachée, redirection vers un site de spam visible seulement depuis les moteurs de recherche.

Plusieurs méthodes, du plus simple au plus complet :

1. **Surveiller le contenu** des pages clés (accueil, connexion, paiement) et être alerté si une ressource inconnue apparaît, notamment un nouveau script externe.
2. **Contrôler l'intégrité des fichiers** : comparer régulièrement les fichiers du serveur à une référence (le dépôt Git, ou les empreintes d'origine). WordPress, par exemple, permet de vérifier les fichiers du cœur avec la commande `wp core verify-checksums` de WP-CLI.
3. **Exploiter les rapports CSP** : avec une [Content-Security-Policy](/blog/content-security-policy) et la directive `report-to`, le navigateur de vos visiteurs vous signale toute tentative de chargement d'un script non autorisé.

> [!exemple] La boutique en ligne d'un artisan reçoit des rapports CSP inhabituels un samedi : un script tente de se charger depuis un domaine inconnu, uniquement sur la page de paiement. La CSP le bloque, mais l'alerte révèle qu'une extension compromise a injecté un écumeur de cartes bancaires (*skimmer*). L'extension est supprimée et les accès changés le jour même. Sans ces rapports, l'injection aurait pu passer inaperçue jusqu'aux premières plaintes de clients pour fraude.

## Journaliser l'essentiel

L'OWASP classe l'absence de journalisation et de surveillance parmi les dix grands risques (A09, voir [l'OWASP Top 10](/blog/owasp-top-10-explique)). Sans journaux, impossible de savoir ce qui s'est passé, depuis quand, ni quelles données ont été touchées.

Journalisez au minimum :

- les connexions réussies et échouées, en particulier sur l'administration ;
- les changements sensibles : création de compte administrateur, modification de mot de passe ou d'adresse e-mail, changement de droits ;
- les erreurs serveur et les refus d'accès répétés ;
- les journaux d'accès du serveur web.

Conservez-les **hors du serveur** surveillé, car un attaquant efface volontiers ses traces, et fixez une durée de conservation. Les journaux contiennent des données personnelles (adresses IP, identifiants) : ne collectez que le nécessaire, protégez leur accès et respectez les recommandations de la [CNIL](https://www.cnil.fr/) sur les durées de conservation. N'y écrivez jamais de mots de passe ni de jetons (voir [les secrets dans le code](/blog/secrets-dans-le-code)).

> [!attention] Trop d'alertes tue l'alerte. Si votre téléphone sonne pour chaque tentative de connexion échouée, vous finirez par tout ignorer. Réservez les alertes immédiates aux événements anormaux (pic soudain d'échecs, nouvel administrateur, fichier modifié), et consultez le reste dans un récapitulatif.

## Scanner régulièrement

Un scan de sécurité passif, relancé régulièrement, détecte les dérives de configuration : en-tête disparu après une migration, cookie qui a perdu son attribut `Secure`, nouveau sous-domaine exposé, version vulnérable d'une bibliothèque. Comparez chaque résultat au précédent : une régression est souvent plus parlante qu'une note isolée (voir [lire un rapport de scan](/blog/lire-un-rapport-de-scan)). Un scan passif hebdomadaire ou mensuel convient à la plupart des sites ; Sentinel en propose un [gratuitement](/dashboard/scan) si vous n'avez pas encore d'outil.

Complétez avec les alertes de vos dépendances (voir [les composants vulnérables](/blog/dependances-et-composants-vulnerables)) et, pour les applications sensibles, un test d'intrusion régulier, mené avec une autorisation écrite.

Une routine simple suffit souvent :

1. **Chaque semaine** : relire le récapitulatif des alertes et appliquer les mises à jour (voir [le cours sur les mises à jour](/blog/mises-a-jour)).
2. **Chaque mois** : scan de sécurité, revue des extensions et des comptes administrateurs.
3. **Chaque année** : inventaire des sous-domaines, test de restauration des sauvegardes, revue des accès des prestataires.

## Quand une alerte se déclenche

Préparez la réponse avant d'en avoir besoin : qui est prévenu, qui a les accès à l'hébergement, au domaine et aux sauvegardes, et comment joindre l'hébergeur. En cas d'intrusion probable :

1. **Préservez les traces** : copiez les journaux et les fichiers suspects avant de tout effacer.
2. **Contenez** : mode maintenance, changement des mots de passe et des clés, suppression du composant compromis.
3. **Restaurez** à partir d'une sauvegarde saine, puis corrigez la cause avant de remettre en ligne.
4. **Déclarez si nécessaire** : une violation de données personnelles doit être notifiée à la CNIL dans les 72 heures lorsqu'elle présente un risque pour les personnes. Le site [cybermalveillance.gouv.fr](https://www.cybermalveillance.gouv.fr/) aide à trouver un prestataire et à porter plainte.

## À retenir

- Surveillez d'abord la disponibilité, le certificat, le domaine et la réputation de votre site.
- Détectez les modifications non autorisées : contenu des pages clés, intégrité des fichiers, rapports CSP.
- Journalisez les événements de sécurité, hors du serveur, sans données inutiles.
- Limitez les alertes immédiates aux événements anormaux, et envoyez-les à un canal partagé.
- Scannez régulièrement, comparez les résultats et préparez la réponse aux incidents à l'avance.

## Quiz

?? Pourquoi envoyer les alertes vers un canal partagé plutôt qu'à une seule personne ?
- [ ] Pour réduire le nombre d'alertes
- [x] Pour qu'une alerte ne soit pas ignorée en cas d'absence ou de départ
- [ ] Parce que les outils l'exigent
=> Une alerte reçue par une personne en congés ou partie de l'entreprise équivaut à une absence d'alerte.

?? Pourquoi conserver les journaux hors du serveur surveillé ?
- [ ] Pour économiser de l'espace disque
- [ ] Pour les rendre publics
- [x] Parce qu'un attaquant qui contrôle le serveur peut effacer ses traces
=> Des journaux stockés ailleurs restent exploitables même si le serveur est compromis.

?? Un certificat a été émis pour votre domaine sans que vous l'ayez demandé. Où pouvez-vous le voir ?
- [x] Dans les journaux publics Certificate Transparency
- [ ] Dans les en-têtes HTTP de votre site
- [ ] Dans le fichier robots.txt
=> Les certificats publics sont inscrits dans ces journaux, que l'on peut surveiller pour son domaine.

?? Une intrusion semble avoir eu lieu. Quelle est la première chose à faire ?
- [ ] Supprimer immédiatement tous les fichiers du serveur
- [x] Préserver les journaux et fichiers suspects, puis contenir l'incident
- [ ] Attendre de voir si cela se reproduit
=> Sans traces, impossible de comprendre ce qui s'est passé ni de corriger la cause ; la remise en état vient ensuite.
