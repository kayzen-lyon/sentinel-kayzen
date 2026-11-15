/**
 * Scripts en ligne exécutés dans <head> AVANT le premier rendu (aucun flash) :
 * thème et réglages d'accessibilité lus dans localStorage.
 *
 * Module volontairement SANS "use client" : importée depuis un composant client, une
 * constante devient une « référence client » côté serveur, et la concaténer produit
 * du code invalide. Clés et classes : garder alignées avec ThemeToggle et AccessibilityToggle.
 */

export const A11Y_STORAGE_KEY = "kayzen-a11y";

/** Clair par défaut : le sombre ne s'active que si l'utilisateur l'a choisi. */
const THEME = `try{if(localStorage.getItem("theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`;

const A11Y = `try{var a=JSON.parse(localStorage.getItem("${A11Y_STORAGE_KEY}")||"{}"),r=document.documentElement;if(a.fontSize)r.style.fontSize=["100%","112%","125%"][a.fontSize]||"";if(a.highContrast)r.classList.add("high-contrast");if(a.dyslexicFont)r.classList.add("dyslexic-font");if(a.oled)r.classList.add("oled")}catch(e){}`;

export const INIT_SCRIPT = `${THEME};${A11Y}`;
