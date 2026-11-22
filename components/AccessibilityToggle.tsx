"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { A11Y_STORAGE_KEY as STORAGE_KEY } from "@/lib/initScripts";

/**
 * Panneau d'accessibilité — mêmes réglages que kayzen-lyon.com : taille du texte,
 * contraste renforcé, police lisible (Atkinson Hyperlegible), noir pur OLED.
 *
 * Clé, format et classes sont repris par INIT_SCRIPT (lib/initScripts.ts, dans <head>), qui applique
 * les réglages avant le premier rendu : garder les deux alignés.
 */

type A11ySettings = { fontSize: number; highContrast: boolean; dyslexicFont: boolean; oled: boolean };

const DEFAULTS: A11ySettings = { fontSize: 0, highContrast: false, dyslexicFont: false, oled: false };
const SIZES = ["100%", "112%", "125%"];
const SIZE_LABELS = ["Normal", "Grand", "Très grand"];

function readStored(): A11ySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* stockage indisponible (navigation privée) */
  }
  return DEFAULTS;
}

function subscribeTheme(onChange: () => void) {
  const obs = new MutationObserver(onChange);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 flex-none" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export default function AccessibilityToggle() {
  const [open, setOpen] = useState(false);
  // null tant que les préférences n'ont pas été lues : rien n'est écrit (ni appliqué) avant cette lecture,
  // sinon les valeurs par défaut écraseraient un réglage OLED enregistré.
  const [stored, setStored] = useState<A11ySettings | null>(null);
  const settings = stored ?? DEFAULTS;
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  // Le noir pur ne s'applique que sous le thème sombre.
  const dark = useSyncExternalStore(
    subscribeTheme,
    () => document.documentElement.classList.contains("dark"),
    () => false
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- préférences lues une fois au montage
    setStored(readStored());
  }, []);

  useEffect(() => {
    if (!stored) return;
    try {
      // Rien n'est écrit tant que le visiteur n'a rien réglé (minimisation).
      const untouched = (Object.keys(DEFAULTS) as (keyof A11ySettings)[]).every((k) => stored[k] === DEFAULTS[k]);
      if (untouched) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
      /* stockage indisponible */
    }
    const root = document.documentElement;
    root.style.fontSize = stored.fontSize ? SIZES[stored.fontSize] : "";
    root.classList.toggle("high-contrast", stored.highContrast);
    root.classList.toggle("dyslexic-font", stored.dyslexicFont);
    root.classList.toggle("oled", stored.oled);
  }, [stored]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const update = <K extends keyof A11ySettings>(key: K, val: A11ySettings[K]) =>
    setStored((s) => ({ ...(s ?? readStored()), [key]: val }));

  const option = (on: boolean) =>
    `flex min-h-11 w-full items-center gap-3 rounded-xl border p-3 text-left text-sm font-semibold transition-colors ${
      on ? "border-brand bg-brand/10 text-brand" : "border-border text-fg enabled:hover:bg-hover"
    }`;
  const step =
    "flex h-11 w-11 items-center justify-center rounded-xl border border-border text-fg transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div ref={rootRef} className="a11y-fab no-print fixed z-[75]">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-bg shadow-[var(--shadow-md)] transition-colors hover:bg-secondary-hover"
        aria-label="Options d'accessibilité"
        aria-expanded={open}
        aria-controls="a11y-panel"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
          <circle cx="12" cy="4.500" r="1.500" />
          <path d="M5 8.500l7 1.500 7-1.500M12 10v5M12 15l-3 5.500M12 15l3 5.500" />
        </svg>
      </button>

      {open && (
        <div
          id="a11y-panel"
          role="group"
          aria-label="Options d'accessibilité"
          className="css-scale-in absolute bottom-14 left-0 w-64 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-lg)]"
        >
          <p className="font-heading text-sm font-bold text-fg">Accessibilité</p>

          <div className="space-y-2">
            <p id="a11y-size-label" className="font-heading text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Taille du texte
            </p>
            <div className="flex items-center gap-2" role="group" aria-labelledby="a11y-size-label">
              <button type="button" onClick={() => update("fontSize", Math.max(0, settings.fontSize - 1))} disabled={settings.fontSize === 0} className={step} aria-label="Réduire la taille du texte">
                <Icon d="M5 12h14" />
              </button>
              <div className="flex-1 text-center text-sm font-semibold text-fg" aria-live="polite">
                {SIZE_LABELS[settings.fontSize]}
              </div>
              <button type="button" onClick={() => update("fontSize", Math.min(2, settings.fontSize + 1))} disabled={settings.fontSize === 2} className={step} aria-label="Augmenter la taille du texte">
                <Icon d="M12 5v14M5 12h14" />
              </button>
            </div>
          </div>

          <button type="button" onClick={() => update("highContrast", !settings.highContrast)} aria-pressed={settings.highContrast} className={option(settings.highContrast)}>
            <Icon d="M2 12s3.600-7 10-7 10 7 10 7-3.600 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z" />
            Contraste renforcé
          </button>

          <button type="button" onClick={() => update("dyslexicFont", !settings.dyslexicFont)} aria-pressed={settings.dyslexicFont} className={option(settings.dyslexicFont)}>
            <Icon d="M5 6V4h14v2M12 4v16M9 20h6" />
            Police lisible
          </button>

          <button
            type="button"
            onClick={() => update("oled", !settings.oled)}
            aria-pressed={settings.oled}
            disabled={!dark}
            aria-describedby={dark ? undefined : "a11y-oled-hint"}
            className={`${option(settings.oled && dark)} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <Icon d="M21 12.800A9 9 0 1111.200 3 7 7 0 0021 12.800z" />
            <span>
              Noir pur (OLED)
              {!dark && (
                <span id="a11y-oled-hint" className="block text-xs font-normal text-muted">
                  Disponible en mode sombre
                </span>
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStored(DEFAULTS)}
            className="min-h-11 w-full text-center text-xs text-muted underline underline-offset-2 transition-colors hover:text-fg"
          >
            Réinitialiser
          </button>
        </div>
      )}
    </div>
  );
}
