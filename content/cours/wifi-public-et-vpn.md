---
title: Wi-Fi public et VPN : ce qu'il faut vraiment savoir
description: Gare, café, hôtel : les vrais risques du Wi-Fi public, ce que le HTTPS protège déjà, et ce qu'un VPN fait (et ne fait pas) pour vous.
track: fondamentaux
level: debutant
order: 8
minutes: 7
updated: 2026-11-22
tags: Wi-Fi public, VPN, HTTPS, faux point d'accès, partage de connexion
---
Dans un train, un café ou un hôtel, se connecter au Wi-Fi gratuit est tentant. On entend souvent que c'est très dangereux, et que la solution miracle serait un VPN. La réalité est plus nuancée. Le Web est aujourd'hui largement chiffré, ce qui limite beaucoup les risques d'autrefois, mais certains pièges restent bien réels. Ce cours vous aide à faire la part des choses, sans paranoïa ni naïveté.

## Ce que vous allez apprendre

- Quels sont les vrais risques d'un réseau Wi-Fi public.
- Ce que le HTTPS protège déjà, et ce qu'il ne protège pas.
- Le piège du faux point d'accès.
- Ce qu'est un VPN, ce qu'il apporte et ses limites.
- Les réflexes simples à adopter en déplacement.

## Pourquoi le Wi-Fi public pose question

Sur un réseau Wi-Fi ouvert, vous partagez la connexion avec des inconnus, et vous ne savez pas qui gère réellement le réseau. Deux risques principaux en découlent :

- **l'écoute** : une personne mal intentionnée sur le même réseau, ou qui contrôle le point d'accès, peut tenter d'observer le trafic qui n'est pas chiffré ;
- **la tromperie** : on vous redirige vers une fausse page pour vous faire saisir des informations.

Il y a quelques années, beaucoup de sites transmettaient les données en clair, et ces risques étaient très élevés. La situation a nettement changé grâce au HTTPS.

## Ce que le HTTPS protège déjà

> [!definition] HTTPS : version sécurisée du protocole utilisé pour afficher les pages web. Les échanges entre votre appareil et le site sont **chiffrés** : une personne qui les intercepte ne voit qu'une suite de caractères illisibles. Le cadenas ou l'adresse en `https://` le signalent dans le navigateur.

Aujourd'hui, la grande majorité des sites et des applications sérieuses (banques, messageries, réseaux sociaux, sites marchands) utilisent ce chiffrement. Sur un Wi-Fi public, une personne qui écoute le réseau peut voir **à quels sites** vous vous connectez, mais pas le contenu de vos échanges avec eux : ni vos mots de passe, ni vos messages, ni votre numéro de carte.

Le HTTPS ne garantit cependant pas que le site est honnête : il garantit seulement que la connexion avec ce site est chiffrée. Un faux site d'hameçonnage peut très bien afficher un cadenas. Pour en savoir plus, consultez le cours [HTTPS et certificats](/blog/https-et-certificats).

> [!attention] Si votre navigateur affiche un avertissement du type « Votre connexion n'est pas privée » ou « Certificat non valide » sur un site que vous utilisez d'habitude sans problème, ne passez pas outre. Sur un Wi-Fi public, cela peut signaler une tentative d'interception. Déconnectez-vous du réseau.

## Le vrai piège : le faux point d'accès

Le risque le plus concret est le **faux point d'accès** : un réseau créé par un escroc, avec un nom crédible comme « Gare_WiFi_Gratuit » ou le nom de l'hôtel. Une fois connecté, vous pouvez être redirigé vers une page qui vous demande vos identifiants ou votre carte bancaire.

> [!exemple] Dans le hall d'un hôtel, un voyageur voit deux réseaux : « Hotel-Guest » et « Hotel-Guest-Free ». Il choisit le second, qui ne demande pas de mot de passe. Une page s'affiche : « Pour accéder à Internet, connectez-vous avec votre compte de messagerie. » Le formulaire imite parfaitement la page de connexion de son fournisseur. Il s'agissait d'un faux réseau installé par un escroc. Le vrai Wi-Fi de l'hôtel, indiqué à l'accueil, demandait simplement le numéro de chambre.

Quelques règles évitent ce piège :

- **Demandez le nom exact du réseau** au personnel de l'établissement.
- **Méfiez-vous d'une page de connexion qui réclame vos identifiants** de messagerie, de réseau social ou une carte bancaire pour un Wi-Fi annoncé gratuit.
- **Désactivez la connexion automatique** aux réseaux Wi-Fi ouverts dans les réglages de votre téléphone, et « oubliez » les réseaux publics après usage.

