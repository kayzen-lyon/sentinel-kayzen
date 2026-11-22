import Link from "next/link";
import { HOME_SECTIONS } from "@/lib/homeSections";

const STRIX = [
  "Agents IA autonomes (reconnaissance, exploitation, post-exploitation)",
  "Exploitation réelle + PoC reproductible par vulnérabilité",
  "Playbooks GraphQL, supply-chain, LLM, cloud-native",
  "Budget LLM borné, garde-fous et approbation humaine",
];

const OSS = [
  "Moteurs open source : Nuclei + testssl.sh",
  "100 % déterministe et reproductible — aucun LLM",
  "Coût nul, idéal en CI/CD et pour un premier passage",
  "Templates de vulnérabilités maintenus par la communauté",
];

export default function Engines() {
  return (
    <section id={HOME_SECTIONS.moteurs.id} className="border-t border-border py-24">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Le moteur</span>
          <h2
            className="mt-4 font-heading font-bold text-fg"
            data-size="4xl"
          >
            {HOME_SECTIONS.moteurs.title}
          </h2>
          <p className="mt-4 text-lg text-muted">
            Choisissez l'IA offensive de Strix ou la rigueur déterministe de
            l'open source. Les deux remontent leurs findings dans la même console,
            avec le même format d'export.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <article className="card relative overflow-hidden p-8">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand/12 text-brand">
                <IconBolt />
              </span>
              <span className="eyebrow">Moteur Strix — IA</span>
            </div>
            <h3 className="mt-4 font-heading text-2xl font-semibold text-fg">
              Le pentest offensif autonome
            </h3>
            <p className="mt-3 text-muted">
              Une équipe d'agents qui pensent comme des attaquants : ils exécutent
              votre application, enchaînent les vulnérabilités et les prouvent.
            </p>
            <ul className="mt-6 space-y-3">
              {STRIX.map((i) => (
                <Item key={i} accent="brand">{i}</Item>
              ))}
            </ul>
          </article>

          <article className="card relative overflow-hidden p-8">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-safe/12 text-safe">
                <IconCube />
              </span>
              <span className="eyebrow !text-safe">Moteur OSS — déterministe</span>
            </div>
            <h3 className="mt-4 font-heading text-2xl font-semibold text-fg">
              Le scan open source, rapide et reproductible
            </h3>
            <p className="mt-3 text-muted">
              Nuclei et testssl.sh exécutés dans un runner éphémère : un balayage
              fiable, sans dépendance à un fournisseur d'IA, à coût nul.
            </p>
            <ul className="mt-6 space-y-3">
              {OSS.map((i) => (
                <Item key={i} accent="safe">{i}</Item>
              ))}
            </ul>
          </article>
        </div>

        <div className="mt-10 text-center">
          <Link href="/signup" className="btn btn-primary">
            Lancer un scan gratuit
          </Link>
        </div>
      </div>
    </section>
  );
}

function Item({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent: "brand" | "safe";
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full"
        data-tint="soft" data-tone={accent}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m5 12 4 4 10-10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-[0.95rem] leading-relaxed text-muted">{children}</span>
    </li>
  );
}

function IconBolt() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
    </svg>
  );
}

function IconCube() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z" /><path d="M3 7l9 5 9-5M12 12v10" />
    </svg>
  );
}
