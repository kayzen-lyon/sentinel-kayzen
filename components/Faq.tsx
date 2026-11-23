"use client";

import { useState } from "react";
import { FAQ as QA } from "@/lib/faq";

export default function Faq() {
  // Toutes les réponses ouvertes par défaut ; on mémorise seulement celles qu'on a repliées.
  const [replies, setReplies] = useState<Set<number>>(() => new Set());
  const basculer = (i: number) =>
    setReplies((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  return (
    <section id="faq" className="border-t border-border py-24">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Questions fréquentes</span>
          <h2
            className="mt-4 font-heading font-bold text-fg"
            data-size="4xl"
          >
            Tout ce que vous devez savoir
          </h2>
        </div>

        <div className="mx-auto mt-12 max-w-3xl divide-y divide-border rounded-2xl border border-border bg-card">
          {QA.map((item, i) => {
            const isOpen = !replies.has(i);
            return (
              <div key={item.q}>
                <button
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  onClick={() => basculer(i)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-reponse-${i}`}
                >
                  <span className="font-heading text-base font-semibold text-fg">
                    {item.q}
                  </span>
                  <span
                    className={`flex-none text-brand-light transition-transform duration-300 ${
                      isOpen ? "rotate-45" : ""
                    }`}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                  </span>
                </button>
                <div
                  id={`faq-reponse-${i}`}
                  className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                >
                  <div className="overflow-hidden">
                    <p className="px-6 pb-5 text-[0.95rem] leading-relaxed text-muted">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
