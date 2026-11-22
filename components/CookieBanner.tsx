"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Bandeau de consentement — même conception et mêmes règles que kayzen-lyon.com :
 * choix rapide (accepter / refuser / personnaliser) puis réglage par catégorie,
 * consentement daté et limité à 13 mois (recommandation CNIL), refus au même poids
 * visuel que l'acceptation, Échap pour fermer sans choisir, bouton flottant permanent
 * pour modifier son choix.
 *
 * Aujourd'hui, Sentinel ne dépose QUE des cookies strictement nécessaires (session,
 * organisation active) : aucune mesure d'audience ni publicité. Les deux catégories
 * facultatives sont donc proposées « pour l'avenir » : le choix enregistré ici sera
 * appliqué si un tel outil est ajouté, et rien ne sera activé sans lui.
 */

type CookiePrefs = { necessary: boolean; analytics: boolean; marketing: boolean };

const STORAGE_KEY = "sentinel-cookie-prefs";
const DATE_KEY = "sentinel-cookie-date";
// À incrémenter quand une finalité est ajoutée ou change : le choix est alors redemandé.
const CONFIG_VERSION = 1;
const VERSION_KEY = "sentinel-cookie-version";
const DEFAULT_PREFS: CookiePrefs = { necessary: true, analytics: false, marketing: false };
const CONSENT_MAX_AGE_MS = 13 * 30 * 24 * 60 * 60 * 1000;

function getStoredPrefs(): CookiePrefs | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const savedAt = localStorage.getItem(DATE_KEY);
    if (!stored || !savedAt) return null;
    if (localStorage.getItem(VERSION_KEY) !== String(CONFIG_VERSION)) return null;
    const ts = new Date(savedAt).getTime();
    if (!Number.isFinite(ts) || Date.now() - ts > CONSENT_MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(DATE_KEY);
      return null;
    }
    return { ...DEFAULT_PREFS, ...(JSON.parse(stored) as Partial<CookiePrefs>), necessary: true };
  } catch {
    return null;
  }
}

function CookieIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 3a9 9 0 109 9 4 4 0 01-4-4 4 4 0 01-4-4 3 3 0 01-1-1z" />
      <path d="M9 10h.01M8 15h.01M13 16h.01M14 11h.01" />
    </svg>
  );
}

const btnPrimary =
  "h-11 rounded-full bg-brand px-6 font-heading text-sm font-bold text-white transition-colors hover:bg-brand-hover";
const btnStrong =
  "h-11 rounded-full border border-border-strong bg-bg-elev px-6 font-heading text-sm font-bold text-fg transition-colors hover:bg-hover";
