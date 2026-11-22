"use client";

import { useEffect, useState } from "react";
import { Info, OctagonAlert, TriangleAlert } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { formatDate, formatDateTime } from "@/lib/format";
import { CATEGORIE_LABELS, JOURNAL_MAX, type Changement, type Gravite } from "@/lib/surveillance";

type Schedule = {
  id: string;
  target_url: string;
  frequency: "daily" | "weekly";
  enabled: boolean;
  last_run_at: string | null;
  last_score: number | null;
  journal: Changement[] | null;
};

/** Gravité : icône + texte (jamais la couleur seule). */
const GRAVITE: Record<Gravite, { label: string; tone: string; Icon: typeof Info }> = {
  critique: { label: "Critique", tone: "risk", Icon: OctagonAlert },
  important: { label: "Important", tone: "warn", Icon: TriangleAlert },
  info: { label: "Info", tone: "muted", Icon: Info },
};

const JOURNAL_AFFICHE = 50;

function Journal({ entries }: { entries: Changement[] }) {
  if (!entries.length)
    return <p className="mt-3 text-xs text-subtle">Aucun changement relevé pour l&apos;instant.</p>;
  return (
    <details open className="mt-3">
      <summary className="cursor-pointer text-xs font-medium text-muted">
        Journal des changements (<span className="tabular-nums">{entries.length}</span>
        {entries.length >= JOURNAL_MAX && <> · <span className="tabular-nums">{JOURNAL_MAX}</span> derniers conservés</>})
      </summary>
      <ol className="mt-2 space-y-1.5">
        {entries.slice(0, JOURNAL_AFFICHE).map((c, i) => {
          const g = GRAVITE[c.gravite] ?? GRAVITE.info;
          return (
            <li key={`${c.date}-${i}`} className="flex flex-wrap items-start gap-x-2 gap-y-1 text-xs">
              <time dateTime={c.date} className="flex-none tabular-nums text-subtle">
                {formatDateTime(c.date)}
              </time>
              <span
                className="inline-flex flex-none items-center gap-1 rounded-full px-2 py-0.5 font-semibold"
                data-tint="soft"
                data-tone={g.tone}
              >
                <g.Icon aria-hidden="true" className="h-3 w-3" />
                {g.label}
              </span>
              <span className="flex-none text-subtle">{CATEGORIE_LABELS[c.categorie] ?? c.categorie}</span>
              <span className="min-w-0 text-fg">{c.message}</span>
            </li>
          );
        })}
      </ol>
      {entries.length > JOURNAL_AFFICHE && (
        <p className="mt-2 text-xs text-subtle">
          <span className="tabular-nums">{JOURNAL_AFFICHE}</span> entrées les plus récentes affichées.
        </p>
      )}
    </details>
  );
}

function prettyHost(u: string): string {
  try {
    return new URL(u).host;
  } catch {
    return u;
  }
}

export default function MonitoringPanel() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [url, setUrl] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);
  const toast = useToast();

  async function load(signal?: AbortSignal) {
    const res = await fetch("/api/scheduled", { signal });
    if (res.ok) setSchedules((await res.json()).schedules || []);
    setLoading(false);
  }
  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal).catch(() => {});
    return () => ac.abort();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/scheduled", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, frequency }),
      });
      const d = await res.json();
      if (!res.ok) {
        toast.error(d.error || "Échec.");
        return;
      }
      setSchedules(d.schedules || []);
      setUrl("");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/scheduled", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const d = await res.json();
      if (res.ok) setSchedules(d.schedules || []);
    } finally {
      setBusy(false);
    }
  }

  async function checkNow(id: string) {
    if (busy || checking) return;
    setChecking(id);
    try {
      const res = await fetch("/api/scheduled/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error || "Échec du contrôle.");
        return;
      }
      setSchedules(d.schedules || []);
    } finally {
      setChecking(null);
    }
  }

  return (
    <div className="min-h-screen">
      <main className="container-x py-8 lg:py-10">
        <h1 className="font-heading text-3xl font-bold text-fg">Surveillance planifiée</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Sentinel rescanne automatiquement vos cibles et compare chaque passage au précédent :
          <strong className="text-fg"> en-têtes de sécurité, certificat, protocoles TLS, expiration du
          domaine</strong>, et sous-domaines et routes exposées si le domaine est vérifié. Les
          changements importants ou critiques vous sont signalés (Slack / webhook, e-mail si configuré).
        </p>
        <p className="mt-2 max-w-2xl text-sm text-subtle">
          Sur l&apos;offre Vercel Hobby, la surveillance automatique ne tourne qu&apos;une fois par
          jour (même pour une fréquence quotidienne). Le bouton « Contrôler maintenant » lance un
          contrôle immédiat.
        </p>


        <form onSubmit={add} className="no-print card mt-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
          <label className="flex-1">
            <span className="mb-1 block text-xs font-medium text-subtle">URL à surveiller</span>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://mon-site.fr"
              className="input"
              required
            />
          </label>
          <label className="sm:w-44 sm:flex-none">
            <span className="mb-1 block text-xs font-medium text-subtle">Fréquence</span>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as "daily" | "weekly")}
              className="input"
            >
              <option value="daily">Quotidien</option>
              <option value="weekly">Hebdomadaire</option>
            </select>
          </label>
          <button type="submit" disabled={busy} aria-busy={busy} className="btn btn-primary disabled:opacity-60">
            Surveiller
          </button>
        </form>

        <ul className="mt-8 space-y-2">
          {loading &&
          Array.from({ length: 3 }).map((_, i) => (
            <li key={`sk-${i}`} className="card p-3">
              <div className="skeleton h-4 w-2/3" />
            </li>
          ))}
          {!loading && schedules.length === 0 && (
            <li className="text-sm text-muted">Aucune cible surveillée.</li>
          )}
          {schedules.map((s) => (
            <li key={s.id} className="card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fg">{prettyHost(s.target_url)}</p>
                  <p className="text-xs text-subtle tabular-nums">
                    {s.frequency === "daily" ? "Quotidien" : "Hebdomadaire"}
                    {s.last_score != null && ` · dernier score ${s.last_score}/100`}
                    {s.last_run_at &&
                      ` · ${formatDate(s.last_run_at)}`}
                  </p>
                </div>
                <div className="flex flex-none items-center gap-1">
                  <button
                    onClick={() => checkNow(s.id)}
                    disabled={busy || checking !== null}
                    aria-busy={checking === s.id}
                    className="rounded-md px-2.5 py-1 text-xs text-fg transition-colors hover:bg-hover disabled:opacity-60"
                  >
                    {checking === s.id ? "Contrôle en cours…" : "Contrôler maintenant"}
                  </button>
                  <button
                    onClick={() => remove(s.id)}
                    disabled={busy || checking !== null}
                    className="rounded-md px-2.5 py-1 text-xs text-risk transition-colors hover:bg-hover disabled:opacity-60"
                  >
                    Retirer
                  </button>
                </div>
              </div>
              <Journal entries={s.journal ?? []} />
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
