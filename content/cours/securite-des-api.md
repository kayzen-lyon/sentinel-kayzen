---
title: Sécuriser une API REST ou GraphQL
description: Autorisation par objet et par propriété, limitation des ressources, inventaire des versions : les risques de l'OWASP API Security Top 10 2023 et leurs parades.
track: developpeurs
level: avance
order: 10
minutes: 7
updated: 2026-11-22
tags: API, REST, GraphQL, OWASP API Security, autorisation, limitation de débit
---
Les applications modernes reposent presque toutes sur des API : une application web monopage, une application mobile ou un partenaire appellent les mêmes points d'accès. Une API expose directement votre logique métier et vos données, sans l'interface qui, dans une application classique, guide et limite l'utilisateur. Tout ce que l'API accepte, un attaquant peut l'envoyer ; tout ce qu'elle renvoie, il peut le lire. C'est pourquoi l'OWASP maintient un classement dédié aux risques des API.

## Ce que vous allez apprendre

- Les dix catégories de l'OWASP API Security Top 10 2023.
- Comment appliquer l'autorisation au niveau de l'objet, de la propriété et de la fonction.
- Pourquoi une API doit renvoyer le minimum de données.
- Les risques propres à GraphQL et comment les limiter.
- L'importance de l'inventaire des API et des anciennes versions.

## L'OWASP API Security Top 10 2023

L'[OWASP API Security Project](https://owasp.org/www-project-api-security/) publie ce classement, dont l'édition 2023 comprend :

1. **API1 – Broken Object Level Authorization** : accès à des objets d'autres utilisateurs (l'équivalent API de l'[IDOR](/blog/controle-acces-idor)).
2. **API2 – Broken Authentication** : mécanismes d'authentification faibles ou contournables.
3. **API3 – Broken Object Property Level Authorization** : lecture ou modification de propriétés non autorisées.
4. **API4 – Unrestricted Resource Consumption** : absence de limites sur les requêtes, la taille ou le coût des opérations.
5. **API5 – Broken Function Level Authorization** : accès à des fonctions réservées à d'autres rôles.
6. **API6 – Unrestricted Access to Sensitive Business Flows** : automatisation abusive d'un parcours métier (achat, réservation, inscription).
7. **API7 – Server Side Request Forgery** : voir le cours sur la [SSRF](/blog/ssrf).
8. **API8 – Security Misconfiguration** : configuration par défaut, CORS trop permissif, messages d'erreur détaillés.
9. **API9 – Improper Inventory Management** : versions anciennes ou non documentées toujours en ligne.
10. **API10 – Unsafe Consumption of APIs** : confiance excessive dans les données renvoyées par des API tierces.

Les sections suivantes détaillent les risques les plus fréquents en pratique.

## Autoriser à trois niveaux

Une API doit répondre à trois questions pour chaque requête :

- **Fonction** : cet utilisateur a-t-il le droit d'appeler cette opération ? (`DELETE /api/users/{id}` est-il réservé aux administrateurs ?)
- **Objet** : a-t-il le droit d'agir sur cet objet précis ?
- **Propriété** : a-t-il le droit de lire ou de modifier chacun des champs concernés ?

Le troisième niveau est souvent oublié. Une API qui renvoie l'objet complet de la base de données laisse le client « filtrer » l'affichage, mais toutes les données circulent sur le réseau.

```typescript
// Vulnérable : renvoie toutes les colonnes, dont l'empreinte du mot de passe,
// l'adresse e-mail et des champs internes
app.get("/api/users/:id", exigerConnexion, async (req, res) => {
  const user = await db.user.findUnique({ where: { id: req.params.id } });
  res.json(user);
});

// Corrigé : sélection explicite des champs publics
app.get("/api/users/:id", exigerConnexion, async (req, res) => {
  const user = await db.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, pseudo: true, avatarUrl: true, bio: true },
  });
  if (!user) return res.status(404).end();
  res.json(user);
});
```

> [!astuce] Définissez des schémas de réponse explicites (par exemple avec Zod, ou les sérialiseurs de votre framework) plutôt que de renvoyer des objets de base de données. Un nouveau champ ajouté à une table ne fuira pas ainsi automatiquement dans l'API.

Pour l'écriture, le même principe s'applique : un schéma strict des champs modifiables évite l'affectation de masse, où un utilisateur ajoute `"role": "admin"` au corps de la requête.

## Limiter la consommation de ressources

Sans limite, une API peut être abusée pour épuiser votre serveur, votre base de données ou votre budget (appels facturés à un fournisseur d'e-mails, de SMS ou d'IA). Les limites à poser :

- **Débit** par utilisateur, par clé et par adresse IP, avec une réponse `429 Too Many Requests`.
- **Pagination obligatoire** avec une taille maximale (`limit` plafonné côté serveur).
- **Taille des requêtes** : corps, fichiers téléversés, nombre d'éléments dans un tableau.
- **Délais d'exécution** sur les opérations longues.
- **Flux sensibles** : pour les parcours métier attractifs (réservation de places en nombre limité, création de comptes), ajoutez des contrôles spécifiques comme une limite par compte vérifié.

