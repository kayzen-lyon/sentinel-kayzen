import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { listScans } from "@/lib/scans";
import { listJobs, openFindingsBySeverity, type SeverityCounts } from "@/lib/jobs";
import { listDomains } from "@/lib/domains";
import { getActiveOrg } from "@/lib/activeorg";
import { getOrgPlan, getUsage, PLANS } from "@/lib/plans";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = {
  title: "Vue d'ensemble",
  robots: { index: false, follow: false },
};

function host(u: string): string {
  try {
    return new URL(u).host;
  } catch {
    return u;
  }
}

function gradeTone(grade: string | null): "safe" | "warn" | "risk" {
  return grade === "A" || grade === "B" ? "safe" : grade === "C" || grade === "D" ? "warn" : "risk";
}

const JOB_STATUS: Record<string, { label: string; tone: string }> = {
  pending_approval: { label: "En attente d'approbation", tone: "warn" },
  queued: { label: "En file", tone: "muted" },
  running: { label: "En cours", tone: "brand" },
  done: { label: "Terminé", tone: "safe" },
  error: { label: "Erreur", tone: "risk" },
  cancelled: { label: "Annulé", tone: "muted" },
};

const SEVERITIES: { key: keyof SeverityCounts; label: string; tone: string }[] = [
  { key: "critical", label: "Critiques", tone: "risk" },
  { key: "high", label: "Élevées", tone: "brand" },
  { key: "medium", label: "Moyennes", tone: "warn" },
  { key: "low", label: "Faibles", tone: "secondary" },
  { key: "info", label: "Informations", tone: "border-strong" },
];

function Kpi({
  label,
  value,
  sub,
  tone,
  href,
}: {
  label: string;
  value: React.ReactNode;
  sub: React.ReactNode;
  tone?: "safe" | "warn" | "risk";
  href: string;
}) {
  return (
    <Link href={href} className="card block p-5 transition-shadow hover:shadow-[var(--shadow-e3)]">
      <p className="text-xs font-semibold uppercase tracking-wide text-subtle">{label}</p>
      <p
        className="mt-2 font-heading text-3xl font-bold tabular-nums text-fg"
        data-tint={tone ? "fg" : undefined}
        data-tone={tone}
      >
        {value}
      </p>
      <p className="mt-1 text-sm text-muted">{sub}</p>
    </Link>
  );
}

function Pill({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex flex-none items-center rounded-full px-2.5 py-1 text-xs font-semibold" data-tint="soft" data-tone={tone}>
      {children}
    </span>
  );
}

