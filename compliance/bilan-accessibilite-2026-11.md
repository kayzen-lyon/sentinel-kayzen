# Bilan d'accessibilité — novembre 2026

Produit avec l'aide d'une IA. Ce n'est ni un audit, ni un avis juridique, ni un certificat.
**Le contrôle automatique ne remplace pas un test humain et ne vaut pas certificat** :
axe-core ne détecte qu'une partie des défauts, et de nombreux critères demandent un jugement.

## Méthode

- `npm run a11y:sweep` (scripts/axe-sweep.mjs) : Playwright + axe-core, règles WCAG 2.0/2.1/2.2 A et AA,
  sur le build de production local et la base PGlite de démonstration.
- Connexion avec le compte de démo, 11 routes du tableau de bord (dont un rapport de pentest),
  puis l'accueil, les six pages légales, la connexion et l'inscription.
- Chaque page dans un contexte de navigateur neuf, en thème clair, sombre et OLED (60 combinaisons) ;
  survol du premier graphique avant l'analyse ; erreurs de console relevées.
- Contrôleurs du skill eu-web-compliance sur l'accueil : `check-a11y` 0 non-conformité (32 points à revoir), `check-privacy` 0 non-conformité avec la déclaration des traceurs.

## Résultats axe-core

| Étape | Nœuds en défaut | Erreurs de console |
|---|---|---|
| Avant (main du 22/11, PR 33) | 77 | 6 (base locale mono-connexion) |
| Après la charte carmin (PR 36) | 53 | 0 |
| Après les correctifs techniques (PR 37) | 53 | 0 |
| Après ce chantier | **0** | **0** |

## Causes corrigées à la racine

| Défaut | Cause | Correctif | Source |
|---|---|---|---|
| Contrastes du tableau de bord (24 nœuds) | Rouge et gris de l'ancienne charte sur fonds sombres | Jetons de la charte carmin, nuances de texte mesurées | [WCAG 1.4.3] [RGAA 3.2] |
| Nom du menu utilisateur (33 nœuds) | `aria-label` ne contenant pas le texte visible | Nom accessible = nom affiché + « menu du compte » | [WCAG 2.5.3] |
| Lien de la page CI/CD (3 nœuds) | Lien distingué par la seule couleur | Liens soulignés dans le texte du tableau de bord | [WCAG 1.4.1] [RGAA 10.6] |
| Boutons de marque du site public en sombre (16 nœuds) | Blanc codé en dur sur #e16d47 (3,2:1) | Jeton `--on-brand` (navy en sombre, 5,6:1) | [WCAG 1.4.3] |
| Pastille d'alerte du site public en sombre (1 nœud) | #ea5353 à 4,4:1 sur carte teintée | #f06a6a (≥ 5,2:1) | [WCAG 1.4.3] |
| Défilement des applications du groupe | Copie de boucle `aria-hidden` contenant des liens | Copie décorative sans lien, rendue `inert` | [WCAG 4.1.2] [RGAA 10.8] |

## Points restant « à revoir » (non testés, NT)

- Liens ouvrant un nouvel onglet sans le signaler (pied de page, contact) : à vérifier un par un.
- Contraste du texte du bandeau de cookies : axe-core n'a pas pu conclure (fond translucide).
- Vie privée : avec la déclaration `compliance/trackers.json`, `check-privacy` ne relève aucune
  non-conformité. Lancé sur une URL, `check-all` n'a pas transmis cette déclaration (limite de l'outil),
  d'où trois alertes sur les clés du choix de consentement, déclarées exemptées.

## Vérifications à faire par une personne

Selon `references/accessibility/testing-by-hand.md` du skill : parcours au clavier, zoom à 200 %,
reflow à 320 px, espacement du texte, test rapide au lecteur d'écran (NVDA, VoiceOver), page sans CSS,
pertinence des alternatives, titres, liens et intitulés, couleurs au-delà de l'outil, mouvements et
délais, cibles de pointeur, parcours de connexion, formulaires et erreurs.
