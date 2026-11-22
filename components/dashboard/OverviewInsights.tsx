import Link from "next/link";
import type { Overview } from "@/lib/overview";
import type { AuditRow } from "@/lib/audit";
import type { RemediationStats } from "@/lib/jobs";
import { ACTION_LABEL } from "@/lib/auditLabels";
import { CATEGORY_LABELS, type CategoryKey } from "@/lib/insights/types";
import { FRAMEWORK_LABELS } from "@/lib/compliance";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

/**
 * Sections détaillées de la vue d'ensemble, calculées sur le dernier scan de chaque cible :
 * inventaire, échéances, posture e-mail, problèmes fréquents, gains rapides, conformité, activité.
 */

const SEV_TONE: Record<string, string> = { critical: "risk", high: "risk", medium: "warn", low: "warn", info: "muted" };
const SEV_LABEL: Record<string, string> = { critical: "Critique", high: "Élevé", medium: "Moyen", low: "Faible", info: "Info" };
const scoreTone = (n: number) => (n >= 90 ? "safe" : n >= 70 ? "warn" : "risk");
const gradeTone = (g: string | null) => (g === "A" || g === "B" ? "safe" : g === "C" || g === "D" ? "warn" : "risk");
const daysTone = (d: number) => (d < 14 ? "risk" : d < 30 ? "warn" : "safe");

