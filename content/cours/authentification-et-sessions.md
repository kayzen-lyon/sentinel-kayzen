---
title: Authentification et sessions robustes
description: Hachage argon2id ou bcrypt, limitation des tentatives, régénération de session, cookies et JWT : construire une connexion qui résiste aux attaques courantes.
track: developpeurs
level: avance
order: 8
minutes: 7
updated: 2026-11-22
tags: authentification, sessions, argon2id, bcrypt, JWT, MFA
---
La page de connexion est la porte d'entrée de votre application, et c'est l'une des fonctionnalités les plus attaquées : essais automatisés de mots de passe, réutilisation d'identifiants volés ailleurs, vol de session. Une authentification robuste ne repose pas sur une seule mesure, mais sur une chaîne : stocker correctement les mots de passe, freiner les essais, protéger la session une fois l'utilisateur connecté, et proposer un second facteur. Chaque maillon faible suffit à rendre les autres inutiles.

## Ce que vous allez apprendre

- Comment stocker les mots de passe avec argon2id ou bcrypt, et pourquoi pas avec SHA-256.
- Comment limiter les attaques par force brute et par bourrage d'identifiants.
- Les règles de gestion d'une session : création, cookie, expiration, déconnexion.
- Les pièges courants des JWT.
- Comment sécuriser la réinitialisation de mot de passe.

## Stocker les mots de passe : hacher lentement

Un mot de passe ne doit jamais être stocké en clair, ni chiffré de façon réversible. On stocke une **empreinte** produite par une fonction de hachage conçue pour les mots de passe : lente, coûteuse en mémoire et salée. Ainsi, si la base fuit, chaque tentative de cassage coûte cher à l'attaquant.

> [!definition] Sel : valeur aléatoire propre à chaque utilisateur, combinée au mot de passe avant le hachage. Deux utilisateurs ayant le même mot de passe obtiennent des empreintes différentes, ce qui empêche les attaques par tables précalculées.

Les fonctions rapides comme MD5, SHA-1 ou SHA-256 sont faites pour vérifier l'intégrité de fichiers : elles permettent de tester des milliards de mots de passe par seconde sur du matériel courant. Elles sont inadaptées.

```javascript
// Vulnérable : hachage rapide et sans sel
const empreinte = crypto.createHash("sha256").update(motDePasse).digest("hex");
```

L'[aide-mémoire OWASP sur le stockage des mots de passe](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) recommande **argon2id** en premier choix, avec au minimum 19 Mio de mémoire, 2 itérations et 1 degré de parallélisme. **bcrypt** reste acceptable pour les systèmes existants, avec un facteur de coût d'au moins 10. Le sel est géré automatiquement par ces bibliothèques.

```python
# Corrigé, en Python avec argon2-cffi (argon2id par défaut)
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

ph = PasswordHasher()
empreinte = ph.hash(mot_de_passe)          # à l'inscription

def verifier(empreinte: str, saisi: str) -> bool:
    try:
        return ph.verify(empreinte, saisi)  # à la connexion
    except VerifyMismatchError:
        return False
```

> [!attention] bcrypt ne prend en compte que les 72 premiers octets du mot de passe. Si vous acceptez des phrases de passe très longues, préférez argon2id. Pour les conseils côté utilisateur, voir le cours [créer des mots de passe solides](/blog/mots-de-passe-solides).

## Freiner les essais automatisés

Deux attaques visent directement le formulaire de connexion :

- la **force brute** : essayer de nombreux mots de passe sur un compte ;
- le **bourrage d'identifiants** : essayer des couples e-mail et mot de passe issus de fuites d'autres sites, un essai par compte, sur des milliers de comptes.

Les parades se combinent :

1. **Limitation de débit** par compte et par adresse IP, avec des délais croissants après plusieurs échecs plutôt qu'un blocage définitif, qui permettrait à n'importe qui de bloquer un compte.
2. **Messages d'erreur identiques** : « Identifiants invalides » dans tous les cas, qu'il s'agisse d'un e-mail inconnu ou d'un mauvais mot de passe. La même règle vaut pour l'inscription et la réinitialisation, et le temps de réponse doit rester comparable.
3. **Vérification des mots de passe compromis** à l'inscription, en refusant ceux qui figurent dans des listes de fuites connues.
4. **Double authentification**, la mesure la plus efficace contre le bourrage d'identifiants (voir [la double authentification](/blog/double-authentification)). Les facteurs résistants à l'hameçonnage, comme les clés d'accès (passkeys, standard WebAuthn), sont à privilégier.

