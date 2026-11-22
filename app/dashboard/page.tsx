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
import { AlertTriangle, ArrowRight, Crosshair, Globe, ShieldCheck, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

// Icônes des indicateurs clés (lucide, comme shadcn/ui).
const KPI_ICON: Record<"shield" | "alert" | "target" | "globe", LucideIcon> = {
  shield: ShieldCheck,
  alert: AlertTriangle,
  target: Crosshair,
  globe: Globe,
};

function dateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

/** Carte d'indicateur (bloc « section cards » de shadcn/ui). */
function Kpi({
  label,
  value,
  sub,
  valueTone,
  chipTone,
  icon,
  href,
}: {
  label: string;
  value: React.ReactNode;
  sub: React.ReactNode;
  valueTone?: "safe" | "warn" | "risk";
  chipTone: string;
  icon: keyof typeof KPI_ICON;
  href: string;
}) {
  const Icon = KPI_ICON[icon];
  return (
    <Link href={href} className="group/kpi rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
      <Card className="@container/card h-full gap-4 bg-linear-to-t from-brand/5 to-card transition-colors group-hover/kpi:border-border-strong">
        <CardHeader>
          <CardDescription>{label}</CardDescription>
          <CardTitle
            className="font-heading text-2xl font-semibold tabular-nums @[250px]/card:text-3xl"
            data-tint={valueTone ? "fg" : undefined}
            data-tone={valueTone}
          >
            {value}
          </CardTitle>
          <CardAction>
            <Badge tone={chipTone} className="rounded-md p-1.5" aria-hidden="true">
              <Icon className="!size-4" />
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="text-sm text-muted">{sub}</CardFooter>
      </Card>
    </Link>
  );
}

function Pill({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <Badge tone={tone}>{children}</Badge>;
}

export default async function OverviewPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard");

  if (!dbConfigured)
    return (
      <main className="container-x py-8 lg:py-10">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-fg">Vue d&apos;ensemble</h1>
        <p className="mt-4 rounded-lg border border-warn/30 bg-warn/10 px-4 py-2.5 text-sm text-warn">
          Mode démo : la base n&apos;est pas connectée, aucun historique n&apos;est conservé.
        </p>
        <Button asChild className="mt-6">
          <Link href="/dashboard/scan">Lancer un scan</Link>
        </Button>
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
  const pendingDomains = domains.length - verified;
  const openTotal = SEVERITIES.reduce((n, s) => n + findings[s.key], 0);
  const urgent = findings.critical + findings.high;
  const limits = PLANS[plan.plan].limits;
  const pentestLimit = limits.pentests;

  // Historique du score pour la cible principale (du plus ancien au plus récent, max 8 points).
  const primaryHost = last ? host(last.target_url) : null;
  const history = primaryHost
    ? done
        .filter((s) => host(s.target_url) === primaryHost && s.score !== null)
        .slice(0, 8)
        .reverse()
        .map((s) => ({ score: s.score as number, created_at: s.created_at }))
    : [];

  // Géométrie de la courbe (coordonnées = attributs SVG, aucun style en ligne : CSP).
  let chart: {
    line: string;
    area: string;
    grid: { v: number; y: number }[];
    cx: number;
    cy: number;
  } | null = null;
  if (history.length >= 2) {
    const W = 520, H = 180, L = 36, R = 12, T = 14, B = 26;
    const plotW = W - L - R, plotH = H - T - B, by = T + plotH;
    const vals = history.map((p) => p.score);
    const min = Math.min(...vals), max = Math.max(...vals);
    let lo = Math.max(0, Math.floor((min - 6) / 10) * 10);
    let hi = Math.min(100, Math.ceil((max + 6) / 10) * 10);
    if (hi - lo < 20) {
      hi = Math.min(100, lo + 20);
      if (hi - lo < 20) lo = Math.max(0, hi - 20);
    }
    const span = hi - lo || 1;
    const x = (i: number) => L + (i / (history.length - 1)) * plotW;
    const y = (v: number) => T + (1 - (v - lo) / span) * plotH;
    const pts = history.map((p, i) => `${x(i).toFixed(1)},${y(p.score).toFixed(1)}`);
    chart = {
      line: pts.join(" "),
      area: `M ${pts.join(" L ")} L ${x(history.length - 1).toFixed(1)},${by} L ${x(0).toFixed(1)},${by} Z`,
      grid: [hi, Math.round((hi + lo) / 2), lo].map((v) => ({ v, y: y(v) })),
      cx: x(history.length - 1),
      cy: y(history[history.length - 1].score),
    };
  }

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
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-fg">Vue d&apos;ensemble</h1>
          <p className="mt-1 text-sm text-muted">
            Bonjour {session.name || session.email} — voici l&apos;état de sécurité de vos cibles.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/pentest">Pentest autonome</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/scan">Nouveau scan</Link>
          </Button>
        </div>
      </div>

      {onboarding && (
        <section aria-labelledby="demarrage" className="card mt-6 p-6">
          <h2 id="demarrage" className="font-semibold leading-none text-fg">
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
          icon="shield"
          chipTone={last ? gradeTone(last.grade) : "muted"}
          valueTone={last ? gradeTone(last.grade) : undefined}
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
          icon="alert"
          chipTone={urgent > 0 ? "risk" : openTotal > 0 ? "warn" : "safe"}
          valueTone={urgent > 0 ? "risk" : openTotal > 0 ? "warn" : undefined}
          value={openTotal}
          sub={urgent > 0 ? `dont ${urgent} critique${urgent > 1 ? "s" : ""} ou élevée${urgent > 1 ? "s" : ""}` : "Aucune critique ni élevée"}
        />
        <Kpi
          href="/dashboard/abonnement"
          label="Pentests ce mois-ci"
          icon="target"
          chipTone="brand"
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
          icon="globe"
          chipTone={pendingDomains > 0 ? "warn" : verified > 0 ? "safe" : "muted"}
          value={`${verified}${domains.length > verified ? ` / ${domains.length}` : ""}`}
          sub={pendingDomains > 0 ? `${pendingDomains} en attente de vérification` : verified ? "Scan approfondi débloqué" : "Aucun domaine vérifié"}
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section aria-labelledby="evolution" className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="evolution" className="font-semibold leading-none text-fg">
              Évolution du score
            </h2>
            {primaryHost && <span className="truncate text-sm text-subtle">{primaryHost}</span>}
          </div>
          {chart ? (
            <svg
              viewBox="0 0 520 180"
              className="mt-4 block w-full"
              role="img"
              aria-label={`Score de sécurité de ${primaryHost} : de ${history[0].score} à ${history[history.length - 1].score} sur 100, sur ${history.length} scans.`}
            >
              {chart.grid.map((g) => (
                <g key={g.v}>
                  <line x1="36" y1={g.y} x2="508" y2={g.y} data-tint="stroke" data-tone="border-strong" strokeOpacity="0.4" />
                  <text x="30" y={g.y + 3.5} textAnchor="end" fontSize="11" data-tint="fill" data-tone="subtle">{g.v}</text>
                </g>
              ))}
              <path d={chart.area} data-tint="fill" data-tone="brand" fillOpacity="0.12" />
              <polyline points={chart.line} data-tint="stroke" data-tone="brand" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={chart.cx} cy={chart.cy} r="4.5" data-tint="fill" data-tone="brand" />
              <text x="36" y="174" fontSize="11" data-tint="fill" data-tone="subtle">{dateShort(history[0].created_at)}</text>
              <text x="508" y="174" textAnchor="end" fontSize="11" data-tint="fill" data-tone="subtle">{dateShort(history[history.length - 1].created_at)}</text>
            </svg>
          ) : (
            <p className="mt-6 text-sm text-muted">
              {primaryHost
                ? "Pas encore assez d'historique pour tracer une courbe. Relancez un scan sur la même cible pour suivre l'évolution du score."
                : "Lancez un premier scan pour commencer à suivre l'évolution du score de vos cibles."}
            </p>
          )}
        </section>

        <section aria-labelledby="gravite" className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="gravite" className="font-semibold leading-none text-fg">
              Vulns par gravité
            </h2>
            <Button asChild variant="ghost" size="sm" className="-my-1.5">
              <Link href="/dashboard/pentest">
                Pentests <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
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
              <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5">
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
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="scans" className="card p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 id="scans" className="font-semibold leading-none text-fg">Derniers scans</h2>
            <Button asChild variant="ghost" size="sm" className="-my-1.5">
              <Link href="/dashboard/scan">
                Tout voir <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
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

        <section aria-labelledby="pentests" className="card p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 id="pentests" className="font-semibold leading-none text-fg">Derniers pentests</h2>
            <Button asChild variant="ghost" size="sm" className="-my-1.5">
              <Link href="/dashboard/pentest">
                Tout voir <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
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
