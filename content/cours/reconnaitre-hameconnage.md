---
title: Reconnaître un e-mail d'hameçonnage (phishing)
description: Expéditeur, lien, ton pressant, pièce jointe : les signes qui trahissent un faux e-mail, et la conduite à tenir si vous avez déjà cliqué.
track: fondamentaux
level: debutant
order: 4
minutes: 7
updated: 2026-11-22
tags: hameçonnage, phishing, e-mail, arnaque, liens
---
Un e-mail aux couleurs de votre banque vous annonce un problème urgent sur votre compte. Un autre, signé d'un transporteur, vous réclame quelques euros pour livrer un colis. Un troisième vous informe d'un remboursement d'impôts. Tous ont un point commun : ce sont peut-être des pièges. L'hameçonnage est l'une des escroqueries les plus répandues, et les faux messages sont de plus en plus soignés. Heureusement, quelques vérifications simples permettent de les démasquer dans la grande majorité des cas.

## Ce que vous allez apprendre

- Ce qu'est l'hameçonnage et ce que cherchent ses auteurs.
- Les signes qui doivent vous alerter dans un e-mail.
- Comment vérifier un lien sans cliquer dessus.
- La bonne méthode pour vérifier un message douteux.
- Que faire si vous avez cliqué ou saisi vos informations.

## Qu'est-ce que l'hameçonnage ?

> [!definition] Hameçonnage (*phishing*) : technique d'escroquerie qui consiste à se faire passer pour un organisme de confiance (banque, administration, fournisseur d'énergie, transporteur…) afin de pousser la victime à donner ses identifiants, ses coordonnées bancaires ou à installer un logiciel malveillant.

Le message vous conduit en général vers un **faux site**, copie conforme du vrai, où l'on vous demande de vous connecter ou de payer. Tout ce que vous y tapez part directement chez l'escroc. D'autres variantes vous incitent à ouvrir une pièce jointe piégée ou à rappeler un faux numéro.

Les sujets reviennent souvent : colis en attente, compte bloqué, remboursement, amende impayée, carte Vitale à renouveler, abonnement expiré, gain à un jeu. Les escrocs suivent aussi l'actualité (période des impôts, soldes, événements sportifs).

## Les signes qui doivent vous alerter

Un seul signe ne prouve rien, mais plusieurs ensemble doivent vous mettre en alerte.

### L'urgence et la menace

« Votre compte sera suspendu sous 24 heures », « Dernier avis avant poursuites ». L'objectif est de vous faire agir vite, sans réfléchir. Les vrais organismes laissent des délais raisonnables et ne menacent pas par e-mail.

### Une demande inhabituelle

Votre banque ne vous demandera jamais votre mot de passe, votre code de carte ou un code reçu par SMS. Un service public ne vous fera pas payer une amende via un lien dans un e-mail non sollicité.

### L'adresse de l'expéditeur

Le nom affiché peut être « Service client Banque » alors que l'adresse réelle est `service-client@banque-securite-verif.com`. Cliquez ou appuyez sur le nom de l'expéditeur pour voir l'adresse complète. Attention : une adresse qui semble correcte ne suffit pas à prouver l'authenticité, car elle peut être falsifiée.

### Le lien

C'est le point le plus important. Le texte d'un lien peut afficher une adresse et vous envoyer ailleurs. Sur ordinateur, **survolez le lien avec la souris sans cliquer** : la vraie adresse s'affiche en bas de la fenêtre. Sur téléphone, un appui long permet souvent de la voir.

Regardez le **nom de domaine**, c'est-à-dire la partie juste avant le premier `/` qui suit `https://` :

```text
https://www.impots.gouv.fr/                        → domaine officiel : impots.gouv.fr
https://impots.gouv.fr.remboursement-dgfip.com/    → faux : le vrai domaine est remboursement-dgfip.com
```

> [!astuce] Lisez le domaine de droite à gauche à partir du premier `/` : ce qui compte, ce sont les derniers éléments (`gouv.fr`, `remboursement-dgfip.com`). Tout ce qui précède peut être choisi librement par l'escroc.

### La pièce jointe inattendue

Une facture que vous n'attendiez pas, un fichier compressé, un document qui vous demande « d'activer le contenu » ou « d'activer les macros » : ne l'ouvrez pas. Les pièces jointes piégées sont un moyen courant d'installer un logiciel malveillant.

### Les détails qui clochent

Fautes d'orthographe, formule impersonnelle (« Cher client »), logo flou, mise en page étrange. Méfiance cependant : les escrocs utilisent de plus en plus des outils de rédaction automatique, et beaucoup de faux messages sont aujourd'hui sans faute. **L'absence de fautes ne prouve pas qu'un message est authentique.**

