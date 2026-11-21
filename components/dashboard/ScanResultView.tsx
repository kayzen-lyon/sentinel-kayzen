"use client";

import { useEffect, useState } from "react";
import type { Finding, ScanResult, Severity } from "@/lib/scanner";
import { complianceSummary, controlsFor, controlsLabel, FRAMEWORK_LABELS } from "@/lib/compliance";
import type { ScanDiff } from "@/lib/scanDiff";
import { formatDateTime } from "@/lib/format";
import { ATTACK_CLASS_LABELS, type SurfaceItem } from "@/lib/surface";

/** Comparaison avec le scan précédent de la même cible (calculée par l’appelant). */
export type ScanComparison = { diff: ScanDiff<Finding>; baselineDate: string; baselineScore: number | null };

const SEV: Record<Severity, { label: string; color: string }> = {
  critical: { label: "Critique", color: "risk" },
  high: { label: "Élevé", color: "risk" },
  medium: { label: "Moyen", color: "warn" },
  low: { label: "Faible", color: "warn" },
  info: { label: "Info", color: "brand-light" },
};

function gradeColor(grade: string): string {
  if (grade === "A" || grade === "B") return "safe";
  if (grade === "C" || grade === "D") return "warn";
  return "risk";
}

function useCountUp(target: number, duration = 700): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