## Le VPN : utile, mais pas une armure

> [!definition] VPN (réseau privé virtuel) : service qui crée un « tunnel » chiffré entre votre appareil et un serveur du fournisseur de VPN. Tout votre trafic passe par ce tunnel avant de rejoindre Internet.

Sur un Wi-Fi public, un VPN empêche les personnes présentes sur le réseau de voir quels sites vous consultez, et ajoute une couche de chiffrement. C'est un vrai plus. Mais il faut connaître ses limites :

- **Il déplace la confiance** : votre trafic passe désormais par le fournisseur du VPN, qui peut techniquement en voir une partie. Choisir un fournisseur sérieux est donc essentiel. Méfiez-vous des VPN gratuits inconnus, dont le modèle économique repose parfois sur l'exploitation de vos données.
- **Il ne protège pas contre l'hameçonnage** : si vous saisissez votre mot de passe sur un faux site, le VPN le transmettra fidèlement… au faux site.
- **Il ne protège pas contre les logiciels malveillants** ni contre un mot de passe faible.
- **Il ne vous rend pas anonyme** : les sites peuvent toujours vous reconnaître si vous êtes connecté à votre compte.

Les entreprises utilisent aussi des VPN, mais dans un autre but : permettre aux salariés d'accéder de façon sécurisée au réseau interne. Si votre employeur vous en fournit un, utilisez-le pour le travail en déplacement.

## Les réflexes en déplacement

- **Privilégiez le partage de connexion** de votre téléphone (4G ou 5G) plutôt qu'un Wi-Fi public inconnu : c'est souvent la solution la plus sûre et la plus simple.
- **Vérifiez le HTTPS** et ne passez jamais outre un avertissement de certificat.
- **Reportez les opérations sensibles** (banque, démarches administratives) si vous n'êtes pas sur un réseau de confiance, ou utilisez les données mobiles.
- **Gardez vos appareils à jour** : les correctifs protègent aussi contre des attaques sur le Wi-Fi. Voir [Pourquoi les mises à jour sont vitales](/blog/mises-a-jour).
- **Désactivez le partage de fichiers** et la visibilité de votre ordinateur sur les réseaux publics (Windows vous propose de choisir un profil « Réseau public »).

Rappel : chercher à intercepter le trafic d'autres personnes sur un réseau, même public, est illégal en France. Ces explications servent uniquement à vous protéger.

## À retenir

- Le HTTPS chiffre déjà la plupart de vos échanges, même sur un Wi-Fi public.
- Le principal risque est le faux point d'accès qui vous redirige vers une fausse page.
- Ne passez jamais outre un avertissement de certificat sur un réseau public.
- Un VPN sérieux ajoute une protection sur le Wi-Fi public, mais ne protège ni de l'hameçonnage ni des logiciels malveillants.
- Le partage de connexion de votre téléphone est souvent l'option la plus sûre.

## Quiz

?? Sur un Wi-Fi public, que peut voir une personne qui écoute le réseau si vous consultez un site en HTTPS ?
- [ ] Votre mot de passe et vos messages
- [x] Le nom du site consulté, mais pas le contenu chiffré de vos échanges
- [ ] Tout ce que vous tapez au clavier
=> Le HTTPS chiffre le contenu des échanges. Seules certaines informations, comme le site visité, restent visibles.

?? Un Wi-Fi gratuit vous demande de vous connecter avec le mot de passe de votre messagerie. Que faites-vous ?
- [ ] Vous vous connectez, c'est pratique
- [x] Vous renoncez et demandez au personnel le nom du réseau officiel
- [ ] Vous activez votre VPN puis saisissez votre mot de passe
=> C'est le signe typique d'un faux point d'accès. Le VPN ne protège pas d'un formulaire piégé.

?? Quelle affirmation sur le VPN est exacte ?
- [ ] Il rend totalement anonyme sur Internet
- [ ] Il protège contre les faux sites d'hameçonnage
- [x] Il chiffre le trafic jusqu'au fournisseur de VPN, à qui il faut donc faire confiance
=> Le VPN déplace la confiance vers son fournisseur. Il ne bloque ni l'hameçonnage ni les logiciels malveillants.

?? Quelle est souvent l'alternative la plus sûre à un Wi-Fi public inconnu ?
- [x] Le partage de connexion de votre propre téléphone
- [ ] Le réseau Wi-Fi qui a le meilleur signal
- [ ] Le réseau sans mot de passe
=> Votre connexion mobile n'est pas partagée avec des inconnus, ce qui supprime le risque de faux point d'accès.
