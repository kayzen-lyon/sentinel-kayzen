---
title: Les injections SQL et les requêtes préparées
description: Comment une simple concaténation de chaînes ouvre votre base de données, et pourquoi les requêtes paramétrées règlent le problème à la racine.
track: developpeurs
level: avance
order: 4
minutes: 7
updated: 2026-11-22
tags: injection SQL, requêtes préparées, ORM, base de données, OWASP
---
L'injection SQL est une faille connue depuis plus de vingt-cinq ans, et pourtant elle apparaît encore régulièrement dans des applications récentes. Sa cause est toujours la même : une donnée fournie par l'utilisateur est collée dans le texte d'une requête SQL, et la base de données finit par l'exécuter comme une instruction. Selon les droits du compte utilisé, l'impact va de la lecture de données confidentielles à la modification ou la suppression de tables entières. La correction, elle, est simple et connue : les requêtes paramétrées.

## Ce que vous allez apprendre

- Pourquoi la concaténation de chaînes dans une requête SQL est dangereuse.
- Comment les requêtes préparées séparent le code SQL des données.
- Les cas que les paramètres ne couvrent pas : noms de colonnes, tri, ORM mal utilisés.
- Les défenses complémentaires : moindre privilège, gestion des erreurs, validation.

## Le problème : mélanger code et données

Prenons une route de connexion écrite rapidement :

```javascript
// Vulnérable : les entrées sont concaténées dans la requête
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const sql =
    "SELECT id FROM users WHERE email = '" + email +
    "' AND password_hash = '" + hash(password) + "'";
  const result = await db.query(sql);
  if (result.rows.length > 0) return ouvrirSession(req, res, result.rows[0].id);
  res.status(401).send("Identifiants invalides");
});
```

Si un utilisateur saisit l'adresse `admin@exemple.fr' OR '1'='1' --`, la requête devient :

```sql
SELECT id FROM users
WHERE email = 'admin@exemple.fr' OR '1'='1' --' AND password_hash = '...'
```

L'apostrophe ferme la chaîne, `OR '1'='1'` rend la condition toujours vraie, et `--` transforme le reste de la ligne en commentaire. La vérification du mot de passe disparaît. Le développeur voulait transmettre une **valeur** ; l'utilisateur a fourni du **code**.

> [!definition] Injection : faille dans laquelle une donnée non fiable est interprétée comme une commande par un interpréteur (SQL, système, LDAP, gabarit…). L'OWASP la classe en **A03:2021 – Injection** dans son [Top 10](/blog/owasp-top-10-explique).

Le formulaire de connexion n'est qu'un exemple : tout paramètre qui finit dans une requête est concerné (recherche, filtres, identifiants dans l'URL, en-têtes HTTP, valeurs lues dans un fichier importé).

## La solution : les requêtes paramétrées

Une **requête paramétrée** (ou préparée) envoie à la base de données deux éléments séparés : le texte de la requête, avec des emplacements réservés, et les valeurs. La base analyse d'abord la structure, puis insère les valeurs comme de simples données. Quel que soit leur contenu, elles ne peuvent plus modifier la logique de la requête.

Avec `node-postgres` (PostgreSQL) :

```javascript
// Corrigé : la requête et les valeurs voyagent séparément
const result = await db.query(
  "SELECT id, password_hash FROM users WHERE email = $1",
  [email]
);
const user = result.rows[0];
if (user && (await argon2.verify(user.password_hash, password))) {
  return ouvrirSession(req, res, user.id);
}
res.status(401).send("Identifiants invalides");
```

En Python, avec `psycopg` :

```python
# Vulnérable : f-string dans la requête
cur.execute(f"SELECT * FROM commandes WHERE client_id = {client_id}")

# Corrigé : paramètre transmis séparément
cur.execute("SELECT * FROM commandes WHERE client_id = %s", (client_id,))
```

> [!attention] En Python, `%s` dans `cur.execute(requete, params)` est un paramètre géré par le pilote. Écrire `cur.execute(requete % params)` revient exactement à concaténer : c'est vulnérable. La différence tient à une virgule.

La syntaxe des emplacements varie selon le pilote (`$1`, `?`, `%s`, `:nom`), mais le principe reste le même. L'[aide-mémoire OWASP sur la prévention des injections SQL](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html) détaille les options par langage.

## Les ORM ne protègent pas de tout

Les ORM (Prisma, Sequelize, SQLAlchemy, Django ORM…) génèrent des requêtes paramétrées par défaut, ce qui élimine la plupart des risques. Mais ils proposent tous une échappatoire pour écrire du SQL brut, et c'est là que les failles réapparaissent.

```typescript
// Vulnérable : la variante "Unsafe" accepte une chaîne construite
await prisma.$queryRawUnsafe(`SELECT * FROM produits WHERE nom LIKE '%${terme}%'`);

