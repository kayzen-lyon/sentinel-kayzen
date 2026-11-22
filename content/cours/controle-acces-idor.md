---
title: Contrôle d'accès défaillant et IDOR
description: Changer un identifiant dans une URL pour voir les données d'un autre : comprendre l'IDOR, première catégorie du Top 10 OWASP, et centraliser l'autorisation.
track: developpeurs
level: avance
order: 5
minutes: 7
updated: 2026-11-22
tags: contrôle d'accès, IDOR, autorisation, BOLA, OWASP
---
L'authentification répond à la question « qui êtes-vous ? ». Le contrôle d'accès, ou autorisation, répond à une autre question : « avez-vous le droit de faire ceci, sur cet objet précis ? ». Quand cette seconde vérification manque, un utilisateur parfaitement connecté peut lire, modifier ou supprimer les données des autres, souvent en changeant un simple nombre dans une requête. Ce n'est pas un hasard si l'OWASP place le contrôle d'accès défaillant en tête de son classement : c'est une faille fréquente, invisible pour les scanners automatiques et souvent grave.

## Ce que vous allez apprendre

- La différence entre authentification et autorisation.
- Ce qu'est une IDOR et pourquoi elle est si répandue.
- Comment vérifier la propriété d'un objet côté serveur, à chaque requête.
- Pourquoi les identifiants aléatoires ne suffisent pas.
- Comment centraliser et tester vos règles d'accès.

## Une catégorie en tête du classement

Dans le [Top 10 OWASP](/blog/owasp-top-10-explique) 2021, le contrôle d'accès défaillant est la catégorie **A01:2021 – Broken Access Control**. Côté API, l'OWASP API Security Top 10 2023 place la variante objet en première position : **API1:2023 – Broken Object Level Authorization** (BOLA). Les deux décrivent le même problème : le serveur fait confiance à ce que le client demande.

Les formes les plus courantes :

- **Accès horizontal** : un utilisateur accède aux données d'un autre utilisateur du même niveau (factures, messages, dossiers).
- **Accès vertical** : un utilisateur standard atteint une fonction réservée à un rôle supérieur (route d'administration, export, changement de rôle).
- **Modification de propriétés** : un utilisateur envoie un champ qu'il ne devrait pas pouvoir modifier, comme `role` ou `prix`.

> [!definition] IDOR (Insecure Direct Object Reference, référence directe non sécurisée à un objet) : l'application utilise un identifiant fourni par le client pour accéder à un objet, sans vérifier que l'utilisateur a le droit d'accéder à cet objet précis.

## Le scénario classique

```typescript
// Vulnérable : l'utilisateur est connecté, mais rien ne vérifie
// que la facture lui appartient
app.get("/api/factures/:id", exigerConnexion, async (req, res) => {
  const facture = await db.facture.findUnique({ where: { id: Number(req.params.id) } });
  if (!facture) return res.status(404).end();
  res.json(facture);
});
```

Un client connecté consulte `/api/factures/1041`, sa propre facture. Il remplace `1041` par `1040` : il obtient la facture d'un autre client. Le middleware `exigerConnexion` a bien fait son travail ; c'est la règle « cette facture appartient-elle à cet utilisateur ? » qui manque.

```typescript
// Corrigé : la propriété fait partie de la requête elle-même
app.get("/api/factures/:id", exigerConnexion, async (req, res) => {
  const facture = await db.facture.findFirst({
    where: { id: Number(req.params.id), clientId: req.user.id },
  });
  if (!facture) return res.status(404).end();
  res.json(facture);
});
```

Intégrer la condition de propriété **dans la requête** est plus robuste que de charger l'objet puis de comparer : impossible d'oublier la vérification, et l'utilisateur n'apprend même pas si l'objet existe. Répondre `404` plutôt que `403` évite aussi de confirmer l'existence d'identifiants.

> [!exemple] Une application de prise de rendez-vous médicaux permet de télécharger un justificatif via `/documents/telecharger?id=58213`. L'identifiant est séquentiel et le serveur ne vérifie que la présence d'une session. Un patient remarque qu'en changeant le numéro, il obtient le compte rendu d'un autre patient. Il s'agit de données de santé : l'éditeur doit notifier la violation à la CNIL et informer les personnes concernées. La correction consistait à ajouter une seule condition sur le propriétaire du document.

## Les identifiants aléatoires ne sont pas un contrôle d'accès

Remplacer les identifiants séquentiels par des UUID rend les objets plus difficiles à deviner, ce qui est une bonne pratique. Mais ce n'est pas une protection suffisante : les identifiants fuient dans les URL partagées, les journaux, les historiques de navigation, les e-mails transférés ou d'autres réponses de l'API. Un identifiant imprévisible réduit la probabilité d'exploitation ; seule une vérification côté serveur l'empêche.

> [!attention] Masquer un bouton dans l'interface n'est pas un contrôle d'accès. Toute requête peut être rejouée et modifiée avec les outils de développement du navigateur. La décision d'autoriser doit toujours être prise côté serveur.

## Les propriétés et les fonctions aussi

Le contrôle d'accès ne concerne pas seulement les objets. Deux autres pièges fréquents :

**L'affectation de masse** (mass assignment) : l'API copie tout le corps de la requête dans l'objet en base.

```typescript
// Vulnérable : un utilisateur peut envoyer { "role": "admin" }
await db.user.update({ where: { id: req.user.id }, data: req.body });

// Corrigé : seuls les champs autorisés sont acceptés
const ProfilModifiable = z.object({ nom: z.string().max(100), ville: z.string().max(100) }).strict();
const data = ProfilModifiable.parse(req.body);
await db.user.update({ where: { id: req.user.id }, data });
```

**Les fonctions réservées** : une route `/api/admin/export` protégée seulement par le fait qu'elle n'apparaît pas dans le menu. Chaque route sensible doit vérifier le rôle côté serveur.

## Centraliser et tester l'autorisation

Les contrôles d'accès échouent rarement parce que les développeurs ignorent le problème, mais parce qu'une vérification a été oubliée sur une route parmi cent. Quelques principes, détaillés dans l'[aide-mémoire OWASP sur l'autorisation](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) :