> [!exemple] Un artisan reçoit un e-mail aux couleurs de son fournisseur d'électricité : « Échec du prélèvement, régularisez sous 48 heures pour éviter la coupure. » Le message est propre, sans faute, avec le bon logo. En survolant le bouton « Régulariser », il voit une adresse sans rapport avec son fournisseur. Il se connecte alors à son espace client en tapant lui-même l'adresse habituelle : aucun impayé. L'e-mail était un faux.

## La bonne méthode : vérifier par un autre chemin

Face à un message douteux, ne cherchez pas à savoir s'il est vrai **à partir du message lui-même**. Prenez un autre chemin :

1. Ne cliquez sur aucun lien et n'ouvrez aucune pièce jointe.
2. Ouvrez vous-même le site officiel (en tapant l'adresse ou via vos favoris) ou l'application habituelle.
3. Vérifiez si une alerte vous y attend. Si rien n'apparaît, c'est très probablement une arnaque.
4. En cas de doute persistant, appelez l'organisme au numéro indiqué sur vos documents habituels (contrat, carte bancaire, facture), jamais à celui du message.

Un gestionnaire de mots de passe vous aide aussi : il ne propose de remplir vos identifiants que sur le vrai site. S'il reste muet, posez-vous des questions (voir [Créer des mots de passe solides](/blog/mots-de-passe-solides)).

## Signaler et réagir

Vous pouvez signaler un e-mail frauduleux sur [Signal Spam](https://www.signal-spam.fr/) et un site d'escroquerie sur la plateforme [Pharos](https://www.internet-signalement.gouv.fr/). Supprimez ensuite le message.

Si vous avez déjà cliqué ou saisi des informations, ne paniquez pas, mais agissez vite :

- **Vous avez donné un mot de passe** : changez-le immédiatement sur le vrai site, ainsi que partout où vous l'utilisiez, et activez la [double authentification](/blog/double-authentification).
- **Vous avez donné des coordonnées bancaires** : appelez sans attendre votre banque pour faire opposition sur la carte.
- **Vous avez ouvert une pièce jointe** : déconnectez l'appareil d'Internet et lancez une analyse antivirus ; en cas de doute, faites-vous aider via [cybermalveillance.gouv.fr](https://www.cybermalveillance.gouv.fr/).

Le cours [Compte piraté ou arnaque : que faire tout de suite](/blog/que-faire-si-pirate) détaille la marche à suivre.

## À retenir

- L'hameçonnage imite un organisme de confiance pour vous voler identifiants ou argent.
- Urgence, menace et demande inhabituelle sont les signaux d'alerte principaux.
- Vérifiez toujours le vrai nom de domaine d'un lien avant de cliquer.
- Un message sans faute peut tout de même être un faux.
- Pour vérifier, passez par le site ou l'application officielle, jamais par le message.
- Si vous avez cliqué, changez vos mots de passe et prévenez votre banque sans attendre.

## Quiz

?? Un e-mail vous presse de payer 1,99 euro pour débloquer la livraison d'un colis. Que faites-vous ?
- [ ] Vous payez, c'est une petite somme
- [x] Vous ne cliquez pas et vérifiez le suivi sur le site officiel du transporteur
- [ ] Vous répondez à l'e-mail pour demander des précisions
=> Les faux frais de livraison servent surtout à récupérer vos coordonnées bancaires. Vérifiez toujours par le site officiel.

?? Quel est le vrai domaine du lien `https://ameli.fr.mon-dossier-sante.net/connexion` ?
- [ ] ameli.fr
- [x] mon-dossier-sante.net
- [ ] connexion
=> Le domaine se lit juste avant le premier « / » : ici, mon-dossier-sante.net. Le début « ameli.fr. » est un leurre.

?? Un e-mail ne contient aucune faute et affiche le bon logo. Peut-on en conclure qu'il est authentique ?
- [ ] Oui, les escrocs font toujours des fautes
- [x] Non, les faux messages peuvent être parfaitement rédigés
- [ ] Oui, si le logo est en haute définition
=> Les escrocs soignent de plus en plus leurs messages. Seule une vérification par un autre canal permet de trancher.

?? Vous avez saisi votre mot de passe de messagerie sur un faux site. Quelle est la première chose à faire ?
- [ ] Attendre de voir s'il se passe quelque chose
- [ ] Supprimer l'e-mail d'hameçonnage
- [x] Changer immédiatement ce mot de passe sur le vrai site, et partout où il était réutilisé
=> Chaque minute compte : il faut rendre le mot de passe volé inutilisable avant que l'escroc ne s'en serve.
