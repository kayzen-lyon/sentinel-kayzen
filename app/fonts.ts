import { Atkinson_Hyperlegible, Outfit, Plus_Jakarta_Sans } from "next/font/google";

// Corps de texte — Plus Jakarta Sans (charte Kayzen).
export const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
});

// Titres & labels — Outfit (charte Kayzen).
export const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});

// Option « Police lisible » du panneau d'accessibilité — non préchargée :
// téléchargée seulement si le visiteur l'active.
export const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
  variable: "--font-atkinson",
});
