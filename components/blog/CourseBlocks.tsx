import Link from "next/link";
import type { Block, CalloutKind, Inline } from "@/lib/courseParser";

/** Rendu des blocs d'un cours (aucun HTML injecté : tout passe par React). */

export function Inlines({ inl }: { inl: Inline[] }) {
  return (
    <>
      {inl.map((x, i) => {
        if (x.t === "b") return <strong key={i}>{x.text}</strong>;
        if (x.t === "code") return <code key={i} className="blog-code-inline">{x.text}</code>;
        if (x.t === "a")
          return x.href.startsWith("/") ? (
            <Link key={i} href={x.href}>{x.text}</Link>
          ) : (
            <a key={i} href={x.href} target="_blank" rel="noopener noreferrer">
              {x.text}
              <span className="sr-only"> (nouvel onglet)</span>
            </a>
          );
        return <span key={i}>{x.text}</span>;
      })}
    </>
  );
}

const CALLOUT: Record<CalloutKind, { label: string; tone: string; icon: string }> = {
  astuce: { label: "Bon réflexe", tone: "safe", icon: "✓" },
  attention: { label: "Attention", tone: "risk", icon: "!" },
  exemple: { label: "Cas concret", tone: "secondary", icon: "◆" },
  definition: { label: "Définition", tone: "brand", icon: "i" },
};

export default function CourseBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.t) {
          case "h2":
            return <h2 key={i} id={b.id} className="scroll-mt-24">{b.text}</h2>;
          case "h3":
            return <h3 key={i} id={b.id} className="scroll-mt-24">{b.text}</h3>;
          case "p":
            return <p key={i}><Inlines inl={b.inl} /></p>;
          case "ul":
            return (
              <ul key={i}>
                {b.items.map((it, k) => <li key={k}><Inlines inl={it} /></li>)}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="blog-ol">
                {b.items.map((it, k) => <li key={k}><Inlines inl={it} /></li>)}
              </ol>
            );
          case "code":
            return (
              <pre key={i} className="blog-pre" data-lang={b.lang}>
                <code>{b.code}</code>
              </pre>
            );
          case "callout": {
            const c = CALLOUT[b.kind];
            return (
              <aside key={i} className="blog-callout" data-tint="outline" data-tone={c.tone} aria-label={c.label}>
                <p className="blog-callout-title">
                  <span aria-hidden="true">{c.icon}</span> {c.label}
                </p>
                <p className="blog-callout-body"><Inlines inl={b.inl} /></p>
              </aside>
            );
          }
        }
      })}
    </>
  );
}