> [!exemple] Une application de covoiturage expose `POST /api/verification/sms`, qui envoie un code à un numéro fourni. Aucune limite n'existe par numéro ni par compte. Des robots appellent la route des milliers de fois vers des numéros surtaxés à l'étranger, ce qui génère une facture importante chez le fournisseur de SMS. La correction combine une limite par compte et par numéro, une liste de pays autorisés et une alerte sur le volume d'envoi.

## Les spécificités de GraphQL

GraphQL expose un point d'accès unique et laisse le client composer sa requête. Cette souplesse impose des protections spécifiques :

- **Autorisation dans chaque résolveur** : comme les données sont accessibles par plusieurs chemins (un utilisateur via ses commandes, une commande via son client), l'autorisation doit être vérifiée au niveau de l'objet et du champ, pas seulement à l'entrée.
- **Limites de profondeur et de complexité** : une requête imbriquée sur des relations circulaires peut demander des millions d'objets.
- **Regroupement de requêtes** : le *batching* et les alias permettent d'envoyer de nombreuses opérations dans une seule requête HTTP, ce qui contourne une limitation de débit naïve. Comptez les opérations, pas les requêtes.
- **Introspection** : en production, désactivez-la si votre API n'est pas publique. Ce n'est pas une protection en soi, mais cela réduit l'exposition.

```typescript
// Autorisation au niveau du résolveur de champ
const resolvers = {
  User: {
    email: (parent, _args, ctx) =>
      ctx.user?.id === parent.id || ctx.user?.role === "admin" ? parent.email : null,
  },
  Query: {
    commande: async (_parent, { id }, ctx) =>
      db.commande.findFirst({ where: { id, clientId: ctx.user.id } }),
  },
};
```

## Inventaire, configuration et API tierces

Les failles ne viennent pas toujours du code récent :

- **Inventaire** : une ancienne version `/api/v1` restée en ligne, sans les corrections de la `v2`, est une cible classique. Tenez une liste de toutes les API exposées, de leurs versions et environnements, et retirez ce qui n'est plus utilisé. Une documentation OpenAPI à jour aide à cet inventaire.
- **Configuration** : CORS limité aux origines connues, messages d'erreur génériques, en-têtes de sécurité (voir [les en-têtes de sécurité HTTP](/blog/en-tetes-de-securite-http)) et dépendances à jour (voir [les dépendances vulnérables](/blog/dependances-et-composants-vulnerables)).
- **API tierces** : validez les données reçues d'un partenaire comme vous valideriez une saisie utilisateur, imposez HTTPS et des délais, et ne suivez pas aveuglément les redirections.

> [!attention] Pour vous entraîner, l'OWASP propose crAPI, une API volontairement vulnérable à installer chez vous, et la [Web Security Academy de PortSwigger](https://portswigger.net/web-security/api-testing) contient des laboratoires sur les API et [GraphQL](https://portswigger.net/web-security/graphql). Interroger l'API d'un service réel en dehors de son usage prévu, sans autorisation écrite ou hors du périmètre d'un programme de bug bounty, est illégal (Code pénal, article 323-1).

## À retenir

- Une API expose directement données et logique métier : tout ce qu'elle accepte peut être envoyé, tout ce qu'elle renvoie peut être lu.
- Autorisez à trois niveaux : fonction, objet et propriété.
- Renvoyez uniquement les champs nécessaires, avec des schémas de réponse explicites.
- Limitez le débit, la pagination, la taille et le coût des opérations, y compris dans GraphQL.
- Tenez un inventaire des API et retirez les versions obsolètes.

## Quiz

?? Une API renvoie l'objet utilisateur complet, empreinte du mot de passe comprise, mais l'interface n'affiche que le pseudo. Quel risque est concerné ?
- [ ] API4 – Unrestricted Resource Consumption
- [x] API3 – Broken Object Property Level Authorization
- [ ] API9 – Improper Inventory Management
=> Des propriétés que l'utilisateur ne devrait pas voir sont renvoyées : le filtrage côté interface ne protège rien.

?? Pourquoi une limite de débit comptant les requêtes HTTP peut-elle être insuffisante pour une API GraphQL ?
- [ ] Parce que GraphQL n'utilise pas HTTP
- [x] Parce qu'une seule requête peut contenir de nombreuses opérations grâce aux alias et au regroupement
- [ ] Parce que GraphQL chiffre les requêtes
=> Il faut mesurer le nombre et la complexité des opérations, pas seulement le nombre de requêtes HTTP.

?? Une ancienne version /api/v1 non corrigée reste accessible en production. De quelle catégorie s'agit-il ?
- [x] API9 – Improper Inventory Management
- [ ] API1 – Broken Object Level Authorization
- [ ] API7 – Server Side Request Forgery
=> Les versions oubliées échappent aux corrections ; un inventaire tenu à jour permet de les retirer.

?? Où l'autorisation doit-elle être vérifiée dans une API GraphQL ?
- [ ] Uniquement à l'entrée du point d'accès unique
- [ ] Uniquement dans le client
- [x] Dans les résolveurs, au niveau des objets et des champs sensibles
=> Les mêmes données sont accessibles par plusieurs chemins du graphe : chaque résolveur doit appliquer les règles.
