"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/format";

type Cible = { id: string; hote: string; dernier_controle: string | null; dernier_statut: string | null };
type Entree = { id: string; hote: string; date: string; gravite: "critique" | "important" | "info"; phrase: string; lu: boolean };

const TON = { critique: "risk", important: "warn", info: "muted" } as const;
const LIBELLE = { critique: "Critique", important: "Important", info: "Info" } as const;
const champ =
  "w-full rounded-xl border border-border-strong bg-bg px-4 py-3 text-fg outline-none placeholder:text-subtle focus:border-brand focus:ring-2 focus:ring-brand/30 disabled:opacity-60";

/** Surveillance quotidienne de la surface d'attaque : cibles, contrôle immédiat, journal des changements. */
export default function SurfacePanel() {
  const [cibles, setCibles] = useState<Cible[]>([]);
  const [entrees, setEntrees] = useState<Entree[]>([]);
  const [nonLus, setNonLus] = useState(0);
  const [hote, setHote] = useState("");
  const [enCours, setEnCours] = useState<string | null>(null);
  const toast = useToast();

  async function charger() {
    try {
      const r = await fetch("/api/surface");
      const d = await r.json();
      if (r.ok) {
        setCibles(d.cibles || []);
        setEntrees(d.journal || []);
        setNonLus(d.nonLus || 0);
      }
    } catch {
      /* hors ligne */
    }
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial
    charger();
  }, []);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/surface", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ hote }) });
    const d = await r.json();
    if (!r.ok) toast.error(d.error || "Ajout impossible.");
    else {
      setHote("");
      await charger();
    }
  }

  async function controler(c: Cible) {
    setEnCours(c.id);
    try {
      const r = await fetch(`/api/surface/${c.id}/controler`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) toast.error(d.error || "Contrôle impossible.");
      else toast.info(`${c.hote} : ${d.statut}.`);
      await charger();
    } finally {
      setEnCours(null);
    }
  }

  async function retirer(c: Cible) {
    if (!window.confirm(`Ne plus surveiller ${c.hote} ?`)) return;
    await fetch(`/api/surface?id=${c.id}`, { method: "DELETE" });
    await charger();
  }

  async function toutLu() {
    await fetch("/api/surface", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lu: true }) });
    await charger();
  }

  return (
    <section aria-labelledby="surface-titre" className="mt-10">
      <h2 id="surface-titre" className="font-heading text-2xl font-semibold text-fg">
        Surface d&apos;attaque
        {nonLus > 0 && (
          <span className="ml-3 rounded-full px-2.5 py-1 align-middle text-xs font-semibold" data-tint="soft" data-tone="brand">
            {nonLus} nouveau{nonLus > 1 ? "x" : ""}<span className="sr-only"> changement{nonLus > 1 ? "s" : ""} non lu{nonLus > 1 ? "s" : ""}</span>
          </span>
        )}
      </h2>
      <p className="mt-2 max-w-3xl text-sm text-muted">
        Chaque jour, Sentinel relève les ports exposés, le certificat et les protocoles TLS acceptés, l&apos;expiration du
        domaine, les nouveaux sous-domaines et les nouvelles routes, et les en-têtes de sécurité retirés ou affaiblis, puis
        compare avec la veille. Seulement sur les hôtes couverts par une autorisation écrite en cours (onglet Autorisations).
        Les changements importants et critiques sont aussi envoyés par e-mail aux propriétaires et administrateurs.
      </p>
      <p className="mt-2 max-w-3xl text-sm text-muted">
        Sur l&apos;offre Vercel Hobby, le contrôle automatique ne tourne qu&apos;une fois par jour (vers 6 h UTC) ; le bouton
        « Contrôler maintenant » permet un passage immédiat.
      </p>

      <form onSubmit={ajouter} className="card mt-5 flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="mb-1 block text-xs font-medium text-subtle">Hôte à surveiller</span>
          <input value={hote} onChange={(e) => setHote(e.target.value)} placeholder="app.exemple.fr" required className={champ} />
        </label>
        <button type="submit" className="btn btn-primary">Ajouter</button>
      </form>

      {cibles.length > 0 && (
        <ul className="mt-4 space-y-3">
          {cibles.map((c) => (
            <li key={c.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold text-fg">{c.hote}</p>
                <p className="text-xs text-subtle">
                  {c.dernier_controle ? `Dernier contrôle : ${formatDateTime(c.dernier_controle)} — ${c.dernier_statut ?? ""}` : "Jamais contrôlé"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => controler(c)}
                  disabled={enCours !== null}
                  aria-busy={enCours === c.id}
                  className="btn btn-ghost !py-2 text-sm disabled:opacity-60"
                >
                  {enCours === c.id ? "Contrôle en cours…" : "Contrôler maintenant"}
                  <span className="sr-only"> {c.hote}</span>
                </button>
                <button type="button" onClick={() => retirer(c)} className="btn btn-ghost !py-2 text-sm">
                  Retirer<span className="sr-only"> {c.hote}</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-heading text-lg font-semibold text-fg">Journal des changements</h3>
        {nonLus > 0 && (
          <button type="button" onClick={toutLu} className="btn btn-ghost !py-2 text-sm">Tout marquer comme lu</button>
        )}
      </div>
      {entrees.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Aucun changement enregistré.</p>
      ) : (
        <ol className="mt-3 space-y-2" aria-live="polite">
          {entrees.map((e) => (
            <li key={e.id} className="flex flex-wrap items-start gap-3 rounded-lg border border-border bg-card p-3 text-sm">
              <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" data-tint="soft" data-tone={TON[e.gravite]} data-sev={e.gravite === "critique" ? "critical" : undefined}>
                {LIBELLE[e.gravite]}
              </span>
              <span className="min-w-0 flex-1 text-fg">
                {e.phrase}
                {!e.lu && <span className="ml-2 text-xs font-semibold text-brand">nouveau</span>}
              </span>
              <time dateTime={e.date} className="text-xs text-subtle">{formatDateTime(e.date)}</time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
