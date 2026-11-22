---
title: Bibliothèques et composants vulnérables : rester à jour
description: Inventorier ses dépendances, lire une alerte CVE, automatiser les mises à jour et encadrer les scripts tiers pour ne laisser aucune faille connue.
track: site-web
level: intermediaire
order: 7
minutes: 7
updated: 2026-11-22
tags: dépendances, cve, npm, composer, sbom, mises à jour, chaîne d'approvisionnement
---
Un site web moderne est fait en grande partie de code que vous n'avez pas écrit : un framework, des dizaines ou des centaines de bibliothèques, un CMS et ses extensions, des scripts chargés depuis d'autres serveurs, sans oublier le serveur web et le langage lui-même. Chacun de ces composants peut contenir une faille. Quand elle est découverte, elle est publiée avec un identifiant, et des outils d'attaque automatisés commencent à la rechercher sur tout Internet. Ce qui protège votre site, ce n'est pas l'absence de failles dans vos composants, c'est la vitesse à laquelle vous appliquez les correctifs. L'OWASP classe ce risque dans son Top 10 (A06, voir [l'OWASP Top 10 expliqué](/blog/owasp-top-10-explique)).

## Ce que vous allez apprendre

- Pourquoi une faille connue est plus dangereuse qu'une faille inconnue.
- Comment faire l'inventaire de vos composants, y compris ceux qu'on oublie.
- Comment lire une alerte de sécurité et décider de l'urgence.
- Comment automatiser la détection et les mises à jour.
- Comment limiter les risques liés aux scripts tiers et aux paquets piégés.

## Le cycle de vie d'une faille publique

> [!definition] CVE (*Common Vulnerabilities and Exposures*) : identifiant unique attribué à une faille rendue publique, sous la forme `CVE-2024-12345`. Il permet à tout le monde de parler de la même faille et aux outils de la repérer automatiquement.

Le scénario est presque toujours le même : l'éditeur publie un correctif et un avis de sécurité, la faille reçoit un identifiant CVE, puis des chercheurs ou des attaquants analysent le correctif pour comprendre la faille. Des robots se mettent ensuite à scanner Internet pour trouver les sites qui affichent encore la version vulnérable. Entre la publication et les premières exploitations, le délai se compte parfois en jours, voire en heures pour les composants très répandus.

Chaque faille reçoit en général une note de gravité **CVSS**, de 0 à 10. C'est un bon point de départ, mais il faut la croiser avec votre contexte : la fonction vulnérable est-elle utilisée par votre site ? Est-elle accessible depuis Internet ? Le catalogue [Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) de l'agence américaine CISA recense les failles dont l'exploitation réelle est confirmée : une faille qui y figure est à traiter en priorité. En France, le [CERT-FR](https://www.cert.ssi.gouv.fr/) publie des avis et des alertes sur les vulnérabilités importantes.

## Faire l'inventaire

On ne peut pas mettre à jour ce qu'on ne connaît pas. Votre inventaire doit couvrir :

- **les dépendances du code** : fichiers `package.json` et `package-lock.json` (JavaScript), `composer.json` et `composer.lock` (PHP), `requirements.txt` (Python)… Les fichiers de verrouillage (*lock files*) indiquent les versions exactes installées, y compris les **dépendances indirectes**, celles dont dépendent vos dépendances, souvent bien plus nombreuses ;
- **le CMS, ses extensions et ses thèmes** (voir [sécuriser WordPress](/blog/securiser-wordpress)) ;
- **les scripts chargés côté navigateur** : bibliothèques JavaScript copiées dans le site, scripts de mesure d'audience, widgets de chat, polices ;
- **l'infrastructure** : système d'exploitation, serveur web, version de PHP ou de Node.js, base de données.

> [!astuce] Une **SBOM** (*Software Bill of Materials*, nomenclature logicielle) est un inventaire structuré de tous les composants d'une application, dans un format standard comme CycloneDX ou SPDX. De nombreux outils la génèrent automatiquement, et certains clients ou réglementations commencent à l'exiger.

## Détecter automatiquement les failles connues

Les gestionnaires de paquets intègrent un audit qui compare vos versions aux bases de vulnérabilités publiques :

```bash
npm audit
composer audit
pip-audit
```

Les plateformes d'hébergement de code, comme GitHub avec Dependabot, peuvent surveiller vos dépôts en continu, vous alerter et proposer directement une mise à jour. La base [OSV](https://osv.dev/) agrège les vulnérabilités de nombreux écosystèmes et peut être consultée librement.

> [!attention] `npm audit fix --force` peut installer des versions majeures incompatibles et casser votre site. Lisez ce que la commande propose, appliquez les mises à jour sur une branche, et lancez vos tests avant de déployer.

