/**
 * Animation du héros, sur le modèle de Nexus : une fenêtre de navigateur claire qui
 * « joue » un audit Sentinel (adresse saisie → analyse → contrôles → note).
 * CSS uniquement (styles .hm-* dans globals.css), boucle de 10 s ; état final fixe
 * si l'utilisateur réduit les animations. Décoratif : masqué aux lecteurs d'écran.
 */

const CHECKS: { label: string; fail?: boolean }[] = [
  { label: "En-têtes de sécurité" },
  { label: "Certificat TLS et HTTPS" },
  { label: "Cookies de session" },
  { label: "Fichiers sensibles exposés" },
  { label: "Injection SQL — faille prouvée (PoC)", fail: true },
];

function Icon({ d, className }: { d: string; className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={d} />
    </svg>
  );
}

const pill =
  "absolute flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-fg shadow-[var(--shadow-md)]";

export default function HeroMotion() {
  return (
    <div className="relative mx-auto w-full max-w-[520px] min-w-0 py-6" aria-hidden="true">
      <div className="hm-cycle relative overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-e3)]">
        {/* Barre d'adresse */}
        <div className="flex items-center gap-3 border-b border-border bg-sunken px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-border-strong/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-border-strong/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-border-strong/60" />
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted">
            <Icon d="M6 11V8a6 6 0 0112 0v3M5 11h14v9H5z" className="h-3 w-3 flex-none" />
            <span className="truncate">sentinel.kayzen-lyon.com/scan</span>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {/* Adresse analysée */}
          <div className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 font-mono text-sm text-fg">
            <span className="text-muted">https://</span>
            <span className="hm-type inline-block overflow-hidden align-bottom whitespace-nowrap">monsite.fr</span>
            <span className="hm-caret -ml-1 inline-block h-4 w-px bg-fg" />
          </div>

          {/* Flux : site → Sentinel → note */}
          <div className="mt-5 flex items-center justify-between gap-2">
            <div className="flex h-14 w-14 flex-none items-center justify-center rounded-xl border border-border bg-card text-[10px] font-bold uppercase tracking-wide text-brand">
              Site
            </div>
            <div className="hm-flow h-0.5 flex-1 rounded-full" />
            <div className="flex h-14 w-14 flex-none items-center justify-center rounded-xl bg-navy-deep text-gold">
              <Icon d="M12 3l7 3v5c0 4.500-3 8.300-7 10-4-1.700-7-5.500-7-10V6l7-3zM9 12l2 2 4-4" className="h-6 w-6" />
            </div>
            <div className="hm-flow h-0.5 flex-1 rounded-full" />
            <div className="relative flex h-14 w-14 flex-none items-center justify-center">
              <svg viewBox="0 0 80 80" className="h-14 w-14 -rotate-90">
                <circle cx="40" cy="40" r="34" fill="none" stroke="rgb(var(--border))" strokeWidth="6" />
                <circle cx="40" cy="40" r="34" fill="none" stroke="rgb(var(--brand))" strokeWidth="6" strokeLinecap="round" className="hm-ring" />
              </svg>
              <span className="hm-score absolute font-heading text-base font-extrabold text-fg">B</span>
            </div>
          </div>

          {/* Progression */}
          <div className="mt-5">
            <div className="relative mb-2 h-4 text-xs font-semibold text-fg">
              <span className="hm-label-run absolute left-0">Analyse en cours…</span>
              <span className="hm-label-done absolute left-0 text-safe">Analyse terminée · note B · 82/100</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-sunken">
              <div className="hm-bar h-full rounded-full bg-brand" />
            </div>
          </div>

          {/* Contrôles */}
          <ul className="mt-5 space-y-2">
            {CHECKS.map((c, i) => (
              <li key={c.label} className={`hm-row hm-row-${i} flex items-center gap-3 rounded-lg bg-sunken px-3 py-2 text-sm text-fg`}>
                <span
                  className={`flex h-5 w-5 flex-none items-center justify-center rounded-full text-white ${c.fail ? "bg-risk" : "bg-safe"}`}
                >
                  <Icon d={c.fail ? "M7 7l10 10M17 7L7 17" : "M5 12.500l4.500 4.500L19 7.500"} className="h-3 w-3" />
                </span>
                {c.label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Pastilles flottantes */}
      <div className={`${pill} hm-float -right-2 top-0 sm:-right-4`}>
        <Icon d="M12 3l7 3v5c0 4.500-3 8.300-7 10-4-1.700-7-5.500-7-10V6l7-3z" className="h-3.5 w-3.5 text-brand" />
        Scan passif, non intrusif
      </div>
      <div className={`${pill} hm-float-2 -left-2 bottom-2 sm:-left-4`}>
        <Icon d="M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2" className="h-3.5 w-3.5 text-brand" />
        Résultat en moins d&apos;une minute
      </div>
    </div>
  );
}
