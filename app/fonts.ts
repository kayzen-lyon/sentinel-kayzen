import { Outfit, Plus_Jakarta_Sans } from "next/font/google";

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
