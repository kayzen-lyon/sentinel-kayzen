---
title: L'OWASP Top 10 expliqué simplement
description: Les dix familles de failles web de l'OWASP (édition 2021), chacune illustrée par un exemple concret et les bons réflexes pour s'en protéger.
track: site-web
level: intermediaire
order: 5
minutes: 7
updated: 2026-11-22
tags: owasp, top 10, vulnérabilités, contrôle d'accès, injection, ssrf
---
Quand on parle de sécurité des sites web, un nom revient sans cesse : l'**OWASP Top 10**. L'OWASP (*Open Worldwide Application Security Project*) est une fondation à but non lucratif qui publie des ressources libres sur la sécurité applicative. Son Top 10 classe les dix catégories de risques les plus importantes pour les applications web, à partir de données remontées par des entreprises et de l'avis de la communauté. C'est devenu une référence commune entre développeurs, agences, auditeurs et clients : savoir ce que recouvre chaque catégorie vous aide à lire un rapport d'audit et à poser les bonnes questions à votre prestataire.

## Ce que vous allez apprendre

- Ce qu'est l'OWASP Top 10 et comment l'utiliser.
- Les dix catégories de l'édition 2021, avec un exemple concret pour chacune.
- Les réflexes de protection qui reviennent d'une catégorie à l'autre.
- Les limites de cette liste.

## Une liste de familles, pas une liste de contrôle

Chaque catégorie regroupe de nombreuses faiblesses précises, référencées par des identifiants CWE (*Common Weakness Enumeration*). La liste est révisée tous les trois ou quatre ans environ ; ce cours présente l'**édition 2021**, encore très largement citée par les outils et les référentiels. Une édition 2025 a depuis été publiée et réorganise certaines catégories : consultez le [site officiel du projet](https://owasp.org/www-project-top-ten/) pour le détail des changements. Les principes de prévention décrits ici restent valables.

> [!attention] Le Top 10 est un outil de sensibilisation, pas un référentiel complet. Pour vérifier méthodiquement une application, l'OWASP propose l'ASVS (*Application Security Verification Standard*), beaucoup plus détaillé. Et rappelez-vous : tester la sécurité d'un site sans autorisation écrite de son propriétaire est illégal en France (article 323-1 du Code pénal).

## A01 à A03 : accès, chiffrement, injection

