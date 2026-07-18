"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ScanResult } from "@/lib/scanner";
import ScanResultView from "./ScanResultView";

type HistoryItem = {
  id: string | null;
  target_url: string;
  grade: string | null;
  score: number | null;
  status: string;
  created_at: string;
  result?: ScanResult;
};

const PROGRESS = [
  "Résolution DNS & vérification de la cible…",
  "Récupération des en-têtes HTTP…",
  "Analyse TLS, HSTS et redirections…",
  "Contrôle CSP, cookies et CORS…",
  "Recherche d'expositions (security.txt, fichiers sensibles)…",
  "Calcul du score de posture…",
];

export default function DashboardClient({
  user,
  dbConfigured,
  initialScans,
}: {
  user: { email: string; name?: string | null };
  dbConfigured: boolean;
  initialScans: HistoryItem[];
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scans, setScans] = useState<HistoryItem[]>(initialScans);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  async function runScan(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || scanning) return;
    setError(null);
    setResult(null);
    setScanning(true);
    setStep(0);
    timer.current = setInterval(
      () => setStep((s) => (s < PROGRESS.length - 1 ? s + 1 : s)),
      900
    );
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Le scan a échoué.");
      } else {
        const r: ScanResult = data.result;
        setResult(r);
        setScans((prev) => [
          {
            id: data.id ?? null,
            target_url: r.targetUrl,
            grade: r.grade,
            score: r.score,
            status: "done",
            created_at: new Date().toISOString(),
            result: r,
          },
          ...prev,
        ]);
      }
    } catch {
      setError("Impossible de contacter le serveur de scan.");
    } finally {
      if (timer.current) clearInterval(timer.current);
      setScanning(false);
    }
  }

  async function openHistory(item: HistoryItem) {
    if (item.result) {
      setResult(item.result);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!item.id) return;
    try {
      const res = await fetch(`/api/scan/${item.id}`);
      const data = await res.json();
      if (res.ok && data.scan?.findings) {
        setResult({
          targetUrl: data.scan.target_url,
          grade: data.scan.grade,
          score: data.scan.score,
          summary: data.scan.summary,
          findings: data.scan.findings,
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch {
      /* ignore */
    }
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
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo-mark.png" alt="Sentinel by Kayzen" width={32} height={32} className="h-8 w-auto" />
            <span className="font-heading text-base font-semibold text-fg">
              Sentinel <span className="text-subtle">Console</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:inline">{user.name || user.email}</span>
            <button onClick={logout} className="btn btn-ghost !px-3.5 !py-2 text-sm">
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="container-x py-10">
        <h1 className="font-heading text-3xl font-bold text-fg">
          Scanner de sécurité
        </h1>
        <p className="mt-2 text-muted">
          Entrez l'URL de votre site. Sentinel analyse sa posture de sécurité en
          temps réel — de façon passive et non-intrusive.
        </p>

        {!dbConfigured && (
          <p className="mt-4 rounded-lg border border-warn/30 bg-warn/10 px-4 py-2.5 text-sm text-warn">
            Mode démo : la base n'est pas encore connectée, l'historique ne sera
            pas conservé entre les sessions. Le scan fonctionne normalement.
          </p>
        )}

        <form onSubmit={runScan} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://mon-site.fr"
            disabled={scanning}
            className="flex-1 rounded-xl border border-border-strong bg-bg px-4 py-3 text-fg outline-none transition-colors placeholder:text-subtle focus:border-brand focus:ring-2 focus:ring-brand/30 disabled:opacity-60"
          />
          <button type="submit" disabled={scanning} className="btn btn-primary disabled:opacity-60">
            {scanning ? "Scan en cours…" : "Lancer le scan"}
          </button>
        </form>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-risk/30 bg-risk/10 px-4 py-2.5 text-sm text-risk">
            {error}
          </p>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <section aria-live="polite">
            {scanning && (
              <div className="card p-6">
                <div className="flex items-center gap-3">
                  <Spinner />
                  <span className="font-heading font-semibold text-fg">Analyse en cours…</span>
                </div>
                <ul className="mt-4 space-y-2">
                  {PROGRESS.map((p, i) => (
                    <li
                      key={i}
                      className={`flex items-center gap-2 text-sm transition-colors ${
                        i < step ? "text-safe" : i === step ? "text-fg" : "text-subtle"
                      }`}
                    >
                      <span className="w-4">{i < step ? "✓" : i === step ? "›" : "·"}</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!scanning && result && <ScanResultView result={result} />}

            {!scanning && !result && (
              <div className="card grid place-items-center p-12 text-center">
                <Image src="/logo-mark.png" alt="" width={64} height={64} className="h-16 w-auto opacity-40" />
                <p className="mt-4 font-heading text-lg font-semibold text-fg">
                  Aucun scan pour le moment
                </p>
                <p className="mt-1 max-w-sm text-sm text-muted">
                  Lancez votre premier scan pour obtenir une note de sécurité de A à F
                  et une liste de recommandations concrètes.
                </p>
              </div>
            )}
          </section>

          <aside>
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-subtle">
              Historique
            </h2>
            {scans.length === 0 ? (
              <p className="mt-3 text-sm text-subtle">Vos scans apparaîtront ici.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {scans.map((item, i) => (
                  <li key={item.id ?? i}>
                    <button
                      onClick={() => openHistory(item)}
                      className="card flex w-full items-center gap-3 p-3 text-left"
                    >
                      <GradeChip grade={item.grade} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-fg">
                          {prettyHost(item.target_url)}
                        </span>
                        <span className="block text-xs text-subtle">
                          {formatDate(item.created_at)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

function GradeChip({ grade }: { grade: string | null }) {
  const c =
    grade === "A" || grade === "B" ? "safe" : grade === "C" || grade === "D" ? "warn" : "risk";
  return (
    <span
      className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg font-heading text-sm font-bold"
      style={{ backgroundColor: `rgb(var(--${c}) / 0.14)`, color: `rgb(var(--${c}))` }}
    >
      {grade ?? "—"}
    </span>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
  );
}

function prettyHost(u: string): string {
  try {
    return new URL(u).host;
  } catch {
    return u;
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
