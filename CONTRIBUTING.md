# Contribuer à Sentinel

Merci de votre intérêt ! Sentinel est un projet **open source** (AGPL-3.0) et les
contributions sont les bienvenues.

## Démarrer

```bash
npm install
npm run dev        # http://localhost:3000
```

Prérequis : Node.js 22+.

## Avant d'ouvrir une pull request

Faites tourner localement la même chaîne que la CI :

```bash
npm run lint        # ESLint + eslint-plugin-security
npx tsc --noEmit    # vérification de types
npm test            # tests unitaires
npm run build       # build de production
```

Les quatre doivent passer. `npm run lint:fix` corrige automatiquement ce qui peut
l'être.

## Style et périmètre

- **TypeScript strict.** Pas de `any` non justifié.
- **Changements chirurgicaux** : une PR = un sujet. Ne reformatez pas du code
  adjacent non concerné.
- Respectez le style existant (le lint le fait respecter).
- Ajoutez un **test** pour toute correction de bug ou nouvelle logique de sécurité
  (voir `tests/unit.test.ts`).

## Sécurité

- Toute entrée réseau est **hostile** : validez, et passez par `lib/ssrf.ts` pour
  toute requête sortante vers une cible fournie par l'utilisateur.
- Ne commitez jamais de secret. gitleaks tourne en CI ; en cas de fuite, le secret
  doit être **révoqué**, pas seulement retiré de l'historique.
- Une vulnérabilité se signale en privé — voir [`SECURITY.md`](SECURITY.md), pas
  une issue publique.

## Messages de commit

Format conventionnel : `type(scope): résumé` (`feat`, `fix`, `docs`, `chore`,
`refactor`, `test`, `ci`). Exemple : `fix(scanner): durcit le parsing des bannières`.

## Licence des contributions

En contribuant, vous acceptez que votre travail soit distribué sous la licence
**AGPL-3.0** du projet.
