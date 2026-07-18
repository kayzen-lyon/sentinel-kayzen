# Sentinel by Kayzen

Site vitrine de **Sentinel**, la nouvelle entité cybersécurité du groupe **Kayzen**
(aux côtés de [Nexus](https://nexus.kayzen-lyon.fr) — SEO/IA — et
[Konforme](https://konforme.kayzen-lyon.fr) — accessibilité EAA).

Sentinel propose du **pentest IA autonome** basé sur le moteur open-source
[Strix](https://strix.ai) : des agents qui trouvent, exploitent et prouvent les
vulnérabilités par des PoC réels. Offre **hybride** : audit managé par l'agence
Kayzen **+** plateforme self-service intégrée à la CI/CD.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (design tokens dans `app/globals.css`)
- Polices `Outfit` (titres) + `Inter` (corps) via `next/font`
- Charte graphique reprise à l'identique de Nexus (bleu `#2563EB`, base zinc-950,
  échelle nombre d'or, typographie fluide `clamp()`).

## Démarrer

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build    # build de production
npm run start    # sert le build
```

## Structure

```
app/
  layout.tsx           # metadata SEO + Open Graph, fonts, skip-link
  page.tsx             # assemblage des sections + JSON-LD
  globals.css          # design tokens (charte Kayzen) + prose légal
  icon.png             # favicon (emblème) — auto-détecté par Next
  apple-icon.png       # icône iOS
  mentions-legales/    # \
  confidentialite/     #  } pages légales (structure FR + placeholders)
  cgu/                 #  }
  accessibilite/       # /
components/             # Header, Hero, Problem, Features, HowItWorks,
                        # Offers, Coverage, Pricing, Group, Faq, CtaFinal,
                        # Footer, LegalShell
public/
  logo-full.png        # logo complet détouré (fond transparent)
  logo-mark.png        # emblème seul (header, footer, favicon)
  og-image.png         # image de partage 1200×630
```

## Identité de marque

Logo officiel **Sentinel by Kayzen** (bouclier + aigle métallique) intégré :
fond blanc détouré → PNG transparents. L'emblème sert de marque dans le header,
le footer et le favicon ; le wordmark navy est réservé aux fonds clairs
(`logo-full.png`).

## À personnaliser avant mise en ligne

- **Pages légales** — la structure est en place, mais chaque champ `[À COMPLÉTER]`
  (SIRET, hébergeur, DPO, durées…) doit être renseigné et **relu par un juriste**.
  Ces pages sont volontairement en `noindex` tant qu'elles ne sont pas finalisées.
- **Tarifs** (`components/Pricing.tsx`) — valeurs indicatives à valider.
- **Contact** — `contact@kayzen-lyon.fr` en `mailto` ; brancher un vrai formulaire /
  l'URL de la plateforme self-service.
- **Statistiques du hero** (100+, 24/7…) — à remplacer par des chiffres vérifiables.
