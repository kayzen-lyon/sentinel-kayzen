import ContactForm from "@/components/ContactForm";

export default function CtaFinal() {
  return (
    <section id="contact" className="border-t border-border py-24">
      <div className="container-x">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card px-6 py-16 text-center shadow-[var(--shadow-section)] sm:px-16">
          <span className="eyebrow justify-center">
            Audit initial offert
          </span>
          <h2
            className="mx-auto mt-5 max-w-2xl font-heading font-bold text-fg"
            data-size="4xl"
          >
            Découvrez ce qu'un attaquant verrait sur votre application
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
            Lancez un premier audit avec les experts Kayzen. Vous repartez avec une
            cartographie claire de vos risques et un plan d'action priorisé.
          </p>
          <ContactForm />
          <p className="mt-5 text-center text-sm text-subtle">
            Réponse sous 24 h ouvrées · Sans engagement · Confidentialité garantie ·{" "}
            <a
              href="https://www.kayzen-lyon.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand underline underline-offset-2"
            >
              Découvrir Kayzen Web
            <span className="sr-only"> (nouvel onglet)</span></a>
          </p>
        </div>
      </div>
    </section>
  );
}