// Corrigé : le gabarit étiqueté transforme les variables en paramètres
await prisma.$queryRaw`SELECT * FROM produits WHERE nom LIKE ${"%" + terme + "%"}`;
```

Méfiez-vous de toute fonction dont le nom contient `raw`, `unsafe`, `literal` ou `execute`, et lisez sa documentation pour savoir si les variables sont paramétrées.

## Ce que les paramètres ne couvrent pas

Les emplacements réservés ne fonctionnent que pour des **valeurs**. On ne peut pas paramétrer un nom de table, un nom de colonne ou un sens de tri (`ASC`/`DESC`). Ces éléments, souvent issus d'options de tri ou de filtres dans l'interface, doivent être contrôlés par une **liste blanche** :

```javascript
const COLONNES_TRI = { date: "created_at", prix: "price", nom: "name" };
const colonne = COLONNES_TRI[req.query.tri] ?? "created_at";
const sens = req.query.sens === "asc" ? "ASC" : "DESC";

const sql = `SELECT id, name, price FROM produits ORDER BY ${colonne} ${sens} LIMIT $1`;
await db.query(sql, [20]);
```

Seules des chaînes écrites par le développeur peuvent ainsi atteindre la requête ; la valeur de l'utilisateur ne sert qu'à choisir parmi elles.

> [!exemple] Une boutique en ligne utilise des requêtes paramétrées partout, sauf pour le tri des produits, où le paramètre `?tri=` est inséré directement après `ORDER BY`. Lors d'un audit autorisé, l'auditeur montre qu'une expression conditionnelle placée dans ce paramètre change l'ordre des résultats selon qu'une condition sur la base est vraie ou fausse. En répétant l'opération, on peut déduire des informations caractère par caractère : c'est une injection dite « à l'aveugle ». La correction tient en trois lignes de liste blanche.

## Les défenses complémentaires

Les requêtes paramétrées règlent le problème à la racine. D'autres mesures limitent l'impact si une erreur subsiste :

- **Moindre privilège** : le compte de base de données de l'application ne doit avoir que les droits nécessaires. Pas de droit d'administration, pas d'accès aux tables d'autres applications, et un compte en lecture seule pour les services qui ne font que lire.
- **Messages d'erreur génériques** : n'affichez jamais l'erreur SQL brute à l'utilisateur. Elle révèle la structure de la base et facilite l'attaque. Journalisez-la côté serveur.
- **Validation des entrées** : un identifiant doit être un entier, une date doit être une date. La validation (par exemple avec Zod ou Pydantic) ne remplace pas les paramètres, mais réduit la surface d'attaque.
- **Analyse du code** : les outils d'analyse statique repèrent bien les concaténations dans les requêtes. Intégrez-les à votre intégration continue.

> [!attention] Pour vous exercer, utilisez les laboratoires dédiés de la [Web Security Academy de PortSwigger](https://portswigger.net/web-security/sql-injection) ou [OWASP Juice Shop](https://owasp.org/www-project-juice-shop/). Envoyer une apostrophe dans le formulaire d'un site réel pour « voir ce qui se passe » est déjà une tentative d'accès frauduleux, illégale sans autorisation écrite (Code pénal, article 323-1).

## À retenir

- L'injection SQL survient quand une donnée utilisateur est concaténée dans le texte d'une requête.
- Les requêtes paramétrées séparent le code SQL des valeurs : c'est la défense principale, et elle est simple.
- Les ORM protègent par défaut, sauf dans leurs fonctions de SQL brut.
- Noms de colonnes, tables et sens de tri ne se paramètrent pas : utilisez une liste blanche.
- Moindre privilège et messages d'erreur génériques limitent l'impact d'une erreur résiduelle.

## Quiz

?? Pourquoi la saisie admin@exemple.fr' OR '1'='1' -- contourne-t-elle une requête concaténée ?
- [ ] Parce qu'elle contient un mot de passe administrateur
- [x] Parce que l'apostrophe ferme la chaîne et que le reste est interprété comme du SQL
- [ ] Parce que la base de données ignore les apostrophes
=> La donnée sort de la chaîne prévue et devient du code : la condition est toujours vraie et la suite est commentée.

?? Quelle est la défense principale contre l'injection SQL ?
- [ ] Échapper manuellement les apostrophes
- [ ] Masquer les messages d'erreur
- [x] Utiliser des requêtes paramétrées
=> Les paramètres transmettent les valeurs séparément du code SQL ; masquer les erreurs ne fait que compliquer l'attaque.

?? Comment sécuriser un paramètre de tri qui choisit la colonne du ORDER BY ?
- [ ] Le passer comme paramètre $1 de la requête
- [x] Le comparer à une liste blanche de colonnes autorisées
- [ ] Supprimer les espaces de la valeur reçue
=> Un nom de colonne ne peut pas être paramétré : seule une correspondance avec des valeurs écrites par le développeur est sûre.

?? En Python, lequel de ces appels est sûr ?
- [ ] cur.execute("SELECT * FROM t WHERE id = %s" % id_client)
- [x] cur.execute("SELECT * FROM t WHERE id = %s", (id_client,))
- [ ] cur.execute(f"SELECT * FROM t WHERE id = {id_client}")
=> Seul le second transmet la valeur au pilote comme paramètre ; les deux autres construisent la chaîne avant l'envoi.
