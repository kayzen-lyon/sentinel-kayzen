---
title: Empêcher l'usurpation de votre domaine e-mail (SPF, DKIM, DMARC)
description: SPF, DKIM et DMARC expliqués simplement : comment empêcher des escrocs d'envoyer des e-mails à votre nom et améliorer la délivrabilité de vos propres messages.
track: entreprise
level: intermediaire
order: 8
minutes: 7
updated: 2026-11-22
tags: e-mail, SPF, DKIM, DMARC, usurpation, nom de domaine
---
Le protocole qui achemine les e-mails est ancien et n'a pas été conçu pour vérifier l'expéditeur. N'importe qui peut donc envoyer un message en affichant `compta@votre-entreprise.fr` comme expéditeur, sans jamais avoir accédé à votre messagerie. Vos clients et fournisseurs reçoivent alors de fausses factures ou de faux RIB qui semblent venir de chez vous. Trois réglages publiés dans le DNS de votre nom de domaine, appelés SPF, DKIM et DMARC, permettent aux messageries des destinataires de repérer et de rejeter ces faux messages. Ils améliorent aussi la délivrabilité de vos vrais e-mails.

## Ce que vous allez apprendre

- Pourquoi n'importe qui peut envoyer un e-mail à votre nom sans protection.
- Le rôle de SPF, DKIM et DMARC, et comment ils se complètent.
- À quoi ressemblent ces enregistrements, avec des exemples.
- Comment déployer DMARC progressivement sans bloquer vos propres envois.
- Ce qu'il faut faire pour un domaine qui n'envoie jamais d'e-mails.

## Le point de départ : le DNS

Ces trois protections sont des **enregistrements texte (TXT)** que vous ajoutez dans la zone DNS de votre nom de domaine, chez votre registraire ou votre hébergeur. Si vous ne savez pas ce qu'est le DNS, commencez par [le cours sur le nom de domaine et le DNS](/blog/nom-de-domaine-et-dns).

> [!definition] Usurpation de domaine (spoofing) : envoi d'e-mails qui affichent frauduleusement une adresse de votre domaine comme expéditeur. Elle ne nécessite aucun piratage de votre messagerie.

Avant de commencer, faites la liste de **tous les services qui envoient des e-mails en votre nom** : votre messagerie (suite bureautique en ligne ou hébergeur), votre logiciel de facturation, votre outil d'e-mailing, votre site web (formulaires, boutique), votre CRM. Un service oublié verra ses messages rejetés une fois DMARC en mode strict.

## SPF : la liste des serveurs autorisés

**SPF** (Sender Policy Framework) publie la liste des serveurs autorisés à envoyer des e-mails pour votre domaine. La messagerie du destinataire vérifie que le serveur expéditeur figure bien dans cette liste.

```text
exemple.fr.  TXT  "v=spf1 include:_spf.fournisseur-messagerie.example include:envoi.outil-facturation.example -all"
```

- `include:` autorise les serveurs d'un fournisseur ; chaque fournisseur indique la valeur à utiliser dans sa documentation.
- `-all` signifie que tout autre serveur n'est pas autorisé. `~all` est une version plus souple, souvent utilisée pendant la mise en place.

> [!attention] Un domaine ne doit avoir **qu'un seul** enregistrement SPF. Si vous en ajoutez un second pour un nouvel outil, les deux deviennent invalides : fusionnez les `include:` dans le même enregistrement. Le nombre de recherches DNS qu'un SPF peut déclencher est aussi limité (dix au maximum) ; au-delà, il est considéré comme en erreur.

## DKIM : la signature des messages

**DKIM** (DomainKeys Identified Mail) ajoute une signature cryptographique à chaque e-mail envoyé. La clé publique est publiée dans votre DNS ; la messagerie du destinataire s'en sert pour vérifier que le message vient bien d'un serveur autorisé et n'a pas été modifié en route.

En pratique, vous n'avez rien à calculer : votre fournisseur de messagerie (et chaque outil d'envoi) génère la clé et vous indique l'enregistrement à créer, sous un nom du type `selecteur._domainkey.exemple.fr`. Il suffit de le copier dans votre DNS, puis d'activer la signature dans l'interface du fournisseur.

## DMARC : la règle du jeu et les rapports

**DMARC** relie les deux mécanismes précédents à l'adresse visible par le destinataire, et indique quoi faire des messages qui échouent aux contrôles. Il permet aussi de recevoir des **rapports** sur les e-mails envoyés au nom de votre domaine.

```text
_dmarc.exemple.fr.  TXT  "v=DMARC1; p=none; rua=mailto:dmarc@exemple.fr"
```

