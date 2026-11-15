"use client";

import { useEffect, useState } from "react";
import type { Finding, ScanResult, Severity } from "@/lib/scanner";

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

export default function ScanResultView({ result }: { result: ScanResult }) {
  const gc = gradeColor(result.grade);
  const s = result.summary;
  const score = useCountUp(result.score);
  const [onlyProblems, setOnlyProblems] = useState(false);

  const problems = result.findings.filter(
    (f) => f.state === "fail" || f.state === "warn"
  ).length;
  const shown = onlyProblems
    ? result.findings.filter((f) => f.state === "fail" || f.state === "warn")
    : result.findings;

  return (
    <div className="space-y-6">
      <div className="card p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div
            className="flex h-24 w-24 flex-none items-center justify-center rounded-2xl border-2 font-heading text-5xl font-bold"
            style={{
              color: `rgb(var(--${gc}))`,
              borderColor: `rgb(var(--${gc}) / 0.4)`,
              backgroundColor: `rgb(var(--${gc}) / 0.08)`,
            }}
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
                    style={{
                      backgroundColor: `rgb(var(--${SEV[sev].color}) / 0.14)`,
                      color: `rgb(var(--${SEV[sev].color}))`,
                    }}
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

      <div className="no-print flex items-center justify-between">
        <span className="text-sm text-muted">
          {shown.length} contrôle{shown.length > 1 ? "s" : ""} affiché{shown.length > 1 ? "s" : ""}
        </span>
        <div className="flex gap-1 rounded-lg border border-border p-1">
          <button
            onClick={() => setOnlyProblems(false)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              !onlyProblems ? "bg-hover text-fg" : "text-muted hover:text-fg"
            }`}
          >
            Tous ({result.findings.length})
          </button>
          <button
            onClick={() => setOnlyProblems(true)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              onlyProblems ? "bg-hover text-fg" : "text-muted hover:text-fg"
            }`}
          >
            Problèmes ({problems})
          </button>
        </div>
      </div>

      <ul className="space-y-3">
        {shown.map((f) => (
          <FindingRow key={f.id} f={f} />
        ))}
      </ul>
    </div>
  );
}

function FindingRow({ f }: { f: Finding }) {
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
          style={{
            backgroundColor: `rgb(var(--${color}) / 0.15)`,
            color: `rgb(var(--${color}))`,
          }}
          aria-hidden="true"
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-base font-semibold text-fg">{f.title}</h3>
            <span
              className="rounded-full px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wide"
              style={{
                backgroundColor: `rgb(var(--${color}) / 0.14)`,
                color: `rgb(var(--${color}))`,
              }}
            >
              {f.state === "pass" ? "OK" : SEV[f.severity].label}
            </span>
            <span className="text-xs text-subtle">· {f.category}</span>
          </div>
          <p className="mt-1.5 break-words text-sm text-muted">{f.detail}</p>
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
