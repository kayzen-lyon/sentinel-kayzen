---
title: SSRF : quand votre serveur attaque à votre place
description: Aperçu de lien, import par URL, webhooks : comment une URL fournie par l'utilisateur atteint votre réseau interne, et comment une liste blanche l'en empêche.
track: developpeurs
level: avance
order: 7
minutes: 7
updated: 2026-11-22
tags: SSRF, cloud, métadonnées, liste blanche, réseau, webhooks
---
De nombreuses fonctionnalités demandent au serveur d'aller chercher une ressource à une adresse fournie par l'utilisateur : importer une image depuis une URL, générer l'aperçu d'un lien, appeler un webhook, convertir une page en PDF. Si cette adresse n'est pas contrôlée, l'utilisateur peut viser autre chose qu'Internet : les services internes de votre réseau, l'interface d'administration d'une base de données, ou le service de métadonnées de votre hébergeur cloud. Votre serveur, placé derrière le pare-feu, devient alors le relais de l'attaquant.

## Ce que vous allez apprendre

- Ce qu'est une SSRF et pourquoi le serveur est une cible privilégiée.
- Le risque particulier des services de métadonnées cloud.
- Pourquoi les listes noires d'adresses échouent presque toujours.
- Comment construire une validation par liste blanche robuste.
- Les protections au niveau du réseau et de l'infrastructure.

## Le principe

> [!definition] SSRF (Server-Side Request Forgery, falsification de requête côté serveur) : faille qui permet à un utilisateur de faire envoyer par le serveur des requêtes vers une destination de son choix, y compris des adresses internes inaccessibles depuis Internet.

L'OWASP en a fait une catégorie à part entière de son [Top 10](/blog/owasp-top-10-explique) 2021 (**A10:2021 – Server-Side Request Forgery**), et elle figure aussi dans l'OWASP API Security Top 10 2023 (**API7:2023**).

Un exemple typique : une fonction qui récupère l'avatar d'un utilisateur depuis une URL.

```typescript
// Vulnérable : le serveur suit n'importe quelle URL
app.post("/api/profil/avatar", exigerConnexion, async (req, res) => {
  const reponse = await fetch(req.body.url);
  const image = Buffer.from(await reponse.arrayBuffer());
  await stockage.enregistrer(`avatars/${req.user.id}`, image);
  res.json({ ok: true });
});
```

Rien n'empêche ici de fournir `http://localhost:8080/admin`, `http://10.0.0.12:9200/` (un moteur de recherche interne sans authentification) ou une adresse du service de métadonnées. Le serveur, lui, a accès à tout cela.

## Le cas critique : les métadonnées cloud

Les grands hébergeurs cloud exposent à chaque machine virtuelle un service de métadonnées, accessible à une adresse dite « lien-local », en particulier `169.254.169.254`. Ce service fournit la configuration de l'instance et, selon la configuration, des **identifiants temporaires** donnant accès aux autres ressources du compte cloud (stockage, bases de données, files de messages).

Une SSRF qui atteint ce service peut donc transformer une simple fonction d'aperçu de lien en accès au compte cloud de l'entreprise.

> [!exemple] Une application de gestion de notes de frais permet d'importer un justificatif « depuis une URL ». Lors d'un audit autorisé, l'auditeur fournit l'adresse du service de métadonnées de l'instance : la réponse, enregistrée comme « justificatif », contient le nom du rôle attribué à la machine. Il s'arrête là et le signale. Les identifiants associés auraient permis de lire le stockage où se trouvent les justificatifs de tous les clients. Deux corrections ont été appliquées : une liste blanche de destinations, et le passage à la version du service de métadonnées qui exige un jeton de session obtenu par une requête spéciale.

> [!astuce] Chez AWS, IMDSv2 impose d'obtenir un jeton par une requête `PUT` avec un en-tête dédié avant toute lecture, ce qui bloque la plupart des SSRF simples. Google Cloud et Azure exigent aussi un en-tête spécifique. Imposez ces versions protégées sur toutes vos instances, et n'attribuez aux machines que les droits strictement nécessaires.

## Pourquoi les listes noires échouent

Le premier réflexe est souvent d'interdire `localhost` et `127.0.0.1`. C'est insuffisant, car une même destination peut s'écrire de nombreuses façons :

- autres formes d'adresse (`127.1`, notation décimale ou hexadécimale, IPv6 `[::1]`) ;
- un nom de domaine public qui pointe vers une adresse interne ;
- une URL légitime qui **redirige** vers une adresse interne ;
- un nom de domaine qui change d'adresse entre la vérification et la requête (*DNS rebinding*).

Chercher toutes les façons d'écrire une adresse interdite est une course perdue d'avance. Il faut inverser la logique.

## La défense : liste blanche et validation de la destination réelle

L'[aide-mémoire OWASP sur la prévention des SSRF](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html) recommande, quand c'est possible, une **liste blanche** des destinations autorisées.