export default function ScanResultView({
  result,
  comparison,
}: {
  result: ScanResult;
  comparison?: ScanComparison | null;
}) {
  const gc = gradeColor(result.grade);
  const s = result.summary;
  const score = useCountUp(result.score);
  const [filter, setFilter] = useState<"all" | "problems" | "new">("all");
  const onlyProblems = filter === "problems";
  const newIds = new Set((comparison?.diff.added || []).map((f) => f.id));
  const compliance = complianceSummary(
    result.findings.map((f) => ({ id: f.id, category: f.category, failing: f.state === "fail" || f.state === "warn" }))
  );

  const problems = result.findings.filter(
    (f) => f.state === "fail" || f.state === "warn"
  ).length;
  const shown =
    filter === "new"
      ? result.findings.filter((f) => newIds.has(f.id))
      : onlyProblems
        ? result.findings.filter((f) => f.state === "fail" || f.state === "warn")
        : result.findings;

  return (
    <div className="space-y-6">
      <div className="card p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div
            className="flex h-24 w-24 flex-none items-center justify-center rounded-2xl border-2 font-heading text-5xl font-bold"
            data-tint="outline"
            data-tone={gc}
          >
            {result.grade}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-lg font-semibold text-fg">
              {s.finalUrl}
            </p>
            <p className="mt-1 text-sm text-muted">
              Score de posture : <strong className="text-fg">{score}/100</strong> · HTTP{" "}
              {s.httpStatus} · {s.responseTimeMs} ms{s.server ? ` · ${s.server}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(Object.keys(SEV) as Severity[]).map((sev) =>
                s.counts[sev] ? (
                  <span
                    key={sev}
                    className="rounded-full px-2.5 py-1 text-xs font-semibold"
                    data-tint="soft" data-tone={SEV[sev].color}
                  >
                    {s.counts[sev]} {SEV[sev].label.toLowerCase()}
                  </span>
                ) : null
              )}
              <span className="rounded-full bg-safe/14 px-2.5 py-1 text-xs font-semibold text-safe">
                {s.passed} conforme{s.passed > 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      </div>

      {comparison && (
        <section aria-labelledby="scan-diff" className="card p-5">
          <h2 id="scan-diff" className="font-heading text-base font-semibold text-fg">
            Depuis le scan précédent
          </h2>
          <p className="mt-1 text-sm text-muted">
            Référence : scan du {formatDateTime(comparison.baselineDate)}
            {comparison.baselineScore !== null && <> (score {comparison.baselineScore}/100)</>}.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full px-2.5 py-1" data-tint="soft" data-tone={comparison.diff.added.length ? "risk" : "muted"}>
              {comparison.diff.added.length} nouveau{comparison.diff.added.length > 1 ? "x" : ""}
            </span>
            <span className="rounded-full px-2.5 py-1" data-tint="soft" data-tone={comparison.diff.fixed.length ? "safe" : "muted"}>
              {comparison.diff.fixed.length} corrigé{comparison.diff.fixed.length > 1 ? "s" : ""}
            </span>
            <span className="rounded-full px-2.5 py-1" data-tint="soft" data-tone="muted">
              {comparison.diff.persisting.length} inchangé{comparison.diff.persisting.length > 1 ? "s" : ""}
            </span>
          </div>
          {comparison.diff.fixed.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-subtle">Corrigés</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-muted">
                {comparison.diff.fixed.map((f) => (
                  <li key={f.id}>{f.title}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {compliance.length > 0 && (
        <details className="card p-5">
          <summary className="cursor-pointer font-heading text-base font-semibold text-fg">
            Exigences de conformité concernées ({compliance.length})
          </summary>
          <p className="mt-2 text-sm text-muted">
            Repères indicatifs reliant les problèmes détectés aux exigences de trois
            référentiels. Ils ne valent pas constat de conformité.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {(Object.keys(FRAMEWORK_LABELS) as (keyof typeof FRAMEWORK_LABELS)[]).map((fw) => {
              const rows = compliance.filter((r) => r.framework === fw);
              return (
                <div key={fw}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-subtle">{FRAMEWORK_LABELS[fw]}</p>
                  {rows.length === 0 ? (
                    <p className="mt-1 text-sm text-muted">Aucune exigence concernée.</p>
                  ) : (
                    <ul className="mt-1 space-y-0.5 text-sm text-fg">
                      {rows.map((r) => (
                        <li key={r.control} className="flex justify-between gap-3">
                          <span className="font-mono text-[0.8rem]">{r.control}</span>
                          <span className="tabular-nums text-muted">
                            {r.failing} problème{r.failing > 1 ? "s" : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </details>
      )}

      <div className="no-print flex items-center justify-between">
        <span className="text-sm text-muted">
          {shown.length} contrôle{shown.length > 1 ? "s" : ""} affiché{shown.length > 1 ? "s" : ""}
        </span>
        <div className="flex gap-1 rounded-lg border border-border p-1">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              filter === "all" ? "bg-hover text-fg" : "text-muted hover:text-fg"
            }`}
          >
            Tous ({result.findings.length})
          </button>
          <button
            onClick={() => setFilter("problems")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              onlyProblems ? "bg-hover text-fg" : "text-muted hover:text-fg"
            }`}
          >
            Problèmes ({problems})
          </button>
          {comparison && (
            <button
              onClick={() => setFilter("new")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                filter === "new" ? "bg-hover text-fg" : "text-muted hover:text-fg"
              }`}
            >
              Nouveaux ({newIds.size})
            </button>
          )}
        </div>
      </div>

      <ul className="space-y-3">
        {shown.map((f) => (
          <FindingRow key={f.id} f={f} isNew={newIds.has(f.id)} />
        ))}
      </ul>
    </div>
  );
}