export default async function OverviewPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard");

  if (!dbConfigured)
    return (
      <main className="container-x py-10">
        <h1 className="font-heading text-3xl font-bold text-fg">Vue d&apos;ensemble</h1>
        <p className="mt-4 rounded-lg border border-warn/30 bg-warn/10 px-4 py-2.5 text-sm text-warn">
          Mode démo : la base n&apos;est pas connectée, aucun historique n&apos;est conservé.
        </p>
        <Link href="/dashboard/scan" className="btn btn-primary mt-6">Lancer un scan</Link>
      </main>
    );

  const { orgId } = await getActiveOrg(session);
  const [scans, jobs, domains, findings, plan, usage] = await Promise.all([
    listScans(session.id).catch(() => []),
    listJobs(session.id, orgId).catch(() => []),
    listDomains(orgId).catch(() => []),
    openFindingsBySeverity(orgId).catch(
      (): SeverityCounts => ({ critical: 0, high: 0, medium: 0, low: 0, info: 0 })
    ),
    getOrgPlan(orgId),
    getUsage(orgId),
  ]);

  const done = scans.filter((s) => s.status === "done" && s.score !== null);
  const last = done[0];
  const previous = last ? done.find((s) => s !== last && host(s.target_url) === host(last.target_url)) : undefined;
  const delta = last && previous ? (last.score ?? 0) - (previous.score ?? 0) : null;
  const verified = domains.filter((d) => d.verified_at).length;
  const openTotal = SEVERITIES.reduce((n, s) => n + findings[s.key], 0);
  const urgent = findings.critical + findings.high;
  const limits = PLANS[plan.plan].limits;
  const pentestLimit = limits.pentests;

  const steps = [
    { done: scans.length > 0, label: "Lancer un premier scan passif", href: "/dashboard/scan", cta: "Scanner un site" },
    { done: verified > 0, label: "Vérifier la propriété d'un domaine", href: "/dashboard/domaines", cta: "Ajouter un domaine" },
    { done: jobs.length > 0, label: "Lancer un pentest autonome", href: "/dashboard/pentest", cta: "Ouvrir le pentest" },
  ];
  const onboarding = steps.some((s) => !s.done);

  return (
    <main className="container-x py-8 lg:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-fg">Vue d&apos;ensemble</h1>
          <p className="mt-1.5 text-muted">
            Bonjour {session.name || session.email} — voici l&apos;état de sécurité de vos cibles.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/pentest" className="btn btn-ghost">Pentest autonome</Link>
          <Link href="/dashboard/scan" className="btn btn-primary">Nouveau scan</Link>
        </div>
      </div>

      {onboarding && (
        <section aria-labelledby="demarrage" className="card mt-6 p-5">
          <h2 id="demarrage" className="font-heading text-lg font-semibold text-fg">
            Bien démarrer
          </h2>
          <ol className="mt-3 grid gap-3 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.label} className="flex items-start gap-3 rounded-lg border border-border bg-sunken p-3.5">
                <span
                  className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-bold"
                  data-tint="soft"
                  data-tone={s.done ? "safe" : "muted"}
                  aria-hidden="true"
                >
                  {s.done ? "✓" : i + 1}
                </span>
                <span className="min-w-0 text-sm">
                  <span className={s.done ? "text-muted line-through" : "font-medium text-fg"}>{s.label}</span>
                  <span className="sr-only">{s.done ? " — fait" : " — à faire"}</span>
                  {!s.done && (
                    <Link href={s.href} className="mt-1 block font-medium text-brand-light hover:underline">
                      {s.cta} →
                    </Link>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section aria-label="Chiffres clés" className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          href="/dashboard/scan"
          label="Dernier score"
          tone={last ? gradeTone(last.grade) : undefined}
          value={last ? `${last.grade ?? "—"} · ${last.score}/100` : "—"}
          sub={
            last ? (
              <>
                {host(last.target_url)}
                {delta !== null && delta !== 0 && (
                  <span data-tint="fg" data-tone={delta > 0 ? "safe" : "risk"}>
                    {" "}
                    ({delta > 0 ? "+" : ""}
                    {delta} pts)
                  </span>
                )}
              </>
            ) : (
              "Aucun scan pour l'instant"
            )
          }
        />
        <Kpi
          href="/dashboard/pentest"
          label="Vulnérabilités ouvertes"
          tone={urgent > 0 ? "risk" : openTotal > 0 ? "warn" : undefined}
          value={openTotal}
          sub={urgent > 0 ? `dont ${urgent} critique${urgent > 1 ? "s" : ""} ou élevée${urgent > 1 ? "s" : ""}` : "Aucune critique ni élevée"}
        />
        <Kpi
          href="/dashboard/abonnement"
          label="Pentests ce mois-ci"
          value={pentestLimit === null ? usage.pentests : pentestLimit === 0 ? usage.pentests : `${usage.pentests} / ${pentestLimit}`}
          sub={
            pentestLimit === 0
              ? `Inclus dans l'offre Plateforme`
              : `Offre ${PLANS[plan.plan].label}`
          }
        />
        <Kpi
          href="/dashboard/domaines"
          label="Domaines vérifiés"
          value={`${verified}${domains.length > verified ? ` / ${domains.length}` : ""}`}
          sub={domains.length > verified ? `${domains.length - verified} en attente de vérification` : verified ? "Scan approfondi débloqué" : "Aucun domaine vérifié"}
        />
      </section>

      <section aria-labelledby="gravite" className="card mt-6 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="gravite" className="font-heading text-lg font-semibold text-fg">
            Vulnérabilités ouvertes par gravité
          </h2>
          <Link href="/dashboard/pentest" className="text-sm font-medium text-brand-light hover:underline">
            Voir les pentests →
          </Link>
        </div>
        {openTotal === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Aucune vulnérabilité ouverte. Les résultats des pentests autonomes apparaîtront ici.
          </p>
        ) : (
          <>
            {/* Barre empilée en SVG : les largeurs sont des attributs, pas des styles en ligne (CSP). */}
            <svg className="mt-4 block h-3 w-full overflow-hidden rounded-full bg-hover" viewBox="0 0 100 3" preserveAspectRatio="none" aria-hidden="true">
              {SEVERITIES.map((s, i) => {
                const before = SEVERITIES.slice(0, i).reduce((n, p) => n + findings[p.key], 0);
                return findings[s.key] > 0 ? (
                  <rect key={s.key} x={(before / openTotal) * 100} y="0" height="3" width={(findings[s.key] / openTotal) * 100} data-tint="fill" data-tone={s.tone} />
                ) : null;
              })}
            </svg>
            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-5">
              {SEVERITIES.map((s) => (
                <li key={s.key} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 flex-none rounded-full" data-tint="dot" data-tone={s.tone} aria-hidden="true" />
                  <span className="text-muted">{s.label}</span>
                  <span className="ml-auto font-semibold tabular-nums text-fg">{findings[s.key]}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="scans" className="card p-5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="scans" className="font-heading text-lg font-semibold text-fg">Derniers scans</h2>
            <Link href="/dashboard/scan" className="text-sm font-medium text-brand-light hover:underline">
              Tout voir →
            </Link>
          </div>
          {scans.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Aucun scan pour l&apos;instant.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border/70">
              {scans.slice(0, 6).map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-2.5">
                  <span
                    className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg font-heading text-sm font-bold"
                    data-tint="soft" data-tone={gradeTone(s.grade)}
                  >
                    {s.grade ?? "—"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-fg">{host(s.target_url)}</span>
                    <span className="block text-xs text-subtle">{formatDateTime(s.created_at)}</span>
                  </span>
                  <span className="flex-none text-sm tabular-nums text-muted">
                    {s.score !== null ? `${s.score}/100` : s.status === "error" ? "Échec" : "…"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="pentests" className="card p-5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="pentests" className="font-heading text-lg font-semibold text-fg">Derniers pentests</h2>
            <Link href="/dashboard/pentest" className="text-sm font-medium text-brand-light hover:underline">
              Tout voir →
            </Link>
          </div>
          {jobs.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              Aucun pentest pour l&apos;instant. Vérifiez un domaine puis lancez votre premier pentest autonome.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border/70">
              {jobs.slice(0, 6).map((j) => {
                const st = JOB_STATUS[j.status] ?? { label: j.status, tone: "muted" };
                return (
                  <li key={j.id} className="flex items-center gap-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-fg">{host(j.target_url)}</span>
                      <span className="block text-xs text-subtle">
                        {formatDateTime(j.created_at)} · mode {j.mode}
                      </span>
                    </span>
                    <Pill tone={st.tone}>{st.label}</Pill>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