L'ANSSI publie des recommandations détaillées sur l'authentification multifacteur et les mots de passe, disponibles sur [cyber.gouv.fr](https://cyber.gouv.fr/).

## Gérer la session

Une fois l'utilisateur authentifié, la session devient l'élément à protéger : quiconque la possède est l'utilisateur. Les règles essentielles, détaillées dans l'[aide-mémoire OWASP sur la gestion des sessions](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) :

- **Identifiant aléatoire et long**, généré par le framework, jamais par vous.
- **Régénération à la connexion** : un nouvel identifiant doit être créé après l'authentification. Sinon, un attaquant qui a fait adopter un identifiant connu à la victime avant sa connexion récupère sa session : c'est la **fixation de session**.
- **Cookie protégé** : `HttpOnly`, `Secure`, `SameSite=Lax` ou `Strict` (voir [les cookies sécurisés](/blog/cookies-securises)).
- **Expiration** : un délai d'inactivité et une durée maximale absolue, plus courts pour les applications sensibles.
- **Déconnexion réelle** : la session doit être invalidée côté serveur, pas seulement supprimée du navigateur.

```javascript
// Corrigé : régénération de la session après une connexion réussie
app.post("/login", limiteurConnexion, async (req, res, next) => {
  const user = await verifierIdentifiants(req.body.email, req.body.password);
  if (!user) return res.status(401).send("Identifiants invalides");

  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.userId = user.id;
    res.redirect("/tableau-de-bord");
  });
});
```

> [!exemple] Une application SaaS conserve le même identifiant de session avant et après la connexion, et accepte un identifiant passé dans l'URL pour une ancienne intégration. Lors d'un audit autorisé, l'auditeur montre qu'un lien contenant un identifiant choisi à l'avance, envoyé à un utilisateur, permet de partager sa session dès qu'il se connecte. Deux lignes corrigent le problème : refuser les identifiants dans l'URL et régénérer la session à la connexion.

## Les pièges des JWT

Les JWT (JSON Web Tokens) sont des jetons signés qui contiennent des informations sur l'utilisateur. Ils sont utiles pour les API, mais souvent mal employés :

- **Vérifier la signature avec un algorithme imposé** : configurez explicitement l'algorithme attendu côté serveur, et refusez `none`. Ne laissez jamais l'en-tête du jeton choisir.
- **Clé secrète robuste** : longue, aléatoire, stockée hors du code (voir [les secrets dans le code](/blog/secrets-dans-le-code)).
- **Durée de vie courte** et vérification de `exp`, `iss` et `aud`.
- **Révocation** : un JWT reste valide jusqu'à son expiration, même après la déconnexion. Prévoyez des jetons courts avec un jeton de rafraîchissement révocable.
- **Stockage** : un jeton placé dans `localStorage` est lisible par n'importe quel script en cas de XSS. Un cookie `HttpOnly` est généralement préférable pour une application web.

```javascript
const charge = jwt.verify(jeton, process.env.JWT_SECRET, {
  algorithms: ["HS256"],
  issuer: "https://app.exemple.fr",
  audience: "api",
});
```

## La réinitialisation du mot de passe

C'est une seconde porte d'entrée, souvent moins protégée que la première. Le lien envoyé par e-mail doit contenir un jeton aléatoire, à usage unique, valable peu de temps (de l'ordre de quelques dizaines de minutes), et stocké haché en base. Construisez l'URL du lien à partir d'une configuration fixe, jamais à partir de l'en-tête `Host` de la requête, qui peut être manipulé. Après la réinitialisation, invalidez les autres sessions ouvertes.

> [!attention] Pour vous exercer aux failles d'authentification, utilisez les laboratoires [authentification de PortSwigger](https://portswigger.net/web-security/authentication) ou [OWASP Juice Shop](https://owasp.org/www-project-juice-shop/). Tenter des mots de passe sur le compte d'autrui est un accès frauduleux, illégal sans autorisation écrite (Code pénal, article 323-1).

## À retenir

- Hachez les mots de passe avec argon2id (ou bcrypt pour l'existant), jamais avec SHA-256 ou MD5.
- Limitez le débit, uniformisez les messages d'erreur et proposez la double authentification.
- Régénérez la session à la connexion et invalidez-la côté serveur à la déconnexion.
- Pour les JWT : algorithme imposé, durée courte, vérification des champs et stratégie de révocation.
- La réinitialisation exige un jeton aléatoire, unique, court et un lien construit côté serveur.

## Quiz

?? Quelle fonction est adaptée au stockage des mots de passe ?
- [ ] SHA-256 avec un sel
- [x] argon2id
- [ ] Un chiffrement AES réversible
=> argon2id est conçu pour être lent et coûteux en mémoire ; SHA-256 est trop rapide et un chiffrement réversible expose tous les mots de passe si la clé fuit.

?? Pourquoi faut-il régénérer l'identifiant de session après la connexion ?
- [ ] Pour accélérer le chargement de la page
- [x] Pour empêcher la fixation de session, où l'attaquant connaît l'identifiant à l'avance
- [ ] Pour que l'utilisateur reste connecté plus longtemps
=> Un nouvel identifiant après authentification rend inutile tout identifiant connu ou imposé avant la connexion.

?? Quel message afficher quand une connexion échoue ?
- [ ] « Cette adresse e-mail n'existe pas »
- [ ] « Mot de passe incorrect pour ce compte »
- [x] « Identifiants invalides », quel que soit le cas
=> Un message unique empêche de deviner quelles adresses possèdent un compte.

?? Lors de la vérification d'un JWT, quelle pratique est indispensable ?
- [x] Imposer côté serveur la liste des algorithmes acceptés
- [ ] Lire l'algorithme indiqué dans l'en-tête du jeton
- [ ] Ignorer la date d'expiration pour éviter les déconnexions
=> Laisser le jeton choisir l'algorithme ouvre la porte à des contournements de signature, comme l'algorithme none.
