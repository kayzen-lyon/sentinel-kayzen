# Format d'un cours (blog Sentinel)

Un cours = un fichier `content/cours/<slug>.md` (slug en minuscules, mots séparés par des tirets,
sans accents). Ce fichier `FORMAT.md` est ignoré par le site.

## 1. En-tête (obligatoire, entre deux lignes `---`)

```
---
title: Créer des mots de passe solides et ne plus jamais les oublier
description: Une phrase de 120 à 160 caractères qui donne envie de lire (sert aussi pour Google).
track: fondamentaux
level: debutant
order: 2
minutes: 8
updated: 2026-11-22
tags: mots de passe, gestionnaire, authentification
---
```

- `track` (parcours) : `fondamentaux` | `entreprise` | `site-web` | `developpeurs`
- `level` : `debutant` | `intermediaire` | `avance`
- `order` : position dans le parcours (1, 2, 3…)
- `minutes` : temps de lecture estimé (environ 200 mots par minute)

## 2. Corps (Markdown restreint)

Seuls ces éléments sont reconnus :

- `## Titre de section` et `### Sous-titre` (jamais de `#` seul : le titre vient de l'en-tête)
- paragraphes (lignes séparées par une ligne vide)
- listes à puces `- élément` et listes numérotées `1. élément` (un seul niveau)
- `**gras**`, `` `code` `` et liens `[texte](https://…)` (liens externes vers des sources fiables
  uniquement : ANSSI, CNIL, cybermalveillance.gouv.fr, OWASP, MDN, etc.) ou internes `[texte](/blog/autre-slug)`
- blocs de code délimités par trois accents graves, avec la langue : ```` ```bash ```` … ```` ``` ````
- encadrés : une ligne commençant par `> ` puis un type entre crochets :
  - `> [!astuce] Texte…` (bon réflexe)
  - `> [!attention] Texte…` (piège, risque)
  - `> [!exemple] Texte…` (cas concret)
  - `> [!definition] Terme : explication…`

## 3. Sections imposées, dans cet ordre

1. Un paragraphe d'introduction (sans titre) : pourquoi ce sujet compte, en langage simple.
2. `## Ce que vous allez apprendre` : liste de 3 à 5 objectifs.
3. Le contenu : 3 à 6 sections `##`, avec au moins un encadré `[!exemple]` concret et réaliste.
4. `## À retenir` : liste de 3 à 6 points.
5. `## Quiz` : 3 à 5 questions au format ci-dessous.

## 4. Quiz

```
?? Texte de la question
- [ ] Mauvaise réponse
- [x] Bonne réponse (une seule)
- [ ] Mauvaise réponse
=> Explication courte de la bonne réponse.
```

Une ligne vide entre deux questions.

## 5. Règles de rédaction

- Français, accents corrects, vouvoiement, phrases courtes, jargon expliqué à la première occurrence.
- Texte 100 % original (ne recopier aucune source ; citer les références officielles par lien).
- Exactitude : uniquement des faits vérifiables et à jour. Pas de chiffres inventés.
- Orientation défensive : on explique les attaques pour s'en protéger. Rappeler que tester un
  système sans autorisation écrite est illégal en France (article 323-1 du Code pénal).
- 700 à 1 400 mots par cours.
