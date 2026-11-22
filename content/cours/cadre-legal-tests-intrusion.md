---
title: Le cadre légal des tests d'intrusion en France
description: Accès frauduleux, autorisation écrite, périmètre, bug bounty : ce que dit le Code pénal et comment tester la sécurité d'un système sans risquer de poursuites.
track: developpeurs
level: avance
order: 1
minutes: 8
updated: 2026-11-22
tags: droit, code pénal, test d'intrusion, bug bounty, autorisation
---
Un test d'intrusion consiste à attaquer volontairement un système pour en trouver les failles avant les vrais attaquants. Techniquement, rien ne distingue la requête d'un auditeur de celle d'un pirate : c'est l'**autorisation** qui fait toute la différence. En France, le Code pénal sanctionne l'accès frauduleux à un système informatique, même sans dégât et même avec de bonnes intentions. Avant d'écrire une seule ligne de script, un développeur ou un futur auditeur doit donc savoir où passe la limite.

## Ce que vous allez apprendre

- Ce que répriment les articles 323-1 à 323-3 du Code pénal.
- Pourquoi « je voulais juste aider » ne protège pas juridiquement.
- Ce que doit contenir une autorisation écrite de test.
- Comment pratiquer légalement : laboratoires, bug bounty, environnements personnels.
- Que faire si vous découvrez une faille par hasard.

## Ce que dit le Code pénal

