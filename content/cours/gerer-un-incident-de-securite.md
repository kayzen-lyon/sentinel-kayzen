---
title: Gérer un incident de sécurité : les premières heures
description: Isoler sans éteindre, tenir un journal, conserver les preuves, porter plainte, notifier la CNIL : les bons gestes face à une cyberattaque.
track: entreprise
level: intermediaire
order: 10
minutes: 7
updated: 2026-11-22
tags: incident, réponse à incident, plainte, CNIL, 17Cyber, gestion de crise
---
Un écran affiche une demande de rançon, un client signale des e-mails frauduleux envoyés depuis votre adresse, la banque appelle au sujet d'un virement inhabituel. Dans ces moments, la tentation est forte de tout éteindre, de tout effacer ou d'attendre que ça passe. Les premières heures sont pourtant décisives : elles déterminent l'étendue des dégâts, la possibilité de comprendre ce qui s'est passé et le respect de vos obligations légales. Ce cours décrit les gestes de base. Il ne remplace pas l'intervention d'un professionnel, qu'il faut solliciter rapidement dès que l'incident dépasse vos compétences.

## Ce que vous allez apprendre

- Les gestes immédiats pour limiter la propagation sans détruire les preuves.
- Pourquoi tenir un journal de bord dès la première minute.
- Qui prévenir, et dans quel ordre.
- Les démarches officielles : plainte, CNIL, assurance, et le cas NIS 2.
- Comment préparer tout cela à l'avance.

## Les gestes immédiats

1. **Isoler les machines touchées du réseau** : débrancher le câble réseau, couper le Wi-Fi de l'appareil. L'objectif est d'empêcher la propagation et la communication avec l'attaquant.
2. **Ne pas éteindre les machines, sauf avis contraire d'un spécialiste** : la mémoire de l'ordinateur contient des traces utiles à l'enquête, qui disparaissent à l'extinction.
3. **Ne rien supprimer, ne rien réinstaller** dans l'immédiat : ni e-mails frauduleux, ni fichiers suspects, ni journaux. Une remise à zéro précipitée efface les preuves et ne garantit pas que l'attaquant est parti.
4. **Ne pas payer de rançon ni répondre à l'attaquant.**
5. **Protéger les comptes** depuis un appareil sain : changer les mots de passe des comptes potentiellement compromis, à commencer par la messagerie et les comptes administrateurs, et fermer les sessions ouvertes.

> [!attention] Si la messagerie de l'entreprise est compromise, ne l'utilisez pas pour coordonner la réponse : l'attaquant pourrait lire vos échanges. Passez par le téléphone ou un canal de secours prévu à l'avance.

## Tenir un journal de bord

Dès la découverte, une personne note, à la main ou sur un appareil sain, **tout ce qui se passe, avec l'heure** : ce qui a été observé, par qui, les actions menées, les personnes contactées, les décisions prises. Ce journal sert à l'enquête technique, au dépôt de plainte, à l'assureur et, le cas échéant, à la notification à la CNIL. Il fixe aussi l'heure à laquelle vous avez pris connaissance de l'incident, point de départ de plusieurs délais.

Conservez les éléments de preuve : captures d'écran, message de rançon, e-mails frauduleux avec leurs en-têtes, numéros de téléphone, relevés bancaires.

## Qui prévenir

