import { EN_BREF } from "@/lib/accueil";
import SurCettePage from "@/components/SurCettePage";

/** « En bref » de l'accueil, suivi de la table des matières générée depuis les H2. */
export default function EnBref() {
  return (
    <section id="en-bref" aria-labelledby="en-bref-titre" className="border-t border-border py-16">
      <div className="container-x grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 id="en-bref-titre" className="font-heading text-2xl font-bold text-fg">En bref</h2>
          <ul className="mt-4 space-y-3 text-fg">
            {EN_BREF.map((p) => (
              <li key={p} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-brand" aria-hidden="true" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
          {/* Vitrine honnête : aucun exemple tant qu'aucun audit réel et daté n'a été réalisé
              sur un environnement de test appartenant à KAYZEN. */}
          <p className="mt-6 rounded-xl border border-dashed border-border-strong p-4 text-sm text-muted">
            <strong className="text-fg">Exemple de rapport :</strong> aucun exemple n&apos;est publié pour l&apos;instant. Nous
            publierons ici un rapport réel et daté, réalisé sur un environnement de test appartenant à KAYZEN — jamais une
            capture ni un score inventés.
          </p>
        </div>
        <SurCettePage />
      </div>
    </section>
  );
}
