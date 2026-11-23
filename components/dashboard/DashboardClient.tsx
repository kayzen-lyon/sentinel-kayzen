"use client";
/* eslint-disable @next/next/no-img-element -- petit logo local ; next/image impose un style en ligne que la CSP interdit */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ScanResult } from "@/lib/scanner";
import ScanResultView, { type ScanComparison } from "./ScanResultView";
import { diffFindings } from "@/lib/scanDiff";
import { controlsFor, controlsLabel } from "@/lib/compliance";

type HistoryItem = {
  id: string | null;
  target_url: string;
  grade: string | null;
  score: number | null;
  status: string;
  deep?: boolean | null;
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
  dbConfigured,
  initialScans,
}: {
  dbConfigured: boolean;
  initialScans: HistoryItem[];
}) {
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [resultDeep, setResultDeep] = useState(false);
  const [scans, setScans] = useState<HistoryItem[]>(initialScans);
  const [historyFilter, setHistoryFilter] = useState("");
  const [comparison, setComparison] = useState<ScanComparison | null>(null);
  // Scan affiché (pour proposer la comparaison avec n'importe quel autre scan de la même cible).
  const [currentKey, setCurrentKey] = useState<string | null>(null);

  /** Compare `current` au scan terminé précédent de la même cible, pris dans `older`. */
  async function compareWithPrevious(current: ScanResult, older: HistoryItem[]) {
    setComparison(null);
    const host = prettyHost(current.targetUrl);
    const prev = older.find((s) => s.status === "done" && prettyHost(s.target_url) === host);
    if (!prev) return;
    let findings = prev.result?.findings;
    if (!findings && prev.id) {
      try {
        const res = await fetch(`/api/scan/${prev.id}`);
        if (res.ok) findings = (await res.json()).scan?.findings;
      } catch {
        /* pas de comparaison */
      }
    }
    if (!findings) return;
    setComparison({
      diff: diffFindings(findings, current.findings),
      baselineDate: prev.created_at,
      baselineScore: prev.score,
    });
  }
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  async function performScan(target: string) {
    if (!target.trim() || scanning) return;
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
        body: JSON.stringify({ url: target }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Le scan a échoué.");
      } else {
        const data = await res.json();
        const r: ScanResult = data.result;
        setResult(r);
        setResultDeep(Boolean(data.deep));
        setCurrentKey(data.id ?? null);
        void compareWithPrevious(r, scans);
        setScans((prev) => [
          {
            id: data.id ?? null,
            target_url: r.targetUrl,
            grade: r.grade,
            score: r.score,
            status: "done",
            deep: Boolean(data.deep),
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

  // Rapport professionnel (couverture, synthèse, chapitres par sujet, fiches, plan d'action, annexes)
  // assemblé côté serveur à partir du scan enregistré : jamais à partir des chiffres de cette page.
  const [rapportEnCours, setRapportEnCours] = useState(false);
  const scanEnregistre = Boolean(currentKey && /^[0-9a-f-]{36}$/i.test(currentKey));
  async function rapportComplet() {
    if (!result || !scanEnregistre || rapportEnCours) return;
    setRapportEnCours(true);
    setError(null);
    try {
      let hote = result.targetUrl;
      try {
        hote = new URL(result.targetUrl).hostname;
      } catch {
        /* adresse brute */
      }
      const res = await fetch("/api/rapports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ titre: `Rapport de sécurité — ${hote}`, scanIds: [currentKey], jobIds: [] }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.id) window.location.assign(`/dashboard/rapports/${d.id}`);
      else setError(d.error || "Impossible de préparer le rapport.");
    } finally {
      setRapportEnCours(false);
    }
  }

  async function openHistory(item: HistoryItem) {
    const older = scans.slice(scans.indexOf(item) + 1);
    setCurrentKey(item.id ?? item.created_at);
    if (item.result) {
      setResult(item.result);
      setResultDeep(Boolean(item.deep));
      void compareWithPrevious(item.result, older);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!item.id) return;
    try {
      const res = await fetch(`/api/scan/${item.id}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.scan?.findings) {
        const opened: ScanResult = {
          targetUrl: data.scan.target_url,
          grade: data.scan.grade,
          score: data.scan.score,
          summary: data.scan.summary,
          findings: data.scan.findings,
          insights: data.scan.insights ?? undefined,
        };
        setResult(opened);
        void compareWithPrevious(opened, older);
        setResultDeep(Boolean(data.scan.deep));
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch {
      /* ignore */
    }
  }

  function download(content: string, type: string, ext: string) {
    if (!result) return;
    const blob = new Blob([content], { type });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `sentinel-scan-${prettyHost(result.targetUrl)}.${ext}`;
    a.click();
    // Le telechargement demarre de maniere asynchrone : liberer le Blob au tick suivant.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }

  function exportJson() {
    if (result) download(JSON.stringify(result, null, 2), "application/json", "json");
  }

  function exportCsv() {
    if (!result) return;
    const esc = (v: string) => `"${(v || "").replace(/"/g, '""')}"`;
    const header = "titre,gravite,etat,categorie,effort,owasp,cwe,wstg,detail,recommandation,conformite";
    const rows = result.findings.map((f) =>
      [f.title, f.severity, f.state, f.category, f.effort || "", f.owasp || "", f.cwe || "", f.wstg || "", f.detail, f.recommendation || "", f.state === "pass" ? "" : controlsLabel(controlsFor(f.id, f.category))]
        .map(esc)
        .join(",")
    );
    download("﻿" + [header, ...rows].join("\r\n"), "text/csv;charset=utf-8", "csv");
  }

  function exportJunit() {
    if (!result) return;
    const esc = (s: string) =>
      (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const rank: Record<string, number> = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
    const shown = result.findings.filter((f) => f.state === "fail" || f.state === "warn");
    const fails = shown.filter((f) => (rank[f.severity] ?? 0) >= 3);
    const cases = shown
      .map((f) => {
        const name = esc(`[${f.severity.toUpperCase()}] ${f.title}`);
        const cls = esc(f.category || "security");
        if ((rank[f.severity] ?? 0) < 3) return `    <testcase name="${name}" classname="${cls}" />`;
        const body = esc([f.detail, f.recommendation].filter(Boolean).join("\n\n"));
        return `    <testcase name="${name}" classname="${cls}">\n      <failure message="${esc(f.title)}">${body}</failure>\n    </testcase>`;
      })
      .join("\n");
    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n<testsuites>\n` +
      `  <testsuite name="Sentinel scan" hostname="${esc(prettyHost(result.targetUrl))}" tests="${shown.length}" failures="${fails.length}">\n` +
      `${cases}\n  </testsuite>\n</testsuites>\n`;
    download(xml, "application/xml;charset=utf-8", "junit.xml");
  }

  // Comparaison au choix : tous les autres scans terminés de la même cible.
  const compareChoices = result
    ? scans.filter(
        (x) =>
          x.status === "done" &&
          prettyHost(x.target_url) === prettyHost(result.targetUrl) &&
          (x.id ?? x.created_at) !== currentKey &&
          x.result !== result
      )
    : [];

  // Filtre de l'historique par cible
  const historyHosts = [...new Set(scans.map((x) => prettyHost(x.target_url)))].sort();

  // Historique des scores pour le domaine courant (sparkline)
  const history = result
    ? scans
        .filter((x) => prettyHost(x.target_url) === prettyHost(result.targetUrl) && x.score != null)
        .map((x) => x.score as number)
        .reverse()
    : [];

  return (
    <div className="min-h-screen">
      <main className="container-x py-8 lg:py-10">
          <>
            <h1 className="font-heading text-3xl font-bold text-fg">Scanner de sécurité</h1>
            <p className="mt-2 text-muted">
              Entrez l'URL de votre site. Sentinel analyse sa posture de sécurité en temps
              réel — de façon passive et non-intrusive.
            </p>

            {!dbConfigured && (
              <p className="mt-4 rounded-lg border border-warn/30 bg-warn/10 px-4 py-2.5 text-sm text-warn">
                Mode démo : la base n'est pas connectée, l'historique ne sera pas conservé.
                Le scan fonctionne normalement.
              </p>
            )}

            <div className="no-print card mt-6 p-5">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  performScan(url);
                }}
                className="flex flex-col gap-3 sm:flex-row sm:items-end"
              >
                <label className="flex-1">
                  <span className="mb-1 block text-xs font-medium text-subtle">
                    URL à scanner
                  </span>
                  <span className="relative block">
                    <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-subtle" aria-hidden="true">
                      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15zM16 16l5 5" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      inputMode="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://mon-site.fr"
                      disabled={scanning}
                      className="w-full rounded-xl border border-border-strong bg-bg py-3 pl-10 pr-4 text-fg outline-none transition-colors placeholder:text-subtle focus:border-brand focus:ring-2 focus:ring-brand/30 disabled:opacity-60"
                    />
                  </span>
                </label>
                <button type="submit" disabled={scanning} aria-busy={scanning} className="btn btn-primary disabled:opacity-60">
                  {scanning ? "Scan en cours…" : "Lancer le scan"}
                </button>
              </form>
            </div>

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
                          key={p}
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

                {!scanning && result && (
                  <div>
                    <div className="no-print mb-4 flex flex-wrap items-center gap-2">
                      {resultDeep ? (
                        <span className="rounded-full bg-brand/14 px-3 py-1 text-xs font-semibold text-brand-light">
                          Scan approfondi (domaine vérifié)
                        </span>
                      ) : (
                        <span className="rounded-full bg-hover px-3 py-1 text-xs font-semibold text-muted">
                          Scan standard
                        </span>
                      )}
                      <div className="ml-auto flex gap-2">
                        <button
                          onClick={() => performScan(result.targetUrl)}
                          className="btn btn-ghost !px-3 !py-1.5 text-xs"
                        >
                          ↻ Re-scanner
                        </button>
                        <button onClick={exportJson} className="btn btn-ghost !px-3 !py-1.5 text-xs">
                          JSON
                        </button>
                        <button onClick={exportCsv} className="btn btn-ghost !px-3 !py-1.5 text-xs">
                          CSV
                        </button>
                        <button onClick={exportJunit} className="btn btn-ghost !px-3 !py-1.5 text-xs">
                          JUnit
                        </button>
                        <button onClick={() => window.print()} className="btn btn-ghost !px-3 !py-1.5 text-xs">
                          Imprimer cette page
                        </button>
                        <button
                          onClick={rapportComplet}
                          disabled={rapportEnCours || !scanEnregistre}
                          aria-busy={rapportEnCours}
                          title={scanEnregistre ? undefined : "Disponible pour un scan enregistré dans votre compte"}
                          className="btn btn-primary !px-3 !py-1.5 text-xs disabled:opacity-60"
                        >
                          {rapportEnCours ? "Préparation du rapport…" : "Rapport complet (PDF)"}
                        </button>
                      </div>
                    </div>
                    {history.length >= 2 && (
                      <div className="no-print mb-4 flex items-center gap-3 rounded-lg border border-border bg-bg-elev/40 px-4 py-3">
                        <span className="text-xs font-medium text-muted">Évolution du score</span>
                        <Sparkline values={history} />
                        {/* Valeurs de la courbe, pour les lecteurs d'écran (la courbe est décorative). */}
                        <table className="sr-only">
                          <caption>Scores des derniers scans, du plus ancien au plus récent</caption>
                          <tbody>
                            {history.map((v, i) => (
                              <tr key={i}>
                                <th scope="row">Scan {i + 1}</th>
                                <td>{v}/100</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <span className="text-xs text-subtle">
                          {history.length} scan{history.length > 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                    {!resultDeep && (
                      <p className="no-print mb-4 rounded-lg border border-border bg-bg-elev/60 px-4 py-2.5 text-sm text-muted">
                        Astuce : vérifiez la propriété de ce domaine dans l'onglet{" "}
                        <Link href="/dashboard/domaines" className="font-medium text-brand-light hover:underline">
                          Domaines
                        </Link>{" "}
                        pour débloquer le scan approfondi : fichiers et consoles exposés, sous-domaines et prise de contrôle, secrets dans le JavaScript, WordPress, pages d'erreur…
                      </p>
                    )}
                    {compareChoices.length > 0 && (
                      <div className="no-print mb-4 flex flex-wrap items-center gap-2 text-sm">
                        <label htmlFor="compare-with" className="text-muted">Comparer avec le scan du</label>
                        <select
                          id="compare-with"
                          className="input !w-auto !py-1.5 text-sm"
                          value={comparison?.baselineDate ?? ""}
                          onChange={(e) => {
                            const chosen = compareChoices.find((x) => x.created_at === e.target.value);
                            if (chosen) void compareWithPrevious(result, [chosen]);
                          }}
                        >
                          {!comparison && <option value="">— choisir —</option>}
                          {compareChoices.map((x) => (
                            <option key={x.id ?? x.created_at} value={x.created_at}>
                              {formatDate(x.created_at)} · {x.grade ?? "—"} ({x.score ?? "?"}/100)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <ScanResultView result={result} comparison={comparison} />
                  </div>
                )}

                {!scanning && !result && (
                  <div className="card grid place-items-center p-12 text-center">
                    <img src="/logo-mark.png" decoding="async" alt="" width={64} height={64} className="w-16 opacity-40" />
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

              <aside className="no-print">
                <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-subtle">
                  Historique
                </h2>
                {scans.length === 0 ? (
                  <p className="mt-3 text-sm text-subtle">Vos scans apparaîtront ici.</p>
                ) : (
                  <>
                  {historyHosts.length > 1 && (
                    <>
                      <label htmlFor="hist-filter" className="sr-only">Filtrer par cible</label>
                      <select
                        id="hist-filter"
                        value={historyFilter}
                        onChange={(e) => setHistoryFilter(e.target.value)}
                        className="input mt-3 !py-1.5 text-sm"
                      >
                        <option value="">Toutes les cibles ({scans.length})</option>
                        {historyHosts.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </>
                  )}
                  <ul className="mt-3 space-y-2">
                    {scans.filter((x) => !historyFilter || prettyHost(x.target_url) === historyFilter).map((item) => (
                      <li
                        key={item.id ?? `${item.created_at}-${item.target_url}`}
                        className="group relative"
                      >
                        <button
                          onClick={() => openHistory(item)}
                          className="card flex w-full items-center gap-3 p-3 text-left"
                        >
                          <GradeChip grade={item.grade} />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate text-sm font-medium text-fg">
                                {prettyHost(item.target_url)}
                              </span>
                              {item.deep && (
                                <span className="rounded bg-brand/15 px-1 text-[0.6rem] font-semibold text-brand-light">
                                  deep
                                </span>
                              )}
                            </span>
                            <span className="block text-xs text-subtle">
                              {formatDate(item.created_at)}
                            </span>
                          </span>
                        </button>
                        <button
                          onClick={() => performScan(item.target_url)}
                          title="Re-scanner"
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-bg px-2 py-1 text-xs text-muted opacity-0 transition-opacity hover:text-fg group-hover:opacity-100"
                        >
                          ↻
                        </button>
                      </li>
                    ))}
                  </ul>
                  </>
                )}
              </aside>
            </div>
          </>
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
      data-tint="soft" data-tone={c}
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

function Sparkline({ values }: { values: number[] }) {
  const w = 120;
  const h = 28;
  const max = 100;
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = values.length === 1 ? w : (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = values[values.length - 1];
  const color = last >= 80 ? "safe" : last >= 50 ? "warn" : "risk";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="sparkline flex-1" aria-hidden="true">
      <polyline
        points={pts.join(" ")}
        fill="none"
        data-tint="stroke"
        data-tone={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
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
      timeZone: "Europe/Paris",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