Côté navigateur, un scanner de sécurité passif peut repérer les bibliothèques JavaScript visibles dans vos pages (par exemple une ancienne version de jQuery) et signaler celles qui ont des failles connues.

## Une stratégie de mise à jour réaliste

Tout mettre à jour tout le temps est irréaliste ; ne rien mettre à jour est dangereux. Un rythme simple fonctionne bien :

1. **Correctifs de sécurité critiques** (faille exploitée, composant exposé) : sous quelques jours.
2. **Mises à jour mineures et correctifs** : chaque semaine ou chaque mois, regroupées, avec les tests automatiques.
3. **Montées de version majeures** : planifiées, avant la fin du support de la version utilisée.
4. **Composants abandonnés** : un composant sans mise à jour depuis longtemps ou dont le support est terminé doit être remplacé. Aucun correctif n'arrivera plus.

Gardez vos fichiers de verrouillage dans le dépôt, pour que la production installe exactement les versions testées.

> [!exemple] Une jeune entreprise a développé son site avec un framework JavaScript. Le développeur est parti et personne n'a touché aux dépendances depuis dix-huit mois. Un scan révèle une version du framework touchée par une faille critique de contournement d'authentification, corrigée depuis des mois et activement recherchée par des robots. La mise à jour vers la dernière version mineure de la même branche prend une heure, tests compris. Depuis, Dependabot ouvre automatiquement les demandes de mise à jour, et l'équipe les traite chaque lundi.

## Scripts tiers et paquets piégés

Un script chargé depuis un autre serveur s'exécute avec les mêmes droits que votre propre code. Si ce serveur est compromis, votre site l'est aussi. Pour les fichiers statiques chargés depuis un CDN, l'attribut `integrity` (*Subresource Integrity*) fait vérifier au navigateur que le fichier n'a pas été modifié :

```html
<script src="https://cdn.exemple.com/lib-3.2.1.min.js"
        integrity="sha384-…"
        crossorigin="anonymous"></script>
```

Si l'empreinte ne correspond pas, le script n'est pas exécuté. Pour les scripts qui changent souvent (mesure d'audience, chat), cette méthode ne s'applique pas : limitez leur nombre et encadrez-les avec une [Content-Security-Policy](/blog/content-security-policy).

Méfiez-vous aussi des **paquets piégés** : noms imitant un paquet populaire à une lettre près (*typosquatting*), ou paquet légitime dont le compte du mainteneur a été piraté. Vérifiez le nom exact avant d'installer, préférez les paquets maintenus et populaires, et ne laissez jamais traîner de jetons de publication dans votre code (voir [les secrets dans le code](/blog/secrets-dans-le-code)).

## À retenir

- Une faille publiée est rapidement exploitée : la vitesse de correction est votre meilleure protection.
- Inventoriez tout : dépendances directes et indirectes, CMS, scripts tiers, infrastructure.
- Automatisez la détection (`npm audit`, `composer audit`, Dependabot) et traitez en priorité les failles réellement exploitées.
- Remplacez les composants abandonnés ou en fin de support.
- Protégez les scripts externes avec `integrity` et une CSP, et vérifiez les paquets avant de les installer.

## Quiz

?? Qu'est-ce qu'un identifiant CVE ?
- [ ] Un certificat attestant qu'un logiciel est sûr
- [x] Un identifiant unique attribué à une faille rendue publique
- [ ] Une version corrigée d'une bibliothèque
=> Le CVE permet de désigner précisément une faille et aux outils de la détecter dans vos composants.

?? Pourquoi les dépendances indirectes comptent-elles ?
- [ ] Elles ne comptent pas, seules les dépendances déclarées s'exécutent
- [x] Elles s'exécutent aussi dans votre application et peuvent contenir des failles
- [ ] Elles sont automatiquement mises à jour par le navigateur
=> Les dépendances de vos dépendances font partie de votre application ; le fichier de verrouillage les liste.

?? À quoi sert l'attribut integrity sur une balise script ?
- [ ] À accélérer le chargement du script
- [ ] À masquer le code source du script
- [x] À vérifier que le fichier chargé n'a pas été modifié
=> Le navigateur compare l'empreinte du fichier reçu à celle indiquée et refuse de l'exécuter si elles diffèrent.

?? Un composant de votre site n'est plus maintenu depuis longtemps. Que faire ?
- [ ] Le garder tant que le site fonctionne
- [x] Planifier son remplacement, car aucun correctif n'arrivera plus
- [ ] Masquer son numéro de version pour être tranquille
=> Masquer la version ne corrige rien : un composant abandonné restera vulnérable aux prochaines failles découvertes.
