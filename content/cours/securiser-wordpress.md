---
title: Sécuriser un site WordPress
description: Mises à jour, extensions, comptes administrateurs, fichiers sensibles, sauvegardes : la méthode pour protéger un site WordPress sans y passer vos journées.
track: site-web
level: intermediaire
order: 6
minutes: 7
updated: 2026-11-22
tags: wordpress, cms, extensions, mises à jour, xml-rpc, sauvegardes
---
WordPress propulse une très grande partie des sites web dans le monde, des blogs personnels aux boutiques en ligne. Cette popularité en fait une cible de choix : des robots parcourent Internet en permanence à la recherche de sites WordPress à jour de rien, d'extensions vulnérables ou de comptes `admin` au mot de passe faible. Le cœur de WordPress est pourtant bien maintenu et corrigé rapidement. Dans la grande majorité des cas, la porte d'entrée est ailleurs : une extension ou un thème non mis à jour, un compte mal protégé, un fichier oublié sur le serveur. Bonne nouvelle : ce sont des points que vous maîtrisez.

## Ce que vous allez apprendre

- D'où viennent réellement la plupart des piratages de sites WordPress.
- Comment gérer mises à jour, extensions et thèmes sans risque.
- Comment protéger les comptes et l'accès à l'administration.
- Quels fichiers et fonctions sensibles verrouiller côté serveur.
- Comment préparer une restauration rapide en cas d'incident.

## Mettre à jour, toujours

Une faille publiée dans une extension populaire est exploitée par des robots en quelques jours, parfois en quelques heures. Les mises à jour sont donc votre première ligne de défense (voir aussi [le cours sur les mises à jour](/blog/mises-a-jour)).

- **Le cœur de WordPress** : les versions mineures (correctifs de sécurité) s'installent automatiquement par défaut. Laissez ce comportement activé.
- **Les extensions et thèmes** : depuis WordPress 5.5, vous pouvez activer les mises à jour automatiques extension par extension, depuis la page Extensions. Faites-le au moins pour les extensions simples et bien maintenues.
- **PHP** : la version de PHP de votre hébergement doit encore recevoir des correctifs de sécurité. Les versions en fin de vie n'en reçoivent plus, même si votre site fonctionne encore. Vérifiez le calendrier officiel sur [php.net](https://www.php.net/supported-versions.php).

> [!astuce] Pour un site qui génère du chiffre d'affaires, utilisez un environnement de préproduction : appliquez les mises à jour sur une copie du site, vérifiez les pages clés (panier, formulaires), puis reportez-les en production. La sauvegarde juste avant la mise à jour reste indispensable.

## Extensions et thèmes : moins, mais mieux

Chaque extension ajoute du code qui s'exécute sur votre serveur, donc une surface d'attaque supplémentaire.

1. **Faites l'inventaire** : supprimez (et pas seulement désactivez) les extensions et thèmes inutilisés. Une extension désactivée reste sur le serveur, et certaines failles sont exploitables même sans activation.
2. **Choisissez avec soin** : privilégiez le répertoire officiel de WordPress.org ou des éditeurs reconnus, vérifiez la date de dernière mise à jour et le nombre d'installations actives.
3. **Bannissez les versions « nulled »** : ces copies piratées d'extensions payantes contiennent très souvent une porte dérobée.
4. **Surveillez les failles connues** : plusieurs bases publiques recensent les vulnérabilités d'extensions WordPress, et des outils de scan les comparent à vos versions installées.

> [!exemple] Une agence gère une trentaine de sites de commerçants. Sur l'un d'eux, une extension de formulaire abandonnée par son auteur deux ans plus tôt contient une faille de téléversement de fichiers. Un robot l'exploite, dépose un script PHP et ajoute des centaines de pages de spam au site. Google affiche alors un avertissement dans les résultats de recherche. Il faut restaurer une sauvegarde, remplacer l'extension, changer tous les mots de passe et demander un réexamen à Google. Depuis, l'agence passe chaque mois en revue les extensions de tous ses sites et supprime celles qui ne sont plus maintenues.

## Protéger les comptes et l'administration

- **Pas d'identifiant `admin`** : c'est le premier nom essayé par les robots. Créez un compte administrateur nominatif, puis supprimez l'ancien en réattribuant ses contenus.
- **Mots de passe uniques et longs** pour chaque compte, stockés dans un gestionnaire (voir [le cours sur les mots de passe](/blog/mots-de-passe-solides)).
- **Double authentification** pour tous les comptes ayant accès à l'administration, via une extension reconnue (voir [le cours dédié](/blog/double-authentification)).
- **Moindre privilège** : un rédacteur n'a pas besoin du rôle Administrateur. WordPress propose les rôles Éditeur, Auteur et Contributeur.
- **Limiter les tentatives de connexion**, par une extension de sécurité ou au niveau du pare-feu applicatif de l'hébergeur.