**A01 – Contrôle d'accès défaillant** (*Broken Access Control*). L'application ne vérifie pas correctement ce que chaque utilisateur a le droit de faire. Exemple : en modifiant `facture=1042` en `facture=1043` dans l'URL, un client consulte la facture d'un autre. C'est la catégorie numéro un de l'édition 2021. Parade : vérifier les droits côté serveur à chaque requête, et refuser par défaut. Voir [le cours sur l'IDOR](/blog/controle-acces-idor).

**A02 – Défaillances cryptographiques** (*Cryptographic Failures*). Des données sensibles sont mal protégées : transmises sans HTTPS, mots de passe stockés en clair ou avec un algorithme rapide comme MD5, clés faibles. Parade : HTTPS partout (voir [HTTPS et certificats](/blog/https-et-certificats)), hachage des mots de passe avec un algorithme dédié (Argon2, bcrypt, scrypt), et ne stocker que les données nécessaires.

**A03 – Injection**. Des données fournies par l'utilisateur sont interprétées comme du code : requête SQL, commande système, ou script dans la page. Depuis 2021, le XSS (*cross-site scripting*) est rangé dans cette catégorie. Parade : requêtes préparées, échappement selon le contexte, validation des entrées. Voir [les injections SQL](/blog/injections-sql) et [le XSS](/blog/xss-comprendre-et-prevenir).

## A04 à A06 : conception, configuration, composants

**A04 – Conception non sécurisée** (*Insecure Design*). La faille n'est pas une erreur de code mais un défaut de conception. Exemple : un parcours « mot de passe oublié » fondé sur une question secrète dont la réponse se trouve sur les réseaux sociaux, ou un code de réduction utilisable à l'infini. Parade : réfléchir aux abus possibles dès la conception (modélisation des menaces).

**A05 – Mauvaise configuration de sécurité** (*Security Misconfiguration*). Mots de passe par défaut, liste des fichiers d'un répertoire visible, messages d'erreur détaillés en production, en-têtes de sécurité absents, stockage cloud ouvert au public. Parade : durcir chaque environnement, automatiser la configuration, et vérifier régulièrement (voir [les en-têtes de sécurité](/blog/en-tetes-de-securite-http)).

**A06 – Composants vulnérables et obsolètes** (*Vulnerable and Outdated Components*). Une bibliothèque, un plugin ou un CMS comporte une faille connue et publiée, mais n'a pas été mis à jour. Parade : inventaire des composants et mises à jour régulières. Voir [le cours dédié](/blog/dependances-et-composants-vulnerables).

## A07 à A10 : authentification, intégrité, journalisation, SSRF

**A07 – Identification et authentification défaillantes** (*Identification and Authentication Failures*). Aucune limite au nombre d'essais de connexion, mots de passe faibles acceptés, session qui reste valide après la déconnexion. Parade : limitation des tentatives, double authentification (voir [le cours dédié](/blog/double-authentification)), gestion rigoureuse des sessions (voir [les cookies sécurisés](/blog/cookies-securises)).

**A08 – Manque d'intégrité des données et du logiciel** (*Software and Data Integrity Failures*). L'application fait confiance à du code ou à des données sans vérifier leur origine : mise à jour téléchargée sans contrôle de signature, script chargé depuis un CDN compromis, chaîne de déploiement mal protégée, désérialisation de données non fiables. Parade : signatures, attribut `integrity` sur les scripts externes, protection de la chaîne de déploiement.

**A09 – Carences de journalisation et de surveillance** (*Security Logging and Monitoring Failures*). Les connexions suspectes et les erreurs ne sont pas journalisées, ou personne ne regarde les journaux. Une intrusion peut durer des mois sans être détectée. Parade : journaliser les événements de sécurité et définir des alertes (voir [la surveillance continue](/blog/surveiller-son-site-en-continu)).

**A10 – Falsification de requête côté serveur** (*Server-Side Request Forgery*, SSRF). L'application télécharge une ressource à partir d'une URL fournie par l'utilisateur, et l'attaquant lui fait appeler des adresses internes, par exemple le service de métadonnées d'un serveur cloud qui délivre des identifiants. Parade : liste stricte des destinations autorisées, blocage des adresses internes. Voir [le cours sur la SSRF](/blog/ssrf).

> [!exemple] Une agence livre un espace client pour un cabinet comptable. Lors de l'audit avant mise en ligne, l'auditeur, mandaté par écrit, relève trois points : les documents s'ouvrent via `/document?id=…` sans vérification du propriétaire (A01), le framework utilisé a deux versions de retard dont une corrige une faille critique (A06), et les erreurs affichent la pile d'appels complète avec le chemin des fichiers (A05). Les trois corrections prennent une journée. Le rapport, organisé selon les catégories du Top 10, a permis au cabinet de comprendre les enjeux sans être développeur.

## Les réflexes communs

En parcourant la liste, quelques principes reviennent sans cesse :

1. **Ne jamais faire confiance aux données reçues** : paramètres, formulaires, en-têtes, fichiers.
2. **Vérifier côté serveur** : ce que le navigateur contrôle, l'utilisateur peut le modifier.
3. **Refuser par défaut** : n'autoriser que ce qui est explicitement prévu.
4. **Tenir à jour** : composants, serveurs, configuration.
5. **Garder des traces** : sans journaux, impossible de détecter une attaque ni d'en mesurer l'ampleur.

> [!astuce] Les [fiches pratiques de l'OWASP](https://cheatsheetseries.owasp.org/) (*Cheat Sheet Series*) donnent, pour chaque sujet, des recommandations concrètes et à jour. C'est le complément naturel du Top 10.

## À retenir

- L'OWASP Top 10 classe les grandes familles de risques des applications web ; ce cours suit l'édition 2021.
- Le contrôle d'accès défaillant (A01) arrive en tête : vérifiez les droits côté serveur, à chaque requête.
- Le XSS fait partie de la catégorie Injection (A03) depuis 2021.
- Beaucoup de failles viennent de la configuration (A05) et des composants non mis à jour (A06).
- Le Top 10 sensibilise ; pour un contrôle complet, l'ASVS est plus adapté.

## Quiz

?? Quelle catégorie occupe la première place de l'OWASP Top 10 2021 ?
- [ ] L'injection
- [x] Le contrôle d'accès défaillant
- [ ] Les défaillances cryptographiques
=> A01 Broken Access Control est passé en tête en 2021 : c'est la famille de failles la plus fréquemment observée.

?? Dans l'édition 2021, où est classé le cross-site scripting (XSS) ?
- [x] Dans la catégorie Injection (A03)
- [ ] Dans une catégorie à part, A11
- [ ] Il ne figure plus dans le Top 10
=> Depuis 2021, le XSS est regroupé avec les autres injections, car il s'agit aussi de données interprétées comme du code.

?? Un client voit la facture d'un autre client en changeant un numéro dans l'URL. De quelle catégorie s'agit-il ?
- [ ] A05 Mauvaise configuration de sécurité
- [ ] A09 Carences de journalisation
- [x] A01 Contrôle d'accès défaillant
=> Le serveur ne vérifie pas que la ressource demandée appartient à l'utilisateur connecté.

?? Que désigne la catégorie A10 de l'édition 2021 ?
- [ ] Les attaques par déni de service
- [x] La falsification de requête côté serveur (SSRF)
- [ ] Le hameçonnage
=> La SSRF consiste à faire envoyer par le serveur des requêtes vers des destinations choisies par l'attaquant, souvent internes.
