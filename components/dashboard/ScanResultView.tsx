"use client";

import { useEffect, useMemo, useState } from "react";
import type { Finding, ScanResult, Severity } from "@/lib/scanner";
import { complianceSummary, controlsFor, controlsLabel, FRAMEWORK_LABELS } from "@/lib/compliance";
import type { ScanDiff } from "@/lib/scanDiff";
import { formatDateTime } from "@/lib/format";
import { ATTACK_CLASS_LABELS, type SurfaceItem } from "@/lib/surface";
import { CATEGORY_LABELS, type CategoryKey, type ScanInsights } from "@/lib/insights/types";

/** Comparaison avec le scan précédent de la même cible (calculée par l’appelant). */
export type ScanComparison = { diff: ScanDiff<Finding>; baselineDate: string; baselineScore: number | null };

const SEV: Record<Severity, { label: string; color: string }> = {
  critical: { label: "Critique", color: "risk" },
  high: { label: "Élevé", color: "risk" },
  medium: { label: "Moyen", color: "warn" },
  low: { label: "Faible", color: "warn" },
  info: { label: "Info", color: "brand-light" },
};
const SEV_ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];

function gradeColor(grade: string): string {
  if (grade === "A" || grade === "B") return "safe";
  if (grade === "C" || grade === "D") return "warn";
  return "risk";
}
const scoreTone = (n: number) => (n >= 90 ? "safe" : n >= 70 ? "warn" : "risk");
const isProblem = (f: Finding) => f.state === "fail" || f.state === "warn";

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

type TabKey = "synthese" | "problemes" | "tls" | "dns" | "tiers" | "entetes" | "tous";