Le fichier `xmlrpc.php` est une ancienne interface de publication à distance. Il est souvent utilisé pour des attaques par force brute, car il permet de tester de nombreux mots de passe en une seule requête. Si vous n'utilisez ni l'application mobile WordPress ni un service qui en dépend, bloquez-le :

```nginx
location = /xmlrpc.php {
    deny all;
}
```

## Verrouiller les fichiers sensibles

Le fichier `wp-config.php` contient les identifiants de la base de données et les clés de sécurité. Il ne doit jamais être téléchargeable, ni ses copies de sauvegarde (`wp-config.php.bak`, `wp-config.old`) que l'on oublie souvent à la racine.

Ajoutez dans `wp-config.php` :

```php
define( 'DISALLOW_FILE_EDIT', true );
```

Cette constante désactive l'éditeur de fichiers intégré à l'administration : même avec un compte administrateur volé, un attaquant ne pourra pas modifier le code PHP du thème depuis le navigateur.

Empêchez ensuite l'exécution de PHP dans le dossier des fichiers envoyés, qui ne doit contenir que des images et documents. Avec nginx :

```nginx
location ~* ^/wp-content/uploads/.*\.php$ {
    deny all;
}
```

Avec Apache, dans un fichier `.htaccess` placé dans `wp-content/uploads/` :

```apache
<FilesMatch "\.php$">
    Require all denied
</FilesMatch>
```

Vérifiez aussi que la liste des fichiers d'un dossier ne s'affiche pas (`Options -Indexes` sous Apache), que les droits des fichiers sont raisonnables (pas de `777`) et que le mode débogage est désactivé en production (`WP_DEBUG` à `false`). La documentation officielle [Hardening WordPress](https://developer.wordpress.org/advanced-administration/security/hardening/) détaille ces réglages.

> [!attention] Les extensions de sécurité « tout-en-un » sont utiles, mais elles ne remplacent ni les mises à jour ni de bons mots de passe. Évitez d'en empiler plusieurs : elles peuvent entrer en conflit et ralentir le site.

## Sauvegarder et savoir restaurer

Une sauvegarde complète comprend **la base de données et les fichiers** (notamment `wp-content`). Elle doit être automatique, régulière, conservée sur plusieurs versions et stockée **ailleurs que sur le serveur du site** : si le serveur est compromis ou chiffré par un rançongiciel, une sauvegarde locale disparaît avec lui.

Testez la restauration au moins une fois, sur un environnement de test. Une sauvegarde jamais restaurée est une hypothèse, pas une garantie.

## À retenir

- La plupart des piratages WordPress passent par des extensions, des thèmes ou des comptes, pas par le cœur.
- Mettez à jour le cœur, les extensions, les thèmes et PHP ; supprimez ce qui ne sert plus.
- Pas de compte `admin`, mots de passe uniques, double authentification, rôles minimaux.
- Bloquez `xmlrpc.php` s'il est inutile, désactivez l'éditeur de fichiers et interdisez PHP dans `uploads`.
- Sauvegardez hors du serveur et testez la restauration.

## Quiz

?? Quelle est la porte d'entrée la plus fréquente lors du piratage d'un site WordPress ?
- [ ] Une faille non corrigée dans le cœur de WordPress à jour
- [x] Une extension ou un thème vulnérable ou non mis à jour
- [ ] Le certificat HTTPS
=> Le cœur est corrigé rapidement ; ce sont surtout les extensions et thèmes, nombreux et inégalement maintenus, qui sont exploités.

?? Que faire d'une extension que vous n'utilisez plus ?
- [ ] La désactiver, cela suffit
- [ ] La garder au cas où
- [x] La supprimer complètement du serveur
=> Une extension désactivée reste présente sur le serveur et peut contenir des fichiers exploitables.

?? À quoi sert la constante DISALLOW_FILE_EDIT ?
- [x] À empêcher la modification des fichiers PHP depuis l'administration
- [ ] À bloquer les mises à jour automatiques
- [ ] À interdire le téléversement d'images
=> Même avec un compte administrateur volé, l'attaquant ne peut pas injecter de code via l'éditeur intégré.

?? Où conserver les sauvegardes d'un site WordPress ?
- [ ] Dans un dossier du serveur du site, pour aller plus vite
- [x] Hors du serveur du site, en plusieurs versions
- [ ] Uniquement dans la corbeille de WordPress
=> Si le serveur est compromis, les sauvegardes stockées dessus peuvent être supprimées ou altérées.