```typescript
const DOMAINES_AUTORISES = new Set(["images.partenaire.fr", "cdn.partenaire.fr"]);

function validerUrl(brute: string): URL {
  const url = new URL(brute); // lève une erreur si l'URL est invalide
  if (url.protocol !== "https:") throw new Error("Seul HTTPS est accepté");
  if (!DOMAINES_AUTORISES.has(url.hostname)) throw new Error("Domaine non autorisé");
  if (url.port && url.port !== "443") throw new Error("Port non autorisé");
  return url;
}

const url = validerUrl(req.body.url);
const reponse = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(5000) });
```

Points essentiels :

1. **Comparer le nom d'hôte analysé**, pas une sous-chaîne de l'URL : `includes("partenaire.fr")` accepterait `partenaire.fr.attaquant.exemple`.
2. **Refuser ou revalider les redirections** : sinon, un domaine autorisé peut renvoyer vers une adresse interne.
3. **Limiter le schéma et le port** : pas de `file:`, `gopher:` ou de ports internes.
4. **Ne pas renvoyer la réponse brute** à l'utilisateur, et limiter la taille et le temps de réponse.

Quand une liste blanche de domaines est impossible (aperçu de n'importe quel lien, webhooks configurés par les clients), il faut résoudre le nom de domaine, vérifier que **toutes** les adresses obtenues sont publiques (ni boucle locale, ni plages privées, ni lien-local `169.254.0.0/16`, ni leurs équivalents IPv6), puis se connecter à l'adresse vérifiée elle-même pour éviter le *DNS rebinding*. Utilisez une bibliothèque éprouvée plutôt que des expressions régulières maison.

## Défense en profondeur côté infrastructure

La validation applicative peut contenir une erreur ; le réseau doit servir de second filet :

- **Filtrage des flux sortants** : les serveurs applicatifs ne devraient pouvoir joindre que les destinations nécessaires. Un service dédié aux requêtes sortantes, isolé dans un réseau sans accès interne, est une bonne architecture pour les aperçus de liens et les webhooks.
- **Authentification des services internes** : un service interne ne doit pas faire confiance à une requête simplement parce qu'elle vient du réseau local.
- **Métadonnées protégées** : versions à jeton obligatoires, et droits minimaux pour les rôles des instances.
- **Journalisation** des requêtes sortantes refusées, utile pour détecter une tentative.

> [!attention] Pour pratiquer, utilisez les laboratoires [SSRF de PortSwigger](https://portswigger.net/web-security/ssrf) ou [OWASP Juice Shop](https://owasp.org/www-project-juice-shop/). Viser le réseau interne ou les métadonnées d'un service qui ne vous appartient pas est un accès frauduleux, illégal sans autorisation écrite (Code pénal, articles 323-1 et 323-3). En bug bounty, vérifiez que les tests SSRF sont autorisés dans le périmètre.

## À retenir

- Une SSRF transforme votre serveur en relais vers votre réseau interne et vos services cloud.
- Le service de métadonnées cloud (169.254.169.254) est la cible la plus critique : imposez sa version protégée.
- Les listes noires d'adresses se contournent facilement : préférez une liste blanche de destinations.
- Comparez le nom d'hôte analysé, refusez les redirections et limitez schéma et port.
- Filtrez les flux sortants au niveau réseau pour disposer d'un second filet.

## Quiz

?? Pourquoi l'adresse 169.254.169.254 est-elle une cible prioritaire d'une SSRF dans le cloud ?
- [ ] C'est l'adresse du pare-feu de l'hébergeur
- [x] Elle héberge le service de métadonnées, qui peut fournir des identifiants temporaires de l'instance
- [ ] Elle permet de contourner HTTPS
=> Le service de métadonnées peut délivrer des identifiants donnant accès aux autres ressources du compte cloud.

?? Pourquoi interdire seulement localhost et 127.0.0.1 ne suffit-il pas ?
- [ ] Parce que ces adresses n'existent pas en IPv4
- [x] Parce qu'une adresse interne peut être atteinte via d'autres notations, un domaine ou une redirection
- [ ] Parce que le serveur ignore ces adresses
=> Les variantes d'écriture, les noms de domaine et les redirections contournent toute liste noire.

?? Quelle vérification de domaine est correcte ?
- [ ] Vérifier que l'URL contient la chaîne partenaire.fr
- [ ] Vérifier que l'URL commence par https
- [x] Analyser l'URL et comparer son nom d'hôte exact à une liste blanche
=> Une recherche de sous-chaîne accepte des domaines contrôlés par l'attaquant ; seule la comparaison du nom d'hôte analysé est fiable.

?? Pourquoi faut-il refuser ou revalider les redirections HTTP ?
- [x] Parce qu'un domaine autorisé peut rediriger le serveur vers une adresse interne
- [ ] Parce que les redirections ralentissent le serveur
- [ ] Parce que les redirections sont interdites par HTTPS
=> Sans contrôle, la validation porte sur la première URL alors que la requête finit ailleurs.
