---
title: Rançongiciel : se préparer avant qu'il ne frappe
description: Comment un rançongiciel entre dans une entreprise, les protections qui comptent vraiment, et la préparation qui permet de redémarrer sans payer de rançon.
track: entreprise
level: intermediaire
order: 6
minutes: 7
updated: 2026-11-22
tags: rançongiciel, ransomware, sauvegardes, plan de crise, prévention
---
Un lundi matin, plus aucun fichier ne s'ouvre. Les noms ont changé, une note s'affiche sur chaque écran : vos données sont chiffrées, payez pour les récupérer. C'est une attaque par rançongiciel, l'une des plus destructrices pour une petite structure, car elle peut arrêter toute l'activité du jour au lendemain. Personne ne peut garantir qu'elle n'arrivera jamais. En revanche, une entreprise préparée redémarre en quelques jours au lieu de quelques semaines, et sans dépendre du bon vouloir des criminels.

## Ce que vous allez apprendre

- Comment fonctionne une attaque par rançongiciel aujourd'hui.
- Par où les attaquants entrent le plus souvent.
- Les protections qui réduisent fortement le risque.
- Comment préparer des sauvegardes qui survivent à l'attaque.
- Pourquoi il est déconseillé de payer, et ce qu'il faut savoir côté assurance.

## Comment se déroule une attaque

> [!definition] Rançongiciel (ransomware) : logiciel malveillant qui chiffre les données d'une victime pour les rendre illisibles, puis exige une rançon, généralement en cryptomonnaie, en échange de la clé de déchiffrement.

Les attaques actuelles se déroulent souvent en plusieurs temps. L'attaquant obtient d'abord un accès, puis explore discrètement le réseau, parfois pendant plusieurs jours, cherche les comptes administrateurs et les sauvegardes, copie des données, et enfin déclenche le chiffrement, souvent la nuit ou le week-end. Beaucoup de groupes pratiquent la **double extorsion** : même si vous restaurez vos sauvegardes, ils menacent de publier les données volées.

Cela a deux conséquences pratiques : vos sauvegardes sont une cible prioritaire, et une attaque par rançongiciel est presque toujours aussi une **violation de données personnelles** au sens du RGPD (voir [le cours RGPD](/blog/rgpd-essentiel-securite)).

## Les portes d'entrée les plus fréquentes

- **L'hameçonnage** : une pièce jointe ou un lien piégé, ou des identifiants volés sur une fausse page.
- **Les accès à distance mal protégés** : bureau à distance exposé sur Internet, VPN sans double authentification, mots de passe faibles ou réutilisés.
- **Les failles non corrigées** sur des équipements exposés : pare-feu, VPN, serveurs de messagerie, logiciels de partage de fichiers.
- **Un prestataire compromis** qui dispose d'un accès à votre réseau.

## Les protections qui comptent vraiment

1. **Double authentification sur tous les accès distants** et sur la messagerie. C'est l'une des mesures les plus efficaces. Voir [le cours dédié](/blog/double-authentification).
2. **Mises à jour rapides** des équipements exposés sur Internet, en priorité absolue.
3. **Pas de bureau à distance ouvert directement sur Internet** : passez par un VPN protégé par double authentification, ou par une solution d'accès dédiée.
4. **Comptes administrateurs séparés et rares**, pour freiner la progression de l'attaquant. Voir [les comptes et droits d'accès](/blog/gestion-des-acces-et-comptes).
5. **Une protection des postes à jour**, et si possible une solution de détection et de réponse (EDR) supervisée, qui repère les comportements suspects.
6. **Des équipes sensibilisées** qui signalent vite. Voir [sensibiliser ses équipes](/blog/sensibiliser-ses-equipes).

## Des sauvegardes qui survivent à l'attaque

C'est la mesure qui fait la différence entre un incident grave et une catastrophe. Une sauvegarde utile face à un rançongiciel est :

- **déconnectée ou non modifiable** : disque débranché et rangé, ou stockage en ligne avec immuabilité (impossible à effacer pendant une durée définie) ;
- **protégée par des identifiants distincts** de ceux du réseau, que l'attaquant ne trouvera pas sur un poste compromis ;
- **conservée sur plusieurs versions**, pour revenir à un état antérieur à l'infection ;
- **testée** : une restauration réelle, chronométrée, au moins quelques fois par an.

