"use client";

import { useEffect, useState } from "react";
import type { QuizQuestion } from "@/lib/courseParser";
import { markDone } from "./progressStore";

/** Quiz interactif de fin de cours. Le cours est marqué « terminé » (localement) une fois le quiz fini. */
export default function Quiz({ slug, questions }: { slug: string; questions: QuizQuestion[] }) {
  const [picked, setPicked] = useState<(number | null)[]>(() => questions.map(() => null));
  const answered = picked.filter((p) => p !== null).length;
  const good = picked.filter((p, i) => p === questions[i].answer).length;
  const done = answered === questions.length;

  // Le cours est marqué « terminé » dès que toutes les questions ont une réponse.
  useEffect(() => {
    if (done) markDone(slug);
  }, [done, slug]);

  function pick(qi: number, oi: number) {
    // Mise à jour à partir de l'état le plus récent : des clics rapprochés ne s'écrasent pas.
    setPicked((prev) => (prev[qi] !== null ? prev : prev.map((p, i) => (i === qi ? oi : p))));
  }

  return (
    <section aria-labelledby="quiz" className="mt-12 rounded-2xl border border-border bg-card p-6 sm:p-8">
      <h2 id="quiz" className="!mt-0 font-heading text-2xl font-semibold text-fg">Testez vos connaissances</h2>
      <p className="mt-1 text-sm text-subtle">
        {questions.length} questions · une seule bonne réponse par question.
      </p>
      <ol className="mt-6 space-y-8">
        {questions.map((q, qi) => {
          const p = picked[qi];
          return (
            <li key={qi}>
              <fieldset>
                <legend className="font-semibold text-fg">
                  {qi + 1}. {q.q}
                </legend>
                <div className="mt-3 grid gap-2">
                  {q.options.map((o, oi) => {
                    const state = p === null ? "idle" : oi === q.answer ? "good" : oi === p ? "bad" : "off";
                    return (
                      <button
                        key={oi}
                        type="button"
                        onClick={() => pick(qi, oi)}
                        disabled={p !== null}
                        aria-pressed={p === oi}
                        className={`rounded-lg border px-4 py-2.5 text-left text-sm transition-colors ${
                          state === "idle" ? "border-border hover:bg-hover" : state === "off" ? "border-border opacity-60" : ""
                        }`}
                        data-tint={state === "good" || state === "bad" ? "outline" : undefined}
                        data-tone={state === "good" ? "safe" : state === "bad" ? "risk" : undefined}
                      >
                        {state === "good" ? "✓ " : state === "bad" ? "✗ " : ""}
                        {o}
                      </button>
                    );
                  })}
                </div>
                {p !== null && (
                  <p className="mt-3 text-sm text-muted" role="status">
                    <strong className="text-fg">{p === q.answer ? "Bonne réponse. " : "Pas tout à fait. "}</strong>
                    {q.explain}
                  </p>
                )}
              </fieldset>
            </li>
          );
        })}
      </ol>
      {done && (
        <p className="mt-8 rounded-lg border border-border bg-sunken px-4 py-3 text-sm text-fg" role="status">
          Résultat : <strong>{good}/{questions.length}</strong>.{" "}
          {good === questions.length
            ? "Parfait, ce cours est acquis !"
            : "Relisez les passages concernés, puis passez au cours suivant."}
        </p>
      )}
    </section>
  );
}
