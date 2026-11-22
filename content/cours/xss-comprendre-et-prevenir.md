---
title: Cross-Site Scripting (XSS) : comprendre et prévenir
description: XSS réfléchi, stocké et DOM : comment un script injecté s'exécute chez vos utilisateurs, et comment l'encodage de sortie et la CSP l'en empêchent.
track: developpeurs
level: avance
order: 3
minutes: 7
updated: 2026-11-22
tags: XSS, injection, encodage, CSP, React, DOMPurify
---
Le Cross-Site Scripting, ou XSS, permet à un attaquant de faire exécuter son propre code JavaScript dans le navigateur de vos utilisateurs, sur votre domaine. Ce script agit alors avec les mêmes droits que votre application : il peut lire la page, envoyer des requêtes au nom de la victime, modifier l'affichage ou détourner un formulaire. C'est l'une des failles web les plus anciennes et les plus répandues, et elle se prévient très bien quand on comprend son origine : des données traitées comme du code.

## Ce que vous allez apprendre

- Pourquoi une donnée affichée sans encodage devient du code exécutable.
- La différence entre XSS réfléchi, stocké et basé sur le DOM.
- Comment l'encodage de sortie selon le contexte neutralise la faille.
- Les pièges des frameworks modernes comme React.
- Le rôle de la Content Security Policy en défense complémentaire.

## Le mécanisme : des données qui deviennent du code

Le navigateur ne fait aucune différence entre le HTML écrit par le développeur et celui qui provient d'une donnée utilisateur : tout arrive dans la même page. Si une valeur saisie par un utilisateur est insérée telle quelle dans le HTML, ses balises sont interprétées.

```javascript
// Vulnérable : la recherche est insérée sans encodage
app.get("/recherche", (req, res) => {
  res.send(`<h1>Résultats pour : ${req.query.q}</h1>`);
});
```

Avec la valeur classique `<script>alert(1)</script>` dans le paramètre `q`, le navigateur affiche une boîte de dialogue : la preuve qu'un script arbitraire s'exécute. Un attaquant n'a plus qu'à envoyer le lien piégé à une victime.

> [!definition] Encodage de sortie (output encoding) : transformation des caractères spéciaux d'une donnée pour qu'ils soient affichés comme du texte et non interprétés. En HTML, `<` devient `&lt;`, `>` devient `&gt;`, `"` devient `&quot;`.

L'OWASP classe le XSS dans la catégorie **A03:2021 – Injection** de son [Top 10](/blog/owasp-top-10-explique).

## Trois familles de XSS