La politique `p=` prend trois valeurs :

- `none` : on observe seulement, sans rien bloquer ;
- `quarantine` : les messages non conformes sont placés en courrier indésirable ;
- `reject` : les messages non conformes sont refusés.

### Un déploiement en trois étapes

1. **Observer** avec `p=none` pendant quelques semaines. Les rapports (adresse `rua`) révèlent quels services envoient en votre nom et lesquels échouent aux contrôles. Ces rapports sont des fichiers techniques : un outil d'analyse de rapports DMARC, il en existe des gratuits, les rend lisibles.
2. **Corriger** : ajouter les services légitimes oubliés dans SPF et activer DKIM pour chacun.
3. **Durcir** progressivement vers `p=quarantine`, puis `p=reject` quand plus aucun envoi légitime n'échoue.

> [!exemple] Un cabinet d'architectes publie un DMARC en `p=none`. Les premiers rapports montrent des milliers de messages envoyés au nom du cabinet depuis des serveurs inconnus : des escrocs envoient de fausses factures à ses clients. Les rapports révèlent aussi que le logiciel de devis du cabinet n'est pas déclaré dans SPF. Le cabinet corrige ce point, passe en `quarantine` un mois plus tard, puis en `reject`. Les faux messages sont désormais refusés par la plupart des grandes messageries.

Les grands fournisseurs de messagerie ont renforcé leurs exigences : depuis 2024, Gmail et Yahoo imposent notamment SPF, DKIM et DMARC aux expéditeurs qui envoient de gros volumes. Même pour une petite structure, ces réglages évitent que vos messages finissent en courrier indésirable.

## Les domaines qui n'envoient pas d'e-mails

Vous possédez peut-être des domaines secondaires (ancienne marque, variante en `.com`) qui n'envoient jamais de messages. Les escrocs les apprécient, car ils sont rarement protégés. Déclarez explicitement qu'aucun serveur n'est autorisé :

```text
exemple-ancien.fr.         TXT  "v=spf1 -all"
_dmarc.exemple-ancien.fr.  TXT  "v=DMARC1; p=reject"
```

## Limites à connaître

SPF, DKIM et DMARC protègent **votre domaine exact**. Ils n'empêchent pas un escroc d'acheter un domaine ressemblant (`exemp1e.fr`, `exemple-factures.fr`), ni de pirater une vraie boîte de votre domaine. Ils complètent donc la double authentification sur la messagerie et la vigilance face aux faux RIB (voir [le cours sur la fraude au président](/blog/fraude-au-president-et-faux-rib)).

## À retenir

- Sans SPF, DKIM et DMARC, n'importe qui peut envoyer des e-mails affichant votre domaine.
- SPF liste les serveurs autorisés, DKIM signe les messages, DMARC fixe la règle et envoie des rapports.
- Recensez d'abord tous les services qui envoient en votre nom.
- Déployez DMARC progressivement : `none`, puis `quarantine`, puis `reject`.
- Protégez aussi les domaines qui n'envoient jamais d'e-mails.

## Quiz

?? À quoi sert l'enregistrement SPF ?
- [ ] À chiffrer le contenu des e-mails
- [x] À indiquer quels serveurs sont autorisés à envoyer des e-mails pour votre domaine
- [ ] À bloquer les pièces jointes dangereuses
=> SPF publie la liste des expéditeurs autorisés, que la messagerie du destinataire vérifie.

?? Par quelle politique DMARC est-il prudent de commencer ?
- [x] p=none, pour observer les envois avant de bloquer quoi que ce soit
- [ ] p=reject dès le premier jour
- [ ] Aucune, DMARC est inutile pour une petite entreprise
=> Commencer en observation permet de repérer les services légitimes oubliés avant de durcir la règle.

?? Vous ajoutez un outil d'e-mailing. Que faites-vous de votre SPF ?
- [ ] Vous créez un second enregistrement SPF pour cet outil
- [x] Vous ajoutez l'include de l'outil dans l'enregistrement SPF existant
- [ ] Vous supprimez le SPF existant
=> Un domaine ne doit avoir qu'un seul enregistrement SPF ; deux enregistrements le rendent invalide.

?? DMARC en p=reject empêche-t-il un escroc d'utiliser un domaine ressemblant au vôtre ?
- [ ] Oui, il bloque tous les domaines similaires
- [x] Non, il ne protège que votre domaine exact
- [ ] Oui, à condition d'utiliser aussi DKIM
=> Un domaine ressemblant est un domaine différent, avec ses propres réglages : la vigilance reste nécessaire.
