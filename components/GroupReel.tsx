/* eslint-disable @next/next/no-img-element -- vignettes locales ; next/image impose un style en ligne que la CSP interdit */
/* Défilement des applications du groupe (styles .apv-reel-* dans globals.css), à la suite de la section « L'écosystème Kayzen ».
   Noms et liens : KAYZEN_APPS (lib/company.ts), déjà affichés dans le pied de page.
   Captures : celles du dépôt de kayzen-lyon.com (src/assets/portfolio), réduites à 800 px.
   Deux rangées en sens opposés, pause au survol et au focus ; sans animation si le
   visiteur a demandé de les réduire (les rangées défilent alors à la main). */
import { KAYZEN_APPS } from "@/lib/company";

const SHOTS: Record<string, string> = {
  "Kayzen Web (agence)": "kayzen-web",
  Nexus: "nexus",
  Konforme: "konforme",
  Konsent: "konsent",
  "Sésame": "sesame",
  "Sésame Éclair": "eclair",
  "Kayzen VPN": "vpn",
};

const APPS = KAYZEN_APPS.filter((a) => SHOTS[a.name]).map((a) => ({
  ...a,
  shot: `/groupe/${SHOTS[a.name]}.webp`,
  host: new URL(a.href).host.replace(/^www\./, ""),
}));

function Cards({ items, hidden = false }: { items: typeof APPS; hidden?: boolean }) {
  return (
    // Copie de la boucle : décorative et inerte, sans lien (ni focus, ni lecteur d'écran) [WCAG 4.1.2 ; RGAA 10.8].
    <ul className="apv-reel-list" aria-hidden={hidden || undefined} inert={hidden || undefined}>
      {items.map((app) => {
        const Wrap = hidden ? "span" : "a";
        const link = hidden ? {} : { href: app.href, target: "_blank", rel: "noopener noreferrer" };
        return (
        <li key={app.name} className="apv-reel-card">
          <Wrap {...link}>
            <span className="apv-reel-shot">
              <img src={app.shot} alt="" width={800} height={450} loading="lazy" decoding="async" />
            </span>
            <span className="apv-reel-body">
              <span className="apv-reel-name">{app.name}</span>
              <span className="apv-reel-host">
                {app.host} <span aria-hidden="true">↗</span>
                <span className="sr-only"> (nouvel onglet)</span>
              </span>
            </span>
          </Wrap>
        </li>
        );
      })}
    </ul>
  );
}

function Row({ items, back = false }: { items: typeof APPS; back?: boolean }) {
  return (
    <div className={back ? "apv-reel-row apv-reel-row--back" : "apv-reel-row"}>
      <div className="apv-reel-track">
        <Cards items={items} />
        <Cards items={items} hidden />
      </div>
    </div>
  );
}

export default function GroupReel() {
  return (
    <section className="apv-reel" aria-labelledby="apv-reel-title">
      <div className="container-x">
        <h3 id="apv-reel-title" className="font-heading text-xl font-semibold text-fg">
          Les autres applications conçues par Kayzen.
        </h3>
      </div>
      <Row items={APPS} />
      <Row items={[...APPS].reverse()} back />
    </section>
  );
}