/** Carte de surface : points d'entrée cartographiés et classes d'attaque indicatives. */
function SurfaceMap({ items }: { items: SurfaceItem[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, 12);
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-left text-xs">
        <caption className="sr-only">Carte de surface d&apos;attaque</caption>
        <thead className="bg-bg-elev/60 text-subtle">
          <tr>
            <th scope="col" className="px-3 py-1.5 font-semibold">Point d&apos;entrée</th>
            <th scope="col" className="px-3 py-1.5 font-semibold">Paramètre</th>
            <th scope="col" className="px-3 py-1.5 font-semibold">Source</th>
            <th scope="col" className="px-3 py-1.5 font-semibold">Classes à tester</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((it) => (
            <tr key={`${it.method}-${it.path}-${it.param}`} className="border-t border-border/60 align-top">
              <td className="px-3 py-1.5 font-mono text-fg">
                {it.method && it.method !== "GET" ? `${it.method} ` : ""}
                {it.path}
              </td>
              <td className="px-3 py-1.5 font-mono text-muted">{it.param || "—"}</td>
              <td className="px-3 py-1.5 text-muted">{it.source === "js" ? "JavaScript" : it.source === "form" ? "Formulaire" : "Lien"}</td>
              <td className="px-3 py-1.5">
                <span className="flex flex-wrap gap-1">
                  {it.classes.map((c) => (
                    <span key={c} className="rounded-full px-2 py-0.5 text-[0.65rem] font-semibold" data-tint="soft" data-tone={c === "info-leak" ? "muted" : "warn"}>
                      {ATTACK_CLASS_LABELS[c] ?? c}
                    </span>
                  ))}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length > 12 && (
        <button
          onClick={() => setAll((v) => !v)}
          className="no-print w-full border-t border-border px-3 py-1.5 text-xs text-brand-light hover:bg-hover"
        >
          {all ? "Réduire" : `Afficher les ${items.length} points d'entrée`}
        </button>
      )}
    </div>
  );
}

function FindingRow({ f, isNew }: { f: Finding; isNew?: boolean }) {
  const controls = f.state === "pass" || f.state === "info" ? "" : controlsLabel(controlsFor(f.id, f.category));
  const [copied, setCopied] = useState(false);
  const color = f.state === "pass" ? "safe" : SEV[f.severity].color;
  const icon =
    f.state === "pass" ? "✓" : f.state === "fail" ? "✗" : f.state === "warn" ? "!" : "i";

  async function copy() {
    if (!f.recommendation) return;
    try {
      await navigator.clipboard.writeText(f.recommendation);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <li className="card p-5">
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full text-sm font-bold"
          data-tint="soft" data-tone={color}
          aria-hidden="true"
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-base font-semibold text-fg">{f.title}</h3>
            <span
              className="rounded-full px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wide"
              data-tint="soft" data-tone={color}
            >
              {f.state === "pass" ? "OK" : SEV[f.severity].label}
            </span>
            <span className="text-xs text-subtle">· {f.category}</span>
            {isNew && (
              <span className="rounded-full px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wide" data-tint="soft" data-tone="risk">
                Nouveau
              </span>
            )}
          </div>
          <p className="mt-1.5 break-words text-sm text-muted">{f.detail}</p>
          {controls && (
            <p className="mt-1.5 font-mono text-[0.72rem] text-subtle">
              <span className="sr-only">Exigences de conformité : </span>
              {controls}
            </p>
          )}
          {f.cves && f.cves.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {f.cves.map((c) => (
                <a
                  key={c.id}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-border bg-bg-elev/60 px-2 py-0.5 font-mono text-[0.7rem] text-brand-light transition-colors hover:bg-hover"
                  title={`${c.source}${c.cvss ? ` · CVSS ${c.cvss}` : ""}`}
                >
                  {c.id}
                  {c.cvss ? ` · ${c.cvss}` : ""}
                <span className="sr-only"> (nouvel onglet)</span></a>
              ))}
            </div>
          )}
          {f.surface && f.surface.length > 0 && <SurfaceMap items={f.surface} />}
          {f.recommendation && (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-border bg-bg-elev/60 px-3 py-2">
              <p className="flex-1 text-sm text-muted">
                <strong className="text-fg">Recommandation :</strong> {f.recommendation}
              </p>
              <button
                onClick={copy}
                className="no-print flex-none rounded-md px-2 py-1 text-xs text-brand-light transition-colors hover:bg-hover"
                title="Copier la recommandation"
              >
                {copied ? "Copié ✓" : "Copier"}
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