const btnQuiet =
  "flex h-11 items-center justify-center gap-2 rounded-full border border-border px-6 font-heading text-sm font-semibold text-fg transition-colors hover:bg-hover";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [prefs, setPrefs] = useState<CookiePrefs>(DEFAULT_PREFS);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstBtnRef = useRef<HTMLButtonElement>(null);
  const reopenBtnRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  const focusOnOpen = useRef(false);

  useEffect(() => {
    const stored = getStoredPrefs();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- l'état dépend du stockage du navigateur, lu une fois au montage
    if (!stored) setVisible(true);
    else setPrefs(stored);
    setReady(true);
  }, []);

  // Le focus n'entre dans le bandeau que si le visiteur l'a rouvert lui-même.
  useEffect(() => {
    if (!visible || !focusOnOpen.current) return;
    focusOnOpen.current = false;
    firstBtnRef.current?.focus();
  }, [visible]);

  useEffect(() => {
    if (visible || !returnFocus.current) return;
    returnFocus.current = false;
    reopenBtnRef.current?.focus();
  }, [visible]);

  // Tant que le bandeau (fixe, en bas) est affiché : sa hauteur est réservée sous la page,
  // les boutons flottants remontent au-dessus de lui (--banner-h) et tout élément qui
  // reçoit le focus sous le bandeau est ramené dans la zone visible (WCAG 2.4.11).
  useEffect(() => {
    const banner = dialogRef.current;
    if (!visible || !banner) return;
    const root = document.documentElement;
    const apply = () => {
      const h = `${banner.offsetHeight}px`;
      root.style.setProperty("--banner-h", h);
      root.style.scrollPaddingBottom = h;
      document.body.style.paddingBottom = h;
    };
    const onFocus = (e: FocusEvent) => {
      const t = e.target;
      if (!(t instanceof HTMLElement) || banner.contains(t)) return;
      if (getComputedStyle(t).position === "fixed" || t.closest(".a11y-fab, header")) return;
      const overlap = t.getBoundingClientRect().bottom - banner.getBoundingClientRect().top;
      if (overlap > 0) window.scrollBy({ top: overlap + 16, behavior: "instant" });
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(banner);
    document.addEventListener("focusin", onFocus);
    return () => {
      ro.disconnect();
      document.removeEventListener("focusin", onFocus);
      root.style.removeProperty("--banner-h");
      root.style.scrollPaddingBottom = "";
      document.body.style.paddingBottom = "";
    };
  }, [visible, showSettings]);

  /** Écarte le bandeau SANS rien enregistrer : il se représentera à la prochaine visite. */
  const dismiss = useCallback(() => {
    returnFocus.current = true;
    setShowSettings(false);
    setVisible(false);
  }, []);

  // Échap ferme sans choisir. Pas de piège de focus : le bandeau n'est pas modal, la
  // tabulation doit pouvoir en sortir vers la page (WCAG 2.1.2).
  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
        return;
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [visible, dismiss]);

  const save = useCallback((p: CookiePrefs) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
      localStorage.setItem(DATE_KEY, new Date().toISOString());
      localStorage.setItem(VERSION_KEY, String(CONFIG_VERSION));
    } catch {
      /* navigation privée : le choix vaut pour la session */
    }
    returnFocus.current = true;
    setPrefs(p);
    setVisible(false);
    setShowSettings(false);
  }, []);

  const reopen = () => {
    focusOnOpen.current = true;
    setPrefs(getStoredPrefs() ?? DEFAULT_PREFS);
    setVisible(true);
    setShowSettings(true);
  };

  if (!visible)
    return ready ? (
      <button
        ref={reopenBtnRef}
        type="button"
        onClick={reopen}
        aria-label="Gérer mes préférences de cookies"
        className="cookie-fab no-print fixed z-[60] flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-muted shadow-[var(--shadow-md)] transition-colors hover:bg-hover hover:text-fg"
      >
        <CookieIcon className="h-4 w-4" />
      </button>
    ) : null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-labelledby="cookie-title"
      aria-describedby="cookie-desc"
      className="cookie-banner animate-slide-up no-print fixed inset-x-0 bottom-0 z-[70] p-4 md:p-6"
    >
      <div className="mx-auto max-h-[calc(100dvh-2rem)] max-w-4xl overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-lg)] md:p-8">
        {!showSettings ? (
          <>
            <div className="mb-6 flex items-start gap-4">
              <CookieIcon className="mt-1 h-6 w-6 flex-none text-brand" />
              <div>
                <h2 id="cookie-title" className="mb-2 font-heading text-lg font-bold text-fg">
                  Nous respectons votre vie privée
                </h2>
                <p id="cookie-desc" className="text-sm leading-relaxed text-muted">
                  Sentinel n&apos;utilise aujourd&apos;hui que des cookies strictement nécessaires
                  (connexion et sécurité) : aucun cookie de mesure d&apos;audience ni de publicité
                  n&apos;est déposé, et aucun ne le sera sans votre accord. Vous pouvez accepter,
                  refuser ou choisir précisément ; votre choix reste modifiable à tout moment via
                  l&apos;icône en bas à gauche.{" "}
                  <Link href="/confidentialite" className="text-brand-light underline underline-offset-2">
                    Politique de confidentialité
                  </Link>
                  .{" "}
                  <span className="text-xs">
                    Touche <kbd className="font-sans font-semibold">Échap</kbd> pour fermer sans
                    choisir — aucun traceur ne sera déposé.
                  </span>
                </p>
              </div>
            </div>
            {/* « Tout refuser » a le même poids visuel que « Tout accepter » (exigence CNIL). */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <button ref={firstBtnRef} type="button" onClick={() => save({ necessary: true, analytics: true, marketing: true })} className={btnStrong}>
                Tout accepter
              </button>
              <button type="button" onClick={() => save(DEFAULT_PREFS)} className={btnStrong}>
                Tout refuser
              </button>
              <button type="button" onClick={() => setShowSettings(true)} className={btnQuiet}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                  <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 4v4M10 10v4M18 16v4" />
                </svg>
                Personnaliser
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <h2 id="cookie-title" className="font-heading text-lg font-bold text-fg">
                Paramètres des cookies
              </h2>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                aria-label="Revenir au choix rapide"
                className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-hover hover:text-fg"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
                  <path d="M6 6l12 12M6 18L18 6" />
                </svg>
              </button>
            </div>
            <p id="cookie-desc" className="sr-only">
              Choisissez les catégories de cookies que vous autorisez.
            </p>
            <div className="mb-6 space-y-4">
              <CookieToggle
                id="ck-necessary"
                label="Cookies strictement nécessaires"
                desc="Session de connexion, organisation active, sécurité et mémorisation de ce choix. Exemptés de consentement."
                checked
                disabled
              />
              <CookieToggle
                id="ck-analytics"
                label="Mesure d'audience"
                desc="Aucun outil de mesure n'est installé aujourd'hui. Votre choix sera appliqué si nous en ajoutons un."
                checked={prefs.analytics}
                onChange={(v) => setPrefs({ ...prefs, analytics: v })}
              />
              <CookieToggle
                id="ck-marketing"
                label="Publicité et remarketing"
                desc="Aucun traceur publicitaire n'est utilisé aujourd'hui. Désactivé par défaut."
                checked={prefs.marketing}
                onChange={(v) => setPrefs({ ...prefs, marketing: v })}
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button ref={firstBtnRef} type="button" onClick={() => save(prefs)} className={btnPrimary}>
                Enregistrer mes préférences
              </button>
              <button type="button" onClick={() => save(DEFAULT_PREFS)} className={btnQuiet}>
                Tout refuser
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CookieToggle({
  id,
  label,
  desc,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  desc: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-sunken p-4">
      <div>
        <div className="font-heading text-sm font-semibold text-fg" id={`${id}-label`}>{label}</div>
        <div className="mt-1 text-xs text-muted" id={`${id}-desc`}>{desc}</div>
      </div>
      <button
        type="button"
        onClick={() => !disabled && onChange?.(!checked)}
        disabled={disabled}
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-desc`}
        className={`relative h-7 w-12 flex-none rounded-full border transition-colors duration-200 ${
          checked ? "border-brand bg-brand" : "border-border-strong bg-hover"
        } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
      >
        <span
          aria-hidden="true"
          className={`absolute left-[3px] top-[3px] h-5 w-5 rounded-full transition-transform duration-200 ${
            checked ? "translate-x-5 bg-white" : "translate-x-0 border border-border-strong bg-card"
          }`}
        />
      </button>
    </div>
  );
}