- **XSS réfléchi** : la donnée malveillante est dans la requête (paramètre d'URL, champ de formulaire) et renvoyée immédiatement dans la réponse. Il faut amener la victime à cliquer sur un lien.
- **XSS stocké** : la donnée est enregistrée (commentaire, nom de profil, message de support) puis affichée à d'autres utilisateurs. C'est la forme la plus dangereuse, car chaque visiteur de la page est touché sans action particulière.
- **XSS basé sur le DOM** : la faille est entièrement côté client. Du JavaScript lit une source contrôlable (fragment d'URL, `postMessage`, stockage local) et l'écrit dans un « puits » dangereux comme `innerHTML`.

```javascript
// Vulnérable : le fragment d'URL est injecté comme du HTML
const nom = decodeURIComponent(location.hash.slice(1));
document.getElementById("bienvenue").innerHTML = `Bonjour ${nom}`;

// Corrigé : textContent n'interprète jamais le HTML
document.getElementById("bienvenue").textContent = `Bonjour ${nom}`;
```

> [!exemple] Un outil de support client affiche aux agents le nom saisi par le client à l'ouverture d'un ticket. Le nom est inséré en HTML sans encodage. Un client malveillant saisit un nom contenant une balise de script : dès qu'un agent ouvre le ticket, le script s'exécute dans sa session, avec ses droits d'agent. Il peut alors consulter d'autres tickets ou modifier des adresses e-mail de clients. Le problème n'est pas l'interface publique, mais un back-office jugé « interne » et donc moins protégé.

## La défense principale : encoder selon le contexte

La règle centrale, détaillée dans l'[aide-mémoire OWASP sur la prévention du XSS](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html), est d'**encoder chaque donnée au moment de l'afficher**, avec l'encodage adapté à l'endroit où elle est insérée :

- dans le corps HTML : encodage des entités HTML ;
- dans un attribut : encodage d'attribut, et toujours entre guillemets ;
- dans une URL : encodage d'URL, et vérification du schéma (`https:` uniquement, jamais `javascript:`) ;
- dans du JavaScript : éviter autant que possible, sinon transmettre les données en JSON via un attribut `data-` ou un bloc `application/json`.

Les moteurs de gabarits modernes (Jinja2, Twig, EJS avec `<%= %>`, Handlebars avec `{{ }}`) encodent automatiquement le HTML. La version corrigée de l'exemple précédent :

```javascript
import escapeHtml from "escape-html";

app.get("/recherche", (req, res) => {
  const q = String(req.query.q ?? "");
  res.send(`<h1>Résultats pour : ${escapeHtml(q)}</h1>`);
});
```

> [!attention] Filtrer l'entrée en supprimant les balises `<script>` ne suffit pas : il existe de nombreuses autres façons d'exécuter du code (attributs d'événement, URL `javascript:`, balises SVG). La validation des entrées est utile, mais c'est l'encodage à la sortie qui protège.

## Les frameworks modernes et leurs échappatoires

React, Vue ou Angular encodent par défaut les valeurs insérées dans les gabarits. C'est une excellente protection, à condition de ne pas la contourner :

```typescript
// Vulnérable : le HTML fourni par l'utilisateur est injecté tel quel
<div dangerouslySetInnerHTML={{ __html: commentaire.contenu }} />

// Corrigé : afficher du texte...
<div>{commentaire.contenu}</div>

// ...ou, si du HTML riche est nécessaire, le nettoyer avec une liste blanche
import DOMPurify from "dompurify";
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(commentaire.contenu) }} />
```

Restent à surveiller : les attributs `href` alimentés par l'utilisateur (vérifiez le schéma), le rendu de Markdown en HTML (utilisez une bibliothèque qui nettoie la sortie) et toute manipulation directe du DOM avec `innerHTML`, `outerHTML`, `insertAdjacentHTML` ou `document.write`.

## Les défenses en profondeur

L'encodage est la protection principale, mais une erreur arrive toujours un jour. D'autres couches limitent les dégâts :

- **Content Security Policy** : un en-tête qui indique au navigateur quelles sources de scripts sont autorisées. Une politique stricte à base de nonces empêche l'exécution de scripts injectés en ligne. Voir le cours [Content Security Policy](/blog/content-security-policy).
- **Cookies `HttpOnly`** : un cookie de session marqué `HttpOnly` n'est pas lisible par JavaScript, ce qui empêche son vol direct par un script injecté (voir [les cookies sécurisés](/blog/cookies-securises)). Le script peut toutefois toujours agir dans la page au nom de l'utilisateur.
- **Trusted Types** : une API des navigateurs basés sur Chromium qui bloque les affectations dangereuses comme `innerHTML` si elles ne passent pas par une fonction de nettoyage approuvée. La documentation est sur [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API).

> [!attention] Pour vous entraîner à repérer des XSS, utilisez des laboratoires conçus pour cela, comme [OWASP Juice Shop](https://owasp.org/www-project-juice-shop/) ou la [Web Security Academy de PortSwigger](https://portswigger.net/web-security/cross-site-scripting). Tester un site sans autorisation écrite est illégal en France (Code pénal, article 323-1), y compris avec un simple `alert(1)`.

## À retenir

- Le XSS survient quand une donnée est insérée dans une page sans être encodée : elle devient du code.
- Le XSS stocké touche tous les visiteurs d'une page, y compris les administrateurs d'un back-office.
- La défense principale est l'encodage de sortie adapté au contexte (HTML, attribut, URL, JavaScript).
- Les frameworks protègent par défaut, sauf quand on utilise `dangerouslySetInnerHTML`, `v-html` ou `innerHTML`.
- CSP stricte, cookies `HttpOnly` et nettoyage par liste blanche (DOMPurify) complètent la défense.

## Quiz

?? Quelle est la défense principale contre le XSS ?
- [ ] Supprimer les balises <script> des entrées utilisateur
- [x] Encoder chaque donnée à l'affichage selon son contexte
- [ ] Passer le site en HTTPS
=> L'encodage de sortie fait apparaître la donnée comme du texte ; le filtrage des balises est facilement contourné et HTTPS ne protège pas du XSS.

?? Pourquoi le XSS stocké est-il souvent plus grave que le XSS réfléchi ?
- [ ] Parce qu'il ne fonctionne que sur les anciens navigateurs
- [x] Parce que le script est exécuté chez tous les utilisateurs qui consultent la page, sans lien piégé
- [ ] Parce qu'il nécessite un accès administrateur pour être exploité
=> La donnée malveillante est enregistrée puis servie à chaque visiteur, y compris aux comptes à privilèges.

?? Dans une application React, quel code présente un risque de XSS ?
- [ ] <p>{utilisateur.nom}</p>
- [ ] <p title={utilisateur.nom}>Profil</p>
- [x] <div dangerouslySetInnerHTML={{ __html: utilisateur.bio }} />
=> React encode les valeurs insérées dans le JSX, sauf lorsqu'on injecte volontairement du HTML brut avec dangerouslySetInnerHTML.

?? Que protège exactement l'attribut HttpOnly d'un cookie de session ?
- [ ] Il empêche toute exécution de script injecté
- [x] Il empêche JavaScript de lire le cookie, donc son vol direct par un script
- [ ] Il chiffre le contenu du cookie
=> HttpOnly limite l'impact d'un XSS en protégeant le cookie, mais le script injecté peut toujours agir dans la page au nom de l'utilisateur.
