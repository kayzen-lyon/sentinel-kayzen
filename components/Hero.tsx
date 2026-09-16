import Link from "next/link";

export default function Hero() {
  return (
    <section id="contenu" className="relative overflow-hidden pt-[72px]">
      <div className="grid-glow absolute inset-0 -z-10" aria-hidden="true" />
      <div
        className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-gradient-to-b from-brand/[0.08] to-transparent"
        aria-hidden="true"
      />

      <div className="container-x py-20 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <span className="eyebrow reveal mb-6 rounded-full border border-border-strong bg-card/60 px-4 py-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-safe" />
            Cybersécurité offensive — Groupe Kayzen
          </span>

          <h1
            className="reveal font-heading font-bold leading-[1.05] text-fg"
            style={{ fontSize: "var(--text-hero)", animationDelay: "60ms" }}
          >
            Des hackers IA qui trouvent vos failles{" "}
            <span className="gradient-text">avant les vrais</span>
          </h1>

          <p
            className="reveal mx-auto mt-6 max-w-2xl text-muted"
            style={{ fontSize: "var(--text-lg)", animationDelay: "120ms" }}
          >
            Sentinel déploie des agents autonomes qui exécutent réellement votre
            application, exploitent les vulnérabilités et les prouvent par des{" "}
            <strong className="font-semibold text-fg">PoC concrets</strong> — pas
            de faux positifs. Un pentest complet en heures, pas en semaines.
          </p>

          <div
            className="reveal mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ animationDelay: "180ms" }}
          >
            <Link href="/signup" className="btn btn-primary w-full sm:w-auto">
              Scanner mon site gratuitement
              <IconArrow />
            </Link>
            <a href="#contact" className="btn btn-ghost w-full sm:w-auto">
              Demander un audit managé
            </a>
          </div>

          <p
            className="reveal mt-5 text-sm text-subtle"
            style={{ animationDelay: "220ms" }}
          >
            Basé sur le moteur open-source Strix · PoC validés · Rapports prêts pour la conformité
          </p>
        </div>

        <TerminalPreview />

        <dl className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-6 sm:grid-cols-4">
          {[
            ["100+", "vecteurs testés"],
            ["OWASP", "Top 10 & au-delà"],
            ["0", "faux positif — chaque faille prouvée"],
            ["24/7", "surveillance continue"],
          ].map(([n, l]) => (
            <div key={l} className="text-center">
              <dt className="font-heading text-3xl font-bold text-fg">{n}</dt>
              <dd className="mt-1 text-sm text-muted">{l}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function TerminalPreview() {
  return (
    <div
      className="reveal mx-auto mt-16 max-w-3xl"
      style={{ animationDelay: "260ms" }}
    >
      <div className="overflow-hidden rounded-2xl border border-border-strong bg-[#0c0c0f] shadow-[var(--shadow-lg)]">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-risk/70" />
          <span className="h-3 w-3 rounded-full bg-warn/70" />
          <span className="h-3 w-3 rounded-full bg-safe/70" />
          <span className="ml-3 font-mono text-xs text-subtle">
            sentinel — audit https://app.client.fr
          </span>
        </div>
        <pre className="overflow-x-auto px-5 py-5 font-mono text-[0.8rem] leading-relaxed text-muted">
          <code>
            <span className="text-brand-light">$</span> sentinel --target https://app.client.fr{"\n"}
            <span className="text-subtle">›</span> Reconnaissance : cartographie de 38 endpoints…{"  "}
            <span className="text-safe">ok</span>
            {"\n"}
            <span className="text-subtle">›</span> Orchestration : 4 agents red-team lancés{"  "}
            <span className="text-safe">ok</span>
            {"\n"}
            <span className="text-risk">✗ CRITIQUE</span> IDOR — accès aux commandes d'autres comptes{"\n"}
            {"  "}<span className="text-subtle">PoC validé · GET /api/orders/1042 → 200 (compte tiers)</span>
            {"\n"}
            <span className="text-warn">✗ ÉLEVÉ</span> Injection SQL — /search?q={"\n"}
            <span className="text-safe">✓</span> 12 endpoints authentifiés sans faille{"\n"}
            <span className="text-brand-light">→</span> Rapport + correctifs générés{" "}
            <span className="text-fg">strix_runs/audit-app-client</span>
          </code>
        </pre>
      </div>
    </div>
  );
}

function IconArrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