Les atteintes aux systèmes informatiques sont regroupées dans le chapitre « Des atteintes aux systèmes de traitement automatisé de données » du Code pénal, consultable sur [Légifrance](https://www.legifrance.gouv.fr/).

> [!definition] STAD (système de traitement automatisé de données) : terme juridique qui désigne tout système informatique, d'un site web à un serveur de base de données en passant par un objet connecté.

Trois articles concernent directement les tests de sécurité :

- **Article 323-1** : le fait d'accéder ou de se maintenir frauduleusement dans tout ou partie d'un STAD. Les peines sont aggravées lorsque l'accès entraîne la suppression ou la modification de données, ou une altération du fonctionnement du système.
- **Article 323-2** : le fait d'entraver ou de fausser le fonctionnement d'un STAD. Un scan trop agressif qui fait tomber un service peut relever de cette qualification.
- **Article 323-3** : le fait d'introduire frauduleusement des données dans un STAD, ou d'extraire, de détenir, de reproduire, de transmettre, de supprimer ou de modifier frauduleusement les données qu'il contient.

L'article 323-3-1 vise par ailleurs la détention ou la diffusion, **sans motif légitime**, d'outils conçus pour commettre ces infractions. La recherche et la sécurité informatique sont citées comme motifs légitimes possibles, mais c'est au cas par cas : posséder un outil d'audit n'est pas un problème, l'utiliser contre un système qui ne vous appartient pas en est un.

> [!attention] Le mot « frauduleusement » ne suppose pas une intention de nuire. Les tribunaux considèrent qu'un accès est frauduleux dès lors que la personne savait, ou ne pouvait ignorer, qu'elle n'avait pas le droit d'être là. Une faille facile à exploiter ne vaut pas invitation.

## L'intention ne suffit pas

Beaucoup de développeurs pensent qu'un test « gentil », sans vol de données, est toléré. C'est faux. Tester si un formulaire est vulnérable à une injection SQL, modifier un identifiant dans une URL pour voir le compte d'un autre client ou lancer un scanner contre le site d'un concurrent sont des actes qui peuvent constituer un accès frauduleux.

Le simple fait de **se maintenir** dans le système compte aussi : si vous tombez par hasard sur une page d'administration ouverte, continuer à naviguer, télécharger des fichiers ou faire des captures d'écran des données aggrave la situation.

> [!exemple] Un étudiant remarque que l'application de réservation de sa salle de sport affiche les factures en changeant simplement un numéro dans l'URL. Curieux, il écrit un petit script qui parcourt mille numéros et enregistre les PDF « pour prouver le problème ». Il envoie ensuite un e-mail au gérant. Même de bonne foi, il a accédé à des données de tiers et les a extraites : la salle de sport peut porter plainte au titre des articles 323-1 et 323-3, et elle doit en plus déclarer une violation de données personnelles. Une seule requête, puis un signalement immédiat, aurait suffi.

## L'autorisation écrite : le document qui change tout

Un test d'intrusion professionnel commence toujours par un contrat ou une lettre de mission signée par une personne **habilitée** à autoriser le test (direction, responsable de la sécurité), et pas seulement par un contact technique. Ce document précise au minimum :

1. **Le périmètre** : noms de domaine, adresses IP, applications, environnements (production ou préproduction). Tout ce qui n'est pas listé est interdit.
2. **Les dates et horaires** du test.
3. **Les techniques exclues** : déni de service, ingénierie sociale, tests physiques, etc.
4. **Les adresses IP sources** de l'auditeur, pour que l'équipe de surveillance puisse reconnaître le trafic.
5. **Les contacts d'urgence** des deux côtés, et la conduite à tenir en cas d'incident ou de découverte critique.
6. **Le traitement des données** rencontrées : confidentialité, interdiction de copie, destruction en fin de mission.

> [!astuce] Vérifiez qui possède réellement l'infrastructure. Une application hébergée chez un fournisseur cloud ou derrière un CDN dépend aussi des règles de ce tiers : beaucoup publient une politique de tests d'intrusion qu'il faut respecter. Le client ne peut pas vous autoriser à attaquer ce qui ne lui appartient pas.

Pour les missions à fort enjeu, l'ANSSI qualifie des prestataires d'audit sous le label **PASSI** (prestataires d'audit de la sécurité des systèmes d'information). Les informations sont disponibles sur le site de l'[ANSSI](https://cyber.gouv.fr/). Les données personnelles rencontrées pendant un test restent par ailleurs soumises au RGPD.

## Pratiquer légalement

Vous n'avez pas besoin de cibles réelles pour progresser. Plusieurs options sont entièrement légales :

- **Les laboratoires volontairement vulnérables** : [OWASP Juice Shop](https://owasp.org/www-project-juice-shop/) s'installe sur votre machine et contient des dizaines de défis. La [Web Security Academy de PortSwigger](https://portswigger.net/web-security) propose des cours et des laboratoires en ligne gratuits, conçus pour être attaqués.
- **Vos propres applications** : un projet que vous hébergez vous-même, sur une infrastructure dont vous respectez les conditions d'utilisation.
- **Les programmes de bug bounty** : des entreprises invitent publiquement les chercheurs à tester certains de leurs services, sur des plateformes comme YesWeHack, HackerOne ou Bugcrowd. Le cadre légal est la **politique du programme** : seul le périmètre listé est autorisé, et les règles (pas de déni de service, pas d'accès aux données d'autres utilisateurs, comptes de test fournis) doivent être suivies à la lettre.
- **Les politiques de divulgation** : certains sites publient un fichier `security.txt` ou une page « divulgation responsable » qui indique comment signaler une faille. Lisez bien si elle autorise les tests actifs ou seulement le signalement.

> [!attention] Un programme de bug bounty n'autorise que ce qu'il décrit. Un sous-domaine absent du périmètre, même appartenant à la même entreprise, reste hors limites.

## Si vous découvrez une faille par hasard

Il arrive de tomber sur une vulnérabilité sans la chercher : une page d'erreur bavarde, un fichier exposé, un identifiant visible dans une URL. La bonne attitude :

1. Arrêtez-vous immédiatement : ne poursuivez pas l'exploration et ne téléchargez rien.
2. Notez ce que vous avez observé (date, URL, comportement), sans données de tiers.
3. Contactez le responsable du site par son canal de sécurité s'il existe, sinon par un contact officiel.
4. Si vous ne trouvez pas d'interlocuteur, vous pouvez signaler la vulnérabilité à l'ANSSI : le Code de la défense (article L2321-4) prévoit une protection de l'identité des personnes qui signalent de bonne foi une vulnérabilité à l'agence.

Ce dispositif protège le signalement, pas les tests actifs menés sans autorisation. Il ne transforme pas une exploitation après coup en démarche légitime.

## À retenir

- Les articles 323-1 à 323-3 du Code pénal répriment l'accès ou le maintien frauduleux, l'entrave et la manipulation de données, même sans intention de nuire.
- Aucun test sans autorisation écrite d'une personne habilitée, avec un périmètre, des dates et des règles précis.
- Ce qui n'est pas explicitement dans le périmètre est interdit.
- Pour s'entraîner : laboratoires (Juice Shop, Web Security Academy), vos propres projets, bug bounty dans le périmètre annoncé.
- Une faille découverte par hasard se signale, elle ne s'explore pas.

## Quiz

?? Vous remarquez qu'en changeant un numéro dans une URL, vous voyez la facture d'un autre client. Que faites-vous ?
- [ ] Vous téléchargez quelques factures pour constituer une preuve solide
- [x] Vous arrêtez immédiatement et signalez le problème sans récupérer de données
- [ ] Vous publiez la faille sur un réseau social pour forcer l'entreprise à réagir
=> Récupérer des données de tiers constitue une extraction frauduleuse ; un signalement factuel, sans exploration supplémentaire, est la seule démarche défendable.

?? Quel article du Code pénal vise l'accès ou le maintien frauduleux dans un système informatique ?
- [x] L'article 323-1
- [ ] L'article 323-2
- [ ] L'article 226-1
=> L'article 323-1 réprime l'accès et le maintien frauduleux ; le 323-2 vise l'entrave au fonctionnement.

?? Un client vous autorise à tester son application hébergée chez un fournisseur cloud. Que devez-vous vérifier en plus ?
- [ ] Rien, l'accord du client suffit pour toute l'infrastructure
- [ ] Que le fournisseur cloud a signé le contrat avec vous
- [x] Que la politique de tests du fournisseur est respectée et que le périmètre ne couvre que les ressources du client
=> Le client ne peut autoriser que ce qui lui appartient ; l'infrastructure partagée du fournisseur obéit à ses propres règles.

?? Dans un programme de bug bounty, un sous-domaine de l'entreprise n'apparaît pas dans le périmètre. Pouvez-vous le tester ?
- [ ] Oui, puisqu'il appartient à la même entreprise
- [x] Non, seul le périmètre explicitement listé est autorisé
- [ ] Oui, à condition de ne pas dépasser une heure de test
=> La politique du programme est votre autorisation : tout ce qui n'y figure pas reste interdit.
