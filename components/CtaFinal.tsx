export default function CtaFinal() {
  return (
    <section id="contact" className="border-t border-border py-24">
      <div className="container-x">
        <div className="relative overflow-hidden rounded-3xl border border-brand/40 bg-gradient-to-b from-brand/[0.12] to-transparent px-6 py-16 text-center sm:px-16">
          <div
            className="absolute inset-0 -z-10 opacity-60"
            style={{
              background:
                "radial-gradient(circle at 50% 0%, rgba(37,99,235,0.25), transparent 60%)",
            }}
            aria-hidden="true"
          />
          <span className="eyebrow justify-center">
            <span className="inline-block h-2 w-2 rounded-full bg-safe" />
            Audit initial offert
          </span>
          <h2
            className="mx-auto mt-5 max-w-2xl font-heading font-bold text-fg"
            style={{ fontSize: "var(--text-4xl)" }}
          >
            Découvrez ce qu'un attaquant verrait sur votre application
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
            Lancez un premier audit avec les experts Kayzen. Vous repartez avec une
            cartographie claire de vos risques et un plan d'action priorisé.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="mailto:contact@kayzen-lyon.fr?subject=Demande%20d'audit%20Sentinel"
              className="btn btn-primary w-full sm:w-auto"
            >
              Demander mon audit gratuit
            </a>
            <a
              href="https://kayzen-lyon.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost w-full sm:w-auto"
            >
              Découvrir Kayzen Web
            </a>
          </div>
          <p className="mt-5 text-sm text-subtle">
            Réponse sous 24 h ouvrées · Sans engagement · Confidentialité garantie
          </p>
        </div>
      </div>
    </section>
  );
}