1. **Refus par défaut** : une route sans règle explicite doit être refusée, pas ouverte.
2. **Une seule couche d'autorisation** : regroupez les règles dans un module ou une politique réutilisable (`peutLireFacture(user, facture)`), plutôt que de les réécrire dans chaque contrôleur.
3. **Filtrer au niveau des données** : quand votre base le permet, des politiques de sécurité au niveau des lignes (Row Level Security dans PostgreSQL) ajoutent un filet de sécurité.
4. **Tests automatisés** : pour chaque route sensible, un test qui vérifie qu'un utilisateur B reçoit un refus en demandant l'objet de l'utilisateur A.

```typescript
it("refuse la facture d'un autre client", async () => {
  const res = await clientB.get(`/api/factures/${factureDeA.id}`);
  expect(res.status).toBe(404);
});
```

> [!attention] Pour vous entraîner sur les IDOR, utilisez [OWASP Juice Shop](https://owasp.org/www-project-juice-shop/) ou les laboratoires de [contrôle d'accès de PortSwigger](https://portswigger.net/web-security/access-control). Modifier un identifiant pour consulter les données d'un tiers sur un service réel constitue un accès frauduleux (Code pénal, article 323-1) ; en bug bounty, utilisez uniquement vos propres comptes de test.

## À retenir

- Être connecté ne donne pas le droit d'accéder à tous les objets : chaque accès doit être autorisé.
- Une IDOR survient quand le serveur utilise un identifiant du client sans vérifier la propriété.
- Intégrez la condition de propriété directement dans la requête en base.
- Les UUID compliquent l'exploitation mais ne remplacent pas une vérification côté serveur.
- Refus par défaut, règles centralisées et tests « utilisateur A contre utilisateur B » évitent les oublis.

## Quiz

?? Un utilisateur connecté obtient la facture d'un autre client en changeant l'identifiant dans l'URL. De quelle faille s'agit-il ?
- [ ] Une injection SQL
- [x] Une IDOR, ou contrôle d'accès défaillant au niveau objet
- [ ] Une faille d'authentification
=> L'utilisateur est bien authentifié ; c'est l'autorisation sur l'objet précis qui manque.

?? Remplacer les identifiants numériques par des UUID suffit-il à corriger une IDOR ?
- [ ] Oui, car un UUID est impossible à obtenir
- [x] Non, car les identifiants peuvent fuir et seule une vérification serveur empêche l'accès
- [ ] Oui, à condition d'utiliser HTTPS
=> Les UUID réduisent la devinabilité mais apparaissent dans les liens, journaux et réponses : la propriété doit être vérifiée.

?? Quelle approche protège contre l'affectation de masse ?
- [ ] Masquer le champ rôle dans le formulaire
- [ ] Vérifier le rôle uniquement dans le code JavaScript du navigateur
- [x] N'accepter côté serveur qu'une liste explicite de champs modifiables
=> Le client peut envoyer n'importe quel champ ; seul un schéma strict côté serveur filtre ce qui est réellement modifiable.

?? Quelle règle générale applique un bon système d'autorisation à une route sans règle explicite ?
- [x] Il la refuse par défaut
- [ ] Il l'autorise pour les utilisateurs connectés
- [ ] Il l'autorise si elle n'apparaît pas dans le menu
=> Le refus par défaut transforme un oubli en erreur visible plutôt qu'en faille silencieuse.