function Section({ id, title, hint, children, className = "" }: { id: string; title: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <section aria-labelledby={id} className={`card p-6 ${className}`}>
      <h2 id={id} className="font-semibold leading-none text-fg">{title}</h2>
      {hint && <p className="mt-1.5 text-xs text-subtle">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Days({ d }: { d?: number }) {
  if (d === undefined) return <span className="text-subtle">—</span>;
  return (
    <span className="tabular-nums" data-tint="fg" data-tone={daysTone(d)}>
      {d < 0 ? "expiré" : `${d} j`}
    </span>
  );
}

export default function OverviewInsights({
  overview,
  audit,
  remediation,
}: {
  overview: Overview;
  audit: AuditRow[];
  remediation: RemediationStats | null;
}) {
  const o = overview;
  if (!o.targets.length) return null;
  const cats = (Object.keys(CATEGORY_LABELS) as CategoryKey[]).filter((k) => o.categoryAverages[k] !== undefined);
  const maxCat = Math.max(1, ...o.byCategory.map((c) => c.problems));
  const deadlines = o.targets
    .flatMap((t) => [
      t.certDays !== undefined ? { host: t.host, kind: "Certificat TLS", days: t.certDays, extra: t.certIssuer } : null,
      t.domainDays !== undefined ? { host: t.host, kind: "Nom de domaine", days: t.domainDays, extra: undefined } : null,
    ])
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => a.days - b.days)
    .slice(0, 8);
  const withEmail = o.targets.filter((t) => t.emailScore !== undefined);
  const fixRate = remediation && remediation.total > 0 ? Math.round((remediation.fixed / remediation.total) * 100) : null;

  return (
    <>
      <section aria-label="Couverture" className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Cibles suivies", value: o.totals.targets },
          { label: "Contrôles exécutés", value: o.totals.checks },
          { label: "Problèmes ouverts", value: o.totals.problems, tone: o.totals.problems ? "warn" : "safe" },
          { label: "Dont critiques ou élevés", value: o.totals.urgent, tone: o.totals.urgent ? "risk" : "safe" },
        ].map((c) => (
          <div key={c.label} className="card p-4">
            <p className="text-xs text-subtle">{c.label}</p>
            <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-fg" data-tint={c.tone ? "fg" : undefined} data-tone={c.tone}>
              {c.value}
            </p>
          </div>
        ))}
      </section>

      <Section id="inventaire" title="Inventaire des cibles" hint="Dernier scan de chaque site, du moins bien noté au mieux noté." className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-subtle">
              <tr>
                <th scope="col" className="py-1.5 pr-3 font-medium">Cible</th>
                <th scope="col" className="py-1.5 pr-3 font-medium">Note</th>
                <th scope="col" className="py-1.5 pr-3 font-medium">Tendance</th>
                <th scope="col" className="py-1.5 pr-3 font-medium">Problèmes</th>
                <th scope="col" className="py-1.5 pr-3 font-medium">Certificat</th>
                <th scope="col" className="py-1.5 pr-3 font-medium">Domaine</th>
                <th scope="col" className="py-1.5 pr-3 font-medium">E-mail</th>
                <th scope="col" className="py-1.5 font-medium">Dernier scan</th>
              </tr>
            </thead>
            <tbody>
              {o.targets.map((t) => (
                <tr key={t.host} className="border-t border-border/60">
                  <td className="max-w-[16rem] truncate py-2 pr-3 font-medium text-fg">{t.host}</td>
                  <td className="py-2 pr-3">
                    <Badge tone={gradeTone(t.grade)}>{t.grade ?? "—"} · {t.score}/100</Badge>
                  </td>
                  <td className="py-2 pr-3 tabular-nums">
                    {t.delta === null || t.delta === 0 ? (
                      <span className="text-subtle">=</span>
                    ) : (
                      <span data-tint="fg" data-tone={t.delta > 0 ? "safe" : "risk"}>
                        {t.delta > 0 ? "▲ +" : "▼ "}
                        {t.delta}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3 tabular-nums">
                    {t.problems}
                    {t.urgent > 0 && <span data-tint="fg" data-tone="risk"> ({t.urgent} urgent{t.urgent > 1 ? "s" : ""})</span>}
                  </td>
                  <td className="py-2 pr-3"><Days d={t.certDays} /></td>
                  <td className="py-2 pr-3"><Days d={t.domainDays} /></td>
                  <td className="py-2 pr-3 tabular-nums">
                    {t.emailScore === undefined ? <span className="text-subtle">—</span> : <span data-tint="fg" data-tone={scoreTone(t.emailScore)}>{t.emailScore}/100</span>}
                  </td>
                  <td className="py-2 text-xs text-subtle">{formatDateTime(t.lastScan)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {cats.length > 0 && (
          <Section id="souscores" title="Sous-scores moyens" hint="Moyenne par catégorie sur l'ensemble de vos cibles.">
            <ul className="space-y-3">
              {cats.map((k) => {
                const v = o.categoryAverages[k] as number;
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
          </Section>
        )}
        {o.byCategory.length > 0 && (
          <Section id="repartition" title="Problèmes par catégorie" hint="Où se concentrent les points à corriger.">
            <ul className="space-y-3">
              {o.byCategory.map((c) => (
                <li key={c.key} className="text-sm">
                  <span className="flex justify-between">
                    <span className="text-muted">{CATEGORY_LABELS[c.key]}</span>
                    <span className="font-semibold tabular-nums text-fg">{c.problems}</span>
                  </span>
                  <svg viewBox="0 0 100 4" preserveAspectRatio="none" className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-hover" aria-hidden="true">
                    <rect x="0" y="0" height="4" width={(c.problems / maxCat) * 100} data-tint="fill" data-tone="brand" />
                  </svg>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Section id="top" title="Problèmes prioritaires" hint="Toutes cibles confondues, classés par gravité et facilité de correction.">
          {o.topProblems.length === 0 ? (
            <p className="text-sm text-muted">Aucun problème ouvert.</p>
          ) : (
            <ol className="space-y-2.5">
              {o.topProblems.map((p, n) => (
                <li key={p.title + n} className="flex items-start gap-3 text-sm">
                  <Badge tone={SEV_TONE[p.severity]} className="mt-0.5">{SEV_LABEL[p.severity]}</Badge>
                  <span className="min-w-0">
                    <span className="font-medium text-fg">{p.title}</span>
                    <span className="block truncate text-xs text-subtle">
                      {p.hosts.length > 1 ? `${p.hosts.length} cibles : ` : ""}
                      {p.hosts.slice(0, 3).join(", ")}
                      {p.hosts.length > 3 ? "…" : ""}
                      {p.effort ? ` · effort ${p.effort}` : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Section>
        <Section id="gains" title="Gains rapides" hint="Corrections simples à fort effet.">
          {o.quickWins.length === 0 ? (
            <p className="text-sm text-muted">Aucun gain rapide identifié.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {o.quickWins.map((q) => (
                <li key={q.title} className="flex gap-2">
                  <span className="text-safe" aria-hidden="true">→</span>
                  <span className="text-fg">
                    {q.title}
                    {q.hosts > 1 && <span className="text-subtle"> ({q.hosts} cibles)</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section id="echeances" title="Échéances" hint="Certificats et noms de domaine, du plus urgent au moins urgent.">
          {deadlines.length === 0 ? (
            <p className="text-sm text-muted">Relancez un scan pour récupérer les dates d&apos;expiration.</p>
          ) : (
            <ul className="divide-y divide-border/70">
              {deadlines.map((d) => (
                <li key={d.host + d.kind} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-fg">{d.host}</span>
                    <span className="block text-xs text-subtle">{d.kind}{d.extra ? ` · ${d.extra}` : ""}</span>
                  </span>
                  <Badge tone={daysTone(d.days)}>{d.days < 0 ? "expiré" : `${d.days} jours`}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section id="email" title="Protection contre l'usurpation d'e-mail" hint="SPF, DKIM et DMARC par domaine.">
          {withEmail.length === 0 ? (
            <p className="text-sm text-muted">Relancez un scan pour analyser la sécurité e-mail.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-subtle">
                <tr>
                  <th scope="col" className="py-1 pr-3 font-medium">Domaine</th>
                  <th scope="col" className="py-1 pr-3 font-medium">SPF</th>
                  <th scope="col" className="py-1 pr-3 font-medium">DKIM</th>
                  <th scope="col" className="py-1 pr-3 font-medium">DMARC</th>
                  <th scope="col" className="py-1 font-medium">Score</th>
                </tr>
              </thead>
              <tbody>
                {withEmail.map((t) => (
                  <tr key={t.host} className="border-t border-border/60">
                    <td className="max-w-[11rem] truncate py-1.5 pr-3 text-fg">{t.host}</td>
                    <td className="py-1.5 pr-3" data-tint="fg" data-tone={t.spf === "-all" ? "safe" : t.spf === "~all" ? "warn" : "risk"}>{t.spf}</td>
                    <td className="py-1.5 pr-3" data-tint="fg" data-tone={t.dkim ? "safe" : "warn"}>{t.dkim ? "oui" : "non trouvé"}</td>
                    <td className="py-1.5 pr-3" data-tint="fg" data-tone={t.dmarc === "reject" || t.dmarc === "quarantine" ? "safe" : t.dmarc === "none" ? "warn" : "risk"}>{t.dmarc}</td>
                    <td className="py-1.5 tabular-nums" data-tint="fg" data-tone={scoreTone(t.emailScore as number)}>{t.emailScore}/100</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section id="conformite" title="Exigences de conformité en échec" hint="Repères indicatifs : ils ne valent pas constat de conformité.">
          {o.compliance.length === 0 ? (
            <p className="text-sm text-muted">Aucune exigence concernée.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              {(Object.keys(FRAMEWORK_LABELS) as (keyof typeof FRAMEWORK_LABELS)[]).map((fw) => {
                const rows = o.compliance.filter((r) => r.framework === fw);
                return (
                  <div key={fw}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-subtle">{FRAMEWORK_LABELS[fw]}</p>
                    <ul className="mt-1 space-y-0.5 text-sm">
                      {rows.slice(0, 6).map((r) => (
                        <li key={r.control} className="flex justify-between gap-2">
                          <span className="font-mono text-[0.8rem] text-fg">{r.control}</span>
                          <span className="tabular-nums text-muted">{r.failing}</span>
                        </li>
                      ))}
                      {rows.length === 0 && <li className="text-muted">—</li>}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
        <Section id="activite" title="Activité récente">
          {remediation && remediation.total > 0 && (
            <p className="mb-3 rounded-lg border border-border bg-sunken px-3 py-2 text-sm text-muted">
              Vulnérabilités de pentest : <strong className="text-fg">{fixRate} % corrigées</strong> ({remediation.fixed}/{remediation.total})
              {remediation.avgOpenAgeDays !== null && remediation.open > 0 && (
                <> · âge moyen des {remediation.open} ouvertes : <strong className="text-fg">{remediation.avgOpenAgeDays} j</strong></>
              )}
            </p>
          )}
          {audit.length === 0 ? (
            <p className="text-sm text-muted">Aucune activité enregistrée.</p>
          ) : (
            <ul className="divide-y divide-border/70">
              {audit.map((a) => (
                <li key={a.id} className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="text-fg">{ACTION_LABEL[a.action] ?? a.action}</span>
                    {a.target && <span className="text-subtle"> · {a.target}</span>}
                  </span>
                  <span className="flex-none text-xs text-subtle">{formatDateTime(a.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/dashboard/team" className="mt-3 inline-block text-xs font-medium text-brand-light hover:underline">
            Journal complet →
          </Link>
        </Section>
      </div>
    </>
  );
}