export default function ScanResultView({
  result,
  comparison,
}: {
  result: ScanResult;
  comparison?: ScanComparison | null;
}) {
  const gc = gradeColor(result.grade);
  const s = result.summary;
  const i = result.insights;
  const score = useCountUp(result.score);
  const [tab, setTab] = useState<TabKey>("synthese");
  const newIds = new Set((comparison?.diff.added || []).map((f) => f.id));
  const problems = result.findings.filter(isProblem);

  const tabs: { key: TabKey; label: string; show: boolean }[] = [
    { key: "synthese", label: "Synthèse", show: true },
    { key: "problemes", label: `Problèmes (${problems.length})`, show: true },
    { key: "tls", label: "TLS & certificat", show: Boolean(i?.tls) },
    { key: "dns", label: "DNS & e-mail", show: Boolean(i?.dns || i?.email) },
    { key: "tiers", label: "Tiers & cookies", show: Boolean(i?.thirdParties || i?.cookies) },
    { key: "entetes", label: "En-têtes", show: Boolean(i?.headers?.length) },
    { key: "tous", label: `Tous les contrôles (${result.findings.length})`, show: true },
  ];

  return (
    <div className="space-y-6">
      {/* En-tête : note, score, cible */}
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
            <p className="truncate font-heading text-lg font-semibold text-fg">{s.finalUrl}</p>
            <p className="mt-1 text-sm text-muted">
              Score de posture : <strong className="text-fg">{score}/100</strong> · HTTP {s.httpStatus} ·{" "}
              {s.responseTimeMs} ms{s.server ? ` · ${s.server}` : ""}
              {i?.durationMs ? ` · scan en ${(i.durationMs / 1000).toFixed(1)} s` : ""}
              {i?.checks ? ` · ${i.checks} contrôles` : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SEV_ORDER.map((sev) =>
                s.counts[sev] ? (
                  <span key={sev} className="rounded-full px-2.5 py-1 text-xs font-semibold" data-tint="soft" data-tone={SEV[sev].color}>
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
        {i?.summary && <p className="mt-5 border-t border-border pt-4 text-sm text-fg">{i.summary}</p>}
        {i?.categoryScores && <CategoryBars scores={i.categoryScores} />}
      </div>

      <div role="tablist" aria-label="Sections du rapport" className="no-print flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
        {tabs
          .filter((t) => t.show)
          .map((t) => (
            <button
              key={t.key}
              role="tab"
              type="button"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === t.key ? "bg-hover text-fg" : "text-muted hover:text-fg"
              }`}
            >
              {t.label}
            </button>
          ))}
      </div>

      <div role="tabpanel">
        {tab === "synthese" && <Synthese result={result} comparison={comparison} />}
        {tab === "problemes" && <FindingList findings={problems} newIds={newIds} withFilters />}
        {tab === "tls" && i?.tls && <TlsPanel i={i} />}
        {tab === "dns" && <DnsPanel i={i} />}
        {tab === "tiers" && <TiersPanel i={i} />}
        {tab === "entetes" && <HeadersPanel i={i} />}
        {tab === "tous" && <FindingList findings={result.findings} newIds={newIds} withFilters />}
      </div>
    </div>
  );
}

/** Barres de sous-scores par catégorie (largeurs en attributs SVG : CSP sans style en ligne). */
function CategoryBars({ scores }: { scores: Partial<Record<CategoryKey, number>> }) {
  const entries = (Object.keys(CATEGORY_LABELS) as CategoryKey[]).filter((k) => scores[k] !== undefined);
  if (!entries.length) return null;
  return (
    <ul className="mt-4 grid gap-x-8 gap-y-2.5 sm:grid-cols-2" aria-label="Sous-scores par catégorie">
      {entries.map((k) => {
        const v = scores[k] as number;
        return (
          <li key={k} className="text-sm">
            <span className="flex justify-between">
              <span className="text-muted">{CATEGORY_LABELS[k]}</span>
              <span className="font-semibold tabular-nums" data-tint="fg" data-tone={scoreTone(v)}>{v}/100</span>
            </span>
            <svg viewBox="0 0 100 4" preserveAspectRatio="none" className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-hover" aria-hidden="true">
              <rect x="0" y="0" height="4" width={v} data-tint="fill" data-tone={scoreTone(v)} />
            </svg>
          </li>
        );
      })}
    </ul>
  );
}

function Synthese({ result, comparison }: { result: ScanResult; comparison?: ScanComparison | null }) {
  const i = result.insights;
  const top = result.findings
    .filter(isProblem)
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    .slice(0, 5);
  const compliance = complianceSummary(
    result.findings.map((f) => ({ id: f.id, category: f.category, failing: isProblem(f) }))
  );
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6" aria-labelledby="prio">
          <h3 id="prio" className="font-semibold text-fg">À traiter en priorité</h3>
          {top.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Aucun problème détecté. Bravo !</p>
          ) : (
            <ol className="mt-3 space-y-2.5">
              {top.map((f, n) => (
                <li key={f.id} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full text-[0.7rem] font-bold" data-tint="soft" data-tone={SEV[f.severity].color}>
                    {n + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="font-medium text-fg">{f.title}</span>
                    <span className="block text-xs text-subtle">
                      {SEV[f.severity].label} · effort {f.effort ?? "moyen"} · {f.category}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section className="card p-6" aria-labelledby="quick">
          <h3 id="quick" className="font-semibold text-fg">Gains rapides</h3>
          <p className="mt-1 text-xs text-subtle">Corrections simples, souvent quelques minutes de configuration.</p>
          {i?.quickWins?.length ? (
            <ul className="mt-3 space-y-1.5 text-sm">
              {i.quickWins.map((q) => (
                <li key={q} className="flex gap-2">
                  <span className="text-safe" aria-hidden="true">→</span>
                  <span className="text-fg">{q}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">Aucun gain rapide identifié.</p>
          )}
        </section>
      </div>

      {i && (
        <section className="card p-6" aria-labelledby="fiche">
          <h3 id="fiche" className="font-semibold text-fg">Fiche d&apos;identité de la cible</h3>
          <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <Info label="Adresse IP" value={i.hosting?.ip} />
            <Info label="Hébergeur" value={[i.hosting?.org, i.hosting?.asn].filter(Boolean).join(" · ") || undefined} />
            <Info label="Pays du réseau" value={i.hosting?.country} />
            <Info label="Registrar" value={i.domain?.registrar} />
            <Info label="Expiration du domaine" value={i.domain?.expires ? `${i.domain.expires.slice(0, 10)} (${i.domain.daysToExpiry} j)` : undefined} />
            <Info label="Certificat" value={i.tls?.cert ? `${i.tls.cert.issuer ?? "?"} · ${i.tls.cert.daysRemaining} j restants` : undefined} />
            <Info label="Protocoles" value={i.tls ? Object.entries(i.tls.protocols).filter(([, v]) => v).map(([k]) => k.replace("TLSv", "TLS ")).join(", ") : undefined} />
            <Info label="HTTP/2 · HTTP/3" value={`${i.http2 ? "oui" : "non"} · ${i.http3 ? "oui" : "non"}`} />
            <Info label="Compression" value={i.compression || "aucune"} />
            <Info label="Score e-mail" value={i.email ? `${i.email.score}/100` : undefined} />
            <Info label="Domaines tiers" value={i.thirdParties ? String(i.thirdParties.length) : undefined} />
            <Info label="Redirections" value={i.redirects ? String(Math.max(0, i.redirects.length - 1)) : undefined} />
          </dl>
        </section>
      )}

      {comparison && (
        <section aria-labelledby="scan-diff" className="card p-5">
          <h3 id="scan-diff" className="font-semibold text-fg">Depuis le scan précédent</h3>
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
            <ul className="mt-3 list-disc space-y-0.5 pl-5 text-sm text-muted">
              {comparison.diff.fixed.map((f) => (
                <li key={f.id}>{f.title}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {compliance.length > 0 && (
        <details className="card p-5">
          <summary className="cursor-pointer font-semibold text-fg">
            Exigences de conformité concernées ({compliance.length})
          </summary>
          <p className="mt-2 text-sm text-muted">
            Repères indicatifs reliant les problèmes détectés aux exigences de trois référentiels. Ils ne valent pas
            constat de conformité.
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
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/60 py-1.5 sm:block sm:border-0 sm:py-0">
      <dt className="text-xs text-subtle">{label}</dt>
      <dd className="truncate text-fg">{value ?? "—"}</dd>
    </div>
  );
}

function FindingList({ findings, newIds, withFilters }: { findings: Finding[]; newIds: Set<string>; withFilters?: boolean }) {
  const [sev, setSev] = useState<Severity | "all">("all");
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const categories = useMemo(() => [...new Set(findings.map((f) => f.category))].sort(), [findings]);
  const shown = findings
    .filter((f) => (sev === "all" || f.severity === sev) && (cat === "all" || f.category === cat))
    .filter((f) => !q || `${f.title} ${f.detail} ${f.recommendation ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity));
  return (
    <div className="space-y-3">
      {withFilters && (
        <div className="no-print flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="f-sev">Gravité</label>
          <select id="f-sev" value={sev} onChange={(e) => setSev(e.target.value as Severity | "all")} className="input !w-auto !py-1.5 text-sm">
            <option value="all">Toutes gravités</option>
            {SEV_ORDER.map((x) => (
              <option key={x} value={x}>{SEV[x].label}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="f-cat">Catégorie</label>
          <select id="f-cat" value={cat} onChange={(e) => setCat(e.target.value)} className="input !w-auto !py-1.5 text-sm">
            <option value="all">Toutes catégories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="f-q">Rechercher</label>
          <input id="f-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="input !w-auto min-w-[12rem] flex-1 !py-1.5 text-sm" />
          <span className="text-xs text-subtle">{shown.length} résultat{shown.length > 1 ? "s" : ""}</span>
        </div>
      )}
      <ul className="space-y-3">
        {shown.map((f) => (
          <FindingRow key={f.id} f={f} isNew={newIds.has(f.id)} />
        ))}
        {shown.length === 0 && <li className="card p-6 text-sm text-muted">Aucun contrôle ne correspond.</li>}
      </ul>
    </div>
  );
}

function Table({ head, rows, caption }: { head: string[]; rows: (string | React.ReactNode)[][]; caption: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-bg-elev/60 text-xs text-subtle">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-3 py-2 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, n) => (
            <tr key={n} className="border-t border-border/60 align-top">
              {r.map((c, k) => (
                <td key={k} className="break-all px-3 py-1.5 text-fg">{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const yes = (b: boolean | undefined, good = true) =>
  b === undefined ? "—" : (
    <span data-tint="fg" data-tone={b === good ? "safe" : "risk"}>{b ? "oui" : "non"}</span>
  );

function TlsPanel({ i }: { i: ScanInsights }) {
  const t = i.tls!;
  const c = t.cert;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card p-6" aria-labelledby="cert">
        <h3 id="cert" className="font-semibold text-fg">Certificat</h3>
        {c ? (
          <dl className="mt-3 space-y-1.5 text-sm">
            <Info label="Sujet" value={c.subject} />
            <Info label="Émetteur" value={c.issuer} />
            <Info label="Valide du" value={c.validFrom} />
            <Info label="Valide jusqu'au" value={c.validTo ? `${c.validTo} (${c.daysRemaining} j)` : undefined} />
            <Info label="Clé" value={c.keyType ? `${c.keyType.toUpperCase()} ${c.keyBits ?? ""}` : undefined} />
            <Info label="Signature" value={c.signatureAlgorithm} />
            <Info label="Nom d'hôte couvert" value={c.hostnameCovered ? "oui" : "non"} />
            <Info label="Chaîne de confiance" value={c.authorized ? "valide" : c.authError || "non validée"} />
            <Info label="Empreinte SHA-256" value={c.fingerprint256} />
          </dl>
        ) : (
          <p className="mt-3 text-sm text-muted">Certificat non lisible.</p>
        )}
        {c?.san.length ? (
          <p className="mt-3 text-xs text-subtle">
            Noms couverts (SAN) : <span className="font-mono text-muted">{c.san.join(", ")}</span>
          </p>
        ) : null}
      </section>
      <section className="card p-6" aria-labelledby="proto">
        <h3 id="proto" className="font-semibold text-fg">Protocoles et chiffrement</h3>
        <div className="mt-3">
          <Table
            caption="Versions TLS acceptées"
            head={["Version", "Acceptée", "Recommandation"]}
            rows={(["TLSv1", "TLSv1.1", "TLSv1.2", "TLSv1.3"] as const).map((v) => [
              v.replace("TLSv1", "TLS 1.0").replace("TLS 1.0.", "TLS 1."),
              yes(t.protocols[v], v === "TLSv1.2" || v === "TLSv1.3"),
              v === "TLSv1" || v === "TLSv1.1" ? "à refuser" : "à accepter",
            ])}
          />
        </div>
        <dl className="mt-4 space-y-1.5 text-sm">
          <Info label="Suite négociée" value={t.cipher} />
          <Info label="Version négociée" value={t.negotiated} />
          <Info label="HTTP/2 (ALPN)" value={t.alpn === "h2" ? "oui" : "non"} />
          <Info label="Prêt pour le préchargement HSTS" value={t.hstsPreloadReady ? "oui" : "non"} />
        </dl>
      </section>
    </div>
  );
}

function DnsPanel({ i }: { i?: ScanInsights }) {
  const d = i?.dns;
  const e = i?.email;
  return (
    <div className="space-y-6">
      {e && (
        <section className="card p-6" aria-labelledby="mail">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="mail" className="font-semibold text-fg">Sécurité e-mail</h3>
            <span className="rounded-full px-2.5 py-1 text-xs font-semibold" data-tint="soft" data-tone={scoreTone(e.score)}>
              {e.score}/100
            </span>
          </div>
          <p className="mt-1 text-xs text-subtle">Protection de votre domaine contre l&apos;usurpation (hameçonnage en votre nom).</p>
          <div className="mt-3">
            <Table
              caption="Mécanismes de sécurité e-mail"
              head={["Mécanisme", "État", "Détail"]}
              rows={[
                ["SPF", e.spf ? e.spf.all : "absent", e.spf ? `${e.spf.record} (${e.spf.lookups} recherche(s) DNS)` : "—"],
                ["DMARC", e.dmarc ? `p=${e.dmarc.policy}` : "absent", e.dmarc ? e.dmarc.record : "—"],
                ["DKIM", e.dkimSelectors.length ? "trouvé" : "non trouvé", e.dkimSelectors.join(", ") || "sélecteurs courants testés"],
                ["MTA-STS", e.mtaSts?.record ? (e.mtaSts.policy ? `actif (${e.mtaSts.mode ?? "?"})` : "politique absente") : "absent", "chiffrement forcé à la réception"],
                ["TLS-RPT", e.tlsRpt ? "actif" : "absent", "rapports d'échec de chiffrement SMTP"],
              ]}
            />
          </div>
        </section>
      )}
      {d && (
        <section className="card p-6" aria-labelledby="dnsrec">
          <h3 id="dnsrec" className="font-semibold text-fg">Enregistrements DNS</h3>
          <div className="mt-3">
            <Table
              caption="Enregistrements DNS"
              head={["Type", "Valeur"]}
              rows={[
                ...d.a.map((x) => ["A", x]),
                ...d.aaaa.map((x) => ["AAAA", x]),
                ...d.ns.map((x) => ["NS", x]),
                ...d.mx.map((x) => ["MX", `${x.priority} ${x.exchange}`]),
                ...d.caa.map((x) => ["CAA", x]),
                ...d.txt.map((x) => ["TXT", x]),
              ]}
            />
          </div>
          <p className="mt-3 text-sm text-muted">
            DNSSEC : {d.dnssec === undefined ? "non déterminé" : d.dnssec ? "activé et validé" : "non activé"}
          </p>
        </section>
      )}
      {i?.domain && (
        <section className="card p-6" aria-labelledby="dom">
          <h3 id="dom" className="font-semibold text-fg">Nom de domaine</h3>
          <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            <Info label="Registrar" value={i.domain.registrar} />
            <Info label="Expiration" value={i.domain.expires ? `${i.domain.expires.slice(0, 10)} (${i.domain.daysToExpiry} j)` : undefined} />
            <Info label="Verrou de transfert" value={i.domain.transferLocked ? "actif" : "inactif"} />
            <Info label="Statuts" value={i.domain.statuses.join(", ") || undefined} />
          </dl>
        </section>
      )}
    </div>
  );
}

function TiersPanel({ i }: { i?: ScanInsights }) {
  return (
    <div className="space-y-6">
      <section className="card p-6" aria-labelledby="tp">
        <h3 id="tp" className="font-semibold text-fg">Domaines tiers chargés ({i?.thirdParties?.length ?? 0})</h3>
        <p className="mt-1 text-xs text-subtle">Chaque domaine tiers exécute ou affiche du contenu sur votre site : c&apos;est autant de fournisseurs à qui vous faites confiance.</p>
        {i?.thirdParties?.length ? (
          <div className="mt-3">
            <Table
              caption="Domaines tiers"
              head={["Domaine", "Ressources", "Intégrité (SRI)", "Traceur"]}
              rows={i.thirdParties.map((t) => [t.host, t.kinds.join(", "), t.kinds.some((k) => k === "script" || k === "style") ? yes(t.sri) : "—", t.tracker ?? "—"])}
            />
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">Aucune ressource tierce dans la page initiale.</p>
        )}
      </section>
      {i?.libraries && i.libraries.length > 0 && (
        <section className="card p-6" aria-labelledby="libs">
          <h3 id="libs" className="font-semibold text-fg">Bibliothèques JavaScript détectées</h3>
          <div className="mt-3">
            <Table
              caption="Bibliothèques"
              head={["Bibliothèque", "Version", "État"]}
              rows={i.libraries.map((l) => [l.name, l.version, l.vulnerable ? <span key="v" data-tint="fg" data-tone="risk">obsolète : {l.vulnerable}</span> : <span key="o" data-tint="fg" data-tone="safe">à jour</span>])}
            />
          </div>
        </section>
      )}
      <section className="card p-6" aria-labelledby="ck">
        <h3 id="ck" className="font-semibold text-fg">Cookies déposés ({i?.cookies?.length ?? 0})</h3>
        {i?.cookies?.length ? (
          <div className="mt-3">
            <Table
              caption="Cookies"
              head={["Nom", "Secure", "HttpOnly", "SameSite", "Durée"]}
              rows={i.cookies.map((c) => [c.name + (c.session ? " (session)" : ""), yes(c.secure), yes(c.httpOnly, c.session ? true : c.httpOnly), c.sameSite ?? "absent", c.maxAge ?? "session"])}
            />
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">Aucun cookie déposé par la page d&apos;accueil.</p>
        )}
      </section>
    </div>
  );
}

function HeadersPanel({ i }: { i?: ScanInsights }) {
  return (
    <div className="space-y-6">
      {i?.redirects && i.redirects.length > 0 && (
        <section className="card p-6" aria-labelledby="redir">
          <h3 id="redir" className="font-semibold text-fg">Chaîne de redirections</h3>
          <ol className="mt-3 space-y-1 font-mono text-xs">
            {i.redirects.map((r, n) => (
              <li key={n} className="break-all">
                <span className="mr-2 rounded px-1.5 py-0.5" data-tint="soft" data-tone={r.status >= 400 ? "risk" : r.status >= 300 ? "warn" : "safe"}>{r.status}</span>
                <span className="text-fg">{r.url}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
      <section className="card p-6" aria-labelledby="raw">
        <h3 id="raw" className="font-semibold text-fg">En-têtes de réponse bruts</h3>
        <p className="mt-1 text-xs text-subtle">Valeurs des cookies masquées.</p>
        <div className="mt-3">
          <Table caption="En-têtes HTTP" head={["En-tête", "Valeur"]} rows={(i?.headers ?? []).map(([k, v]) => [<span key="k" className="font-mono text-xs">{k}</span>, <span key="v" className="font-mono text-xs text-muted">{v}</span>])} />
        </div>
      </section>
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
        <button onClick={() => setAll((v) => !v)} className="no-print w-full border-t border-border px-3 py-1.5 text-xs text-brand-light hover:bg-hover">
          {all ? "Réduire" : `Afficher les ${items.length} points d'entrée`}
        </button>
      )}
    </div>
  );
}

function FindingRow({ f, isNew }: { f: Finding; isNew?: boolean }) {
  const controls = f.state === "pass" || f.state === "info" ? "" : controlsLabel(controlsFor(f.id, f.category));
  const [copied, setCopied] = useState<string | null>(null);
  const [snip, setSnip] = useState(0);
  const color = f.state === "pass" ? "safe" : SEV[f.severity].color;
  const icon = f.state === "pass" ? "✓" : f.state === "fail" ? "✗" : f.state === "warn" ? "!" : "i";

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <li className="card p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full text-sm font-bold" data-tint="soft" data-tone={color} aria-hidden="true">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-base font-semibold text-fg">{f.title}</h3>
            <span className="rounded-full px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wide" data-tint="soft" data-tone={color}>
              {f.state === "pass" ? "OK" : SEV[f.severity].label}
            </span>
            <span className="text-xs text-subtle">· {f.category}</span>
            {f.effort && isProblem(f) && <span className="text-xs text-subtle">· effort {f.effort}</span>}
            {isNew && (
              <span className="rounded-full px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wide" data-tint="soft" data-tone="risk">
                Nouveau
              </span>
            )}
          </div>
          <p className="mt-1.5 break-words text-sm text-muted">{f.detail}</p>
          {f.why && isProblem(f) && <p className="mt-1.5 text-xs text-subtle"><strong className="font-medium">Pourquoi c&apos;est important : </strong>{f.why}</p>}
          {(controls || f.owasp || f.cwe || f.wstg) && (
            <p className="mt-1.5 font-mono text-[0.72rem] text-subtle">
              {[f.owasp, f.cwe, f.wstg, controls].filter(Boolean).join(" · ")}
            </p>
          )}
          {f.cves && f.cves.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {f.cves.map((c) => (
                <a key={c.id} href={c.url} target="_blank" rel="noopener noreferrer" className="rounded-md border border-border bg-bg-elev/60 px-2 py-0.5 font-mono text-[0.7rem] text-brand-light transition-colors hover:bg-hover" title={`${c.source}${c.cvss ? ` · CVSS ${c.cvss}` : ""}`}>
                  {c.kev ? "⚠ " : ""}
                  {c.id}
                  {c.cvss ? ` · ${c.cvss}` : ""}
                  {c.epss !== undefined ? ` · EPSS ${Math.round(c.epss * 100)} %` : ""}
                  {c.kev ? " · exploitée" : ""}
                  <span className="sr-only"> (nouvel onglet)</span>
                </a>
              ))}
            </div>
          )}
          {f.refs && f.refs.length > 0 && (
            <p className="mt-1.5 text-xs">
              {f.refs.map((r) => (
                <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer" className="mr-3 text-brand-light hover:underline">
                  {r.label} ↗<span className="sr-only"> (nouvel onglet)</span>
                </a>
              ))}
            </p>
          )}
          {f.surface && f.surface.length > 0 && <SurfaceMap items={f.surface} />}
          {f.recommendation && (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-border bg-bg-elev/60 px-3 py-2">
              <p className="flex-1 text-sm text-muted">
                <strong className="text-fg">Recommandation :</strong> {f.recommendation}
              </p>
              <button onClick={() => copy(f.recommendation as string, "reco")} className="no-print flex-none rounded-md px-2 py-1 text-xs text-brand-light transition-colors hover:bg-hover" title="Copier la recommandation">
                {copied === "reco" ? "Copié ✓" : "Copier"}
              </button>
            </div>
          )}
          {f.repro && isProblem(f) && (
            <div className="no-print mt-2 flex items-start gap-2 rounded-lg border border-border px-3 py-2">
              <span className="flex-1">
                <span className="block text-[0.7rem] font-semibold uppercase tracking-wide text-subtle">Vérifier vous-même</span>
                <code className="block whitespace-pre-wrap break-all font-mono text-[0.72rem] text-fg">{f.repro}</code>
              </span>
              <button onClick={() => copy(f.repro as string, "repro")} className="flex-none rounded-md px-2 py-1 text-xs text-brand-light hover:bg-hover">
                {copied === "repro" ? "Copié ✓" : "Copier"}
              </button>
            </div>
          )}
          {f.snippets && f.snippets.length > 0 && isProblem(f) && (
            <div className="no-print mt-2 rounded-lg border border-border">
              <div className="flex flex-wrap gap-1 border-b border-border p-1" role="tablist" aria-label="Configuration par serveur">
                {f.snippets.map((sn, n) => (
                  <button key={sn.label} role="tab" type="button" aria-selected={snip === n} onClick={() => setSnip(n)} className={`rounded px-2 py-0.5 text-[0.7rem] ${snip === n ? "bg-hover text-fg" : "text-muted hover:text-fg"}`}>
                    {sn.label}
                  </button>
                ))}
              </div>
              <div className="flex items-start gap-2 p-2">
                <code className="flex-1 whitespace-pre-wrap break-all font-mono text-[0.72rem] text-fg">{f.snippets[snip]?.code}</code>
                <button onClick={() => copy(f.snippets![snip].code, "snip")} className="flex-none rounded-md px-2 py-1 text-xs text-brand-light hover:bg-hover">
                  {copied === "snip" ? "Copié ✓" : "Copier"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
