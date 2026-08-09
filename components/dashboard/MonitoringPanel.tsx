"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [url, setUrl] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/scheduled");
    if (res.ok) setSchedules((await res.json()).schedules || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
  }

  async function remove(id: string) {
    const res = await fetch("/api/scheduled", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const d = await res.json();
    if (res.ok) setSchedules(d.schedules || []);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-xl">
        <div className="container-x flex h-[64px] items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/logo-mark.png" alt="Sentinel by Kayzen" width={32} height={32} className="h-8 w-auto" />
              <span className="font-heading text-base font-semibold text-fg">
                Sentinel <span className="text-subtle">Console</span>
              </span>
            </Link>
            <nav className="hidden gap-1 sm:flex">
              <Link href="/dashboard" className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-fg">
                Scanner
              </Link>
              <Link href="/dashboard/pentest" className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-fg">
                Pentest autonome
              </Link>
              <span className="rounded-lg bg-hover px-3 py-1.5 text-sm font-medium text-fg">
                Surveillance
              </span>
              <Link href="/dashboard/team" className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-fg">
                Équipe
              </Link>
            </nav>
          </div>
          <button onClick={logout} className="btn btn-ghost !px-3.5 !py-2 text-sm">
            Déconnexion
          </button>
        </div>
      </header>

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
          <button type="submit" className="btn btn-primary">
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
                    ` · ${new Date(s.last_run_at).toLocaleDateString("fr-FR")}`}
                </p>
              </div>
              <button
                onClick={() => remove(s.id)}
                className="flex-none rounded-md px-2.5 py-1 text-xs text-risk transition-colors hover:bg-hover"
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
