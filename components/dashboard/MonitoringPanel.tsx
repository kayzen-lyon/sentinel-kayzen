"use client";

import { useEffect, useState } from "react";
import ConsoleHeader from "@/components/dashboard/ConsoleHeader";
import { formatDate } from "@/lib/format";

type Schedule = {
  id: string;
  target_url: string;
  frequency: "daily" | "weekly";
  enabled: boolean;
  last_run_at: string | null;
  last_score: number | null;
};

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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

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
    setError(null);
    try {
      const res = await fetch("/api/scheduled", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, frequency }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || "Échec.");
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

  return (
    <div className="min-h-screen">
      <ConsoleHeader active="monitoring" />

      <main className="container-x py-10">
        <h1 className="font-heading text-3xl font-bold text-fg">Surveillance planifiée</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Sentinel rescanne automatiquement vos cibles et vous alerte (Slack / webhook) en cas de
          <strong className="text-fg"> régression du score de sécurité</strong>. Scan passif ;
          approfondi si le domaine est vérifié.
        </p>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-risk/30 bg-risk/10 px-4 py-2.5 text-sm text-risk">
            {error}
          </p>
        )}

        <form onSubmit={add} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://mon-site.fr"
            className="input flex-1"
            aria-label="URL à surveiller"
            required
          />
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as "daily" | "weekly")}
            className="input sm:w-44"
            aria-label="Fréquence"
          >
            <option value="daily">Quotidien</option>
            <option value="weekly">Hebdomadaire</option>
          </select>
          <button type="submit" disabled={busy} className="btn btn-primary disabled:opacity-60">
            Surveiller
          </button>
        </form>

        <ul className="mt-8 space-y-2">
          {loading && <li className="text-sm text-muted">Chargement…</li>}
          {!loading && schedules.length === 0 && (
            <li className="text-sm text-muted">Aucune cible surveillée.</li>
          )}
          {schedules.map((s) => (
            <li key={s.id} className="card flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-fg">{prettyHost(s.target_url)}</p>
                <p className="text-xs text-subtle">
                  {s.frequency === "daily" ? "Quotidien" : "Hebdomadaire"}
                  {s.last_score != null && ` · dernier score ${s.last_score}/100`}
                  {s.last_run_at &&
                    ` · ${formatDate(s.last_run_at)}`}
                </p>
              </div>
              <button
                onClick={() => remove(s.id)}
                disabled={busy}
                className="flex-none rounded-md px-2.5 py-1 text-xs text-risk transition-colors hover:bg-hover disabled:opacity-60"
              >
                Retirer
              </button>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