Voir [la règle 3-2-1](/blog/sauvegardes-3-2-1) et [sauvegardes et continuité d'activité](/blog/plan-de-continuite-sauvegardes-entreprise).

> [!exemple] Une entreprise de négoce de 25 salariés subit un rançongiciel un samedi. Ses serveurs et sa sauvegarde réseau sont chiffrés, mais elle dispose d'une copie hebdomadaire sur un service de stockage immuable, avec des identifiants connus de deux personnes seulement. Après l'intervention d'un prestataire pour nettoyer et reconstruire le réseau, les données sont restaurées à J-3. Trois jours de saisie sont perdus, mais l'activité reprend en moins d'une semaine, sans payer de rançon.

## Préparer la crise à l'avance

Le jour de l'attaque, plus rien ne fonctionne : ni la messagerie, ni parfois le téléphone. Préparez donc, sur papier ou sur un support hors du réseau :

- la liste des contacts utiles : dirigeant, référent informatique, prestataire, assureur, banque, avocat ;
- la conduite à tenir dans les premières heures (voir [gérer un incident](/blog/gerer-un-incident-de-securite)) ;
- la liste des activités prioritaires à redémarrer en premier, et les procédures en mode dégradé (facturation sur papier, prise de commandes par téléphone).

Les dispositifs publics vous aident aussi : [cybermalveillance.gouv.fr](https://www.cybermalveillance.gouv.fr/) oriente les victimes vers des prestataires, et l'ANSSI publie avec le ministère de la Justice un guide sur les attaques par rançongiciel, disponible sur [cyber.gouv.fr](https://cyber.gouv.fr/).

## Payer la rançon ?

Les autorités françaises recommandent de **ne pas payer** : rien ne garantit que la clé fonctionnera, ni que les données volées ne seront pas publiées, et le paiement finance de nouvelles attaques et peut faire de vous une cible répétée.

> [!attention] Si vous avez une assurance cyber, lisez dès aujourd'hui ses conditions. Depuis la loi du 24 janvier 2023 (article L. 12-10-1 du Code des assurances), l'indemnisation par un assureur des pertes liées à une cyberattaque subie par un professionnel est subordonnée au dépôt d'une plainte au plus tard 72 heures après la connaissance de l'attaque. Faites-vous confirmer les modalités par votre assureur ou votre conseil.

## À retenir

- Un rançongiciel chiffre les données et, souvent, les vole aussi : c'est en général une violation de données.
- Les entrées les plus fréquentes : hameçonnage, accès distants mal protégés, failles non corrigées.
- Double authentification, mises à jour rapides et comptes administrateurs séparés réduisent fortement le risque.
- Au moins une sauvegarde déconnectée ou immuable, testée régulièrement, permet de redémarrer.
- Préparez contacts et procédures hors réseau, et ne comptez pas sur le paiement de la rançon.

## Quiz

?? Quelle sauvegarde a le plus de chances de survivre à un rançongiciel ?
- [ ] Un dossier copié chaque soir sur le même serveur
- [ ] Un disque externe branché en permanence au réseau
- [x] Une copie immuable ou débranchée, avec des identifiants distincts
=> L'attaquant cherche et chiffre tout ce qui est accessible depuis le réseau ; une copie isolée lui échappe.

?? Qu'est-ce que la double extorsion ?
- [ ] Demander deux rançons au même moment
- [x] Chiffrer les données et menacer de publier celles qui ont été volées
- [ ] Attaquer deux entreprises en même temps
=> Même avec de bonnes sauvegardes, la menace de publication reste : d'où l'importance de prévenir l'intrusion.

?? Quelle mesure ferme l'une des portes d'entrée les plus utilisées ?
- [x] Activer la double authentification sur le VPN et la messagerie
- [ ] Changer le fond d'écran des ordinateurs
- [ ] Acheter des ordinateurs plus puissants
=> Les accès distants et la messagerie protégés par un simple mot de passe sont des cibles privilégiées.

?? Pourquoi préparer une liste de contacts sur papier ?
- [ ] Parce que c'est obligatoire pour toutes les entreprises
- [x] Parce que la messagerie et les fichiers peuvent être inaccessibles pendant l'attaque
- [ ] Parce que le papier est plus joli
=> Le jour de la crise, les outils habituels peuvent être chiffrés ou hors service.