- **La direction et le référent sécurité**, pour décider et coordonner.
- **Votre prestataire informatique** ou, à défaut, un professionnel de la réponse à incident. [Cybermalveillance.gouv.fr](https://www.cybermalveillance.gouv.fr/) propose un diagnostic en ligne et oriente vers des prestataires de proximité, dont certains sont labellisés ExpertCyber. Pour les incidents graves, l'ANSSI qualifie des prestataires de réponse aux incidents de sécurité (PRIS).
- **Le centre de réponse aux incidents cyber de votre région**, s'il en existe un : ces CSIRT régionaux accompagnent notamment les PME, collectivités et associations.
- **Votre banque**, immédiatement, en cas de fraude au virement (voir [le cours sur la fraude au président](/blog/fraude-au-president-et-faux-rib)).
- **Votre assureur**, si vous disposez d'une garantie cyber : beaucoup de contrats prévoient une assistance et un délai de déclaration.

> [!astuce] Le dispositif [17Cyber](https://17cyber.gouv.fr/), porté par cybermalveillance.gouv.fr avec les forces de l'ordre, permet aux victimes d'obtenir un diagnostic, des conseils et, si nécessaire, d'échanger avec un policier ou un gendarme. En cas d'urgence vitale ou d'infraction en cours nécessitant une intervention, composez le 17.

## Les démarches officielles

**Porter plainte.** Déposez plainte auprès de la police ou de la gendarmerie, avec votre journal et les preuves. Pour certaines démarches, une pré-plainte en ligne permet de préparer le dépôt avant un rendez-vous, et certaines escroqueries sur Internet peuvent faire l'objet d'une plainte en ligne via les services publics ; renseignez-vous sur [service-public.fr](https://www.service-public.fr/). La plainte est aussi importante pour l'assurance : depuis la loi du 24 janvier 2023, l'indemnisation d'un professionnel par son assureur au titre d'une cyberattaque est subordonnée au dépôt d'une plainte au plus tard 72 heures après la connaissance de l'atteinte (article L. 12-10-1 du Code des assurances).

**Notifier la CNIL.** Si des données personnelles sont concernées (fichiers clients, données des salariés, messagerie lue par l'attaquant), l'article 33 du RGPD impose de notifier la violation à la CNIL dans les meilleurs délais et, si possible, sous 72 heures après en avoir pris connaissance, sauf si elle n'est pas susceptible d'engendrer un risque pour les personnes. Les personnes concernées doivent être informées en cas de risque élevé. Voir [le cours RGPD](/blog/rgpd-essentiel-securite).

**NIS 2, si vous êtes concerné.** Les entités soumises à la directive NIS 2 doivent signaler les incidents importants à l'autorité nationale selon des délais propres (alerte précoce sous 24 heures dans la directive). Voir [NIS 2 : votre entreprise est-elle concernée ?](/blog/nis2-qui-est-concerne).

> [!exemple] Le mardi à 9 h, la comptable d'une PME de 40 salariés constate que les fichiers du serveur sont renommés et illisibles. Elle débranche son poste du réseau et prévient le dirigeant, qui ouvre un journal sur papier. Le prestataire, appelé à 9 h 20, fait isoler le serveur sans l'éteindre et constate que des fichiers clients ont été copiés. À 11 h, le dirigeant consulte 17Cyber et appelle l'assureur ; la plainte est déposée le lendemain. Le surlendemain, la PME notifie la CNIL avec les informations disponibles, en précisant qu'elles seront complétées. Le redémarrage se fait à partir d'une sauvegarde hors ligne après nettoyage complet.

## Après l'urgence

Ne reconnectez rien avant d'avoir compris par où l'attaquant est entré et corrigé la faille : sinon, il reviendra. Restaurez à partir de sauvegardes saines, changez tous les mots de passe, vérifiez les comptes créés récemment et les règles de transfert de messagerie. Communiquez de façon factuelle avec les clients et partenaires concernés. Enfin, faites un retour d'expérience : ce qui a bien fonctionné, ce qui a manqué, et mettez à jour vos procédures.

Pour les particuliers et les cas plus simples, voir aussi [que faire si l'on est piraté](/blog/que-faire-si-pirate).

## Préparer avant l'incident

- Une fiche réflexe d'une page, imprimée et affichée : isoler, ne pas éteindre, prévenir, noter.
- La liste des contacts utiles sur papier : prestataire, assureur, banque, 17Cyber, conseil juridique.
- Des sauvegardes hors ligne testées (voir [sauvegardes et continuité](/blog/plan-de-continuite-sauvegardes-entreprise)).
- Un exercice annuel pour vérifier que chacun connaît son rôle.

## À retenir

- Isolez du réseau, mais n'éteignez pas et ne supprimez rien sans avis d'un spécialiste.
- Tenez un journal horodaté dès la première minute et conservez toutes les preuves.
- Prévenez rapidement direction, prestataire, banque si besoin et assureur ; 17Cyber vous oriente.
- Plainte dans les 72 heures pour préserver l'indemnisation par l'assurance, notification CNIL si des données personnelles sont touchées.
- Ne reconnectez qu'après avoir compris et corrigé l'origine de l'attaque.

## Quiz

?? Un poste affiche une demande de rançon. Quel est le premier geste ?
- [ ] Éteindre tous les ordinateurs et les réinstaller
- [x] Déconnecter le poste du réseau sans l'éteindre
- [ ] Payer rapidement pour limiter les dégâts
=> L'isolement limite la propagation, et laisser la machine allumée préserve des traces utiles à l'enquête.

?? Pourquoi tenir un journal de bord horodaté ?
- [ ] Pour désigner un coupable
- [x] Pour l'enquête, la plainte, l'assureur et les notifications obligatoires
- [ ] Parce que c'est demandé par l'éditeur de l'antivirus
=> Le journal reconstitue les faits et fixe l'heure de découverte, point de départ de plusieurs délais.

?? Des fichiers clients ont été copiés par l'attaquant. Quelle démarche s'impose en plus de la plainte ?
- [ ] Aucune, ce n'est l'affaire que de la police
- [ ] Prévenir uniquement les clients les plus importants
- [x] Notifier la CNIL dans les meilleurs délais, si possible sous 72 heures
=> Il s'agit d'une violation de données personnelles au sens du RGPD, qui doit être notifiée sauf absence de risque.

?? Quel est le délai de dépôt de plainte qui conditionne l'indemnisation par l'assureur d'un professionnel victime de cyberattaque ?
- [ ] Un mois
- [x] 72 heures après la connaissance de l'atteinte
- [ ] Aucun délai n'est prévu
=> L'article L. 12-10-1 du Code des assurances subordonne l'indemnisation à une plainte déposée dans ce délai.
