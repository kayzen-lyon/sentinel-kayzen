"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatDate } from "@/lib/format";

type Limits = Record<string, number | null>;
type Billing = {
  plan: "free" | "platform" | "enterprise";
  label: string;
  status: string | null;
  periodEnd: string | null;
  exempt: boolean;
  hasCustomer: boolean;
  limits: Limits;
  usage: Record<string, number>;
  canManage: boolean;
  billingConfigured: boolean;
  enforced: boolean;
};

const ROWS: { key: string; label: string; unit?: string }[] = [
  { key: "passiveScans", label: "Scans passifs ce mois-ci" },
  { key: "pentests", label: "Pentests autonomes ce mois-ci" },
  { key: "aiBudgetUsd", label: "Budget IA des pentests ce mois-ci", unit: "$" },
  { key: "domains", label: "Domaines" },
  { key: "members", label: "Membres (invitations comprises)" },
  { key: "schedules", label: "Surveillances actives" },
];

const STATUS_FR: Record<string, string> = {
  active: "Actif",
  trialing: "Période d'essai",
  past_due: "Paiement en retard",
  canceled: "Résilié",
  unpaid: "Impayé",
  incomplete: "Paiement à finaliser",
};

function Meter({ used, limit, unit }: { used: number; limit: number | null; unit?: string }) {
  const fmt = (n: number) => (unit ? `${n.toFixed(2)} ${unit}` : String(n));
  if (limit === null)
    return <span className="text-sm text-muted">{fmt(used)} · illimité</span>;
  if (limit === 0) return <span className="text-sm text-muted">Non inclus dans cette offre</span>;
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const full = used >= limit;
  return (
    <div className="flex items-center gap-3">
      <svg
        className="h-2 w-40 flex-none overflow-hidden rounded-full bg-hover"
        viewBox="0 0 100 2"
        preserveAspectRatio="none"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={Math.min(used, limit)}
      >
        <rect x="0" y="0" height="2" width={pct} data-tint="fill" data-tone={full ? "risk" : "brand"} />
      </svg>
      <span className={`text-sm tabular-nums ${full ? "font-semibold text-risk" : "text-fg"}`}>
        {fmt(used)} / {fmt(limit)}
        {full && " — limite atteinte"}
      </span>
    </div>
  );
}

export default function BillingPanel() {
  const params = useSearchParams();
  const [data, setData] = useState<Billing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/billing", { signal: ac.signal })
      .then(async (r) => {
        const d = await r.json();
        if (r.ok) setData(d);
        else setError(d.error || "Chargement impossible.");
      })
      .catch(() => {});
    return () => ac.abort();
  }, []);

  async function go(path: "checkout" | "portal") {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/billing/${path}`, { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.url) window.location.assign(d.url);
      else {
        setError(d.error || "Une erreur est survenue.");
        setBusy(false);
      }
    } catch {
      setError("Impossible de contacter le serveur.");
      setBusy(false);
    }
  }

  const paid = params.get("paiement");

  return (
    <div className="min-h-screen">
      <main className="container-x py-8 lg:py-10">
        <h1 className="font-heading text-3xl font-bold text-fg">Abonnement &amp; utilisation</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Offre et consommation de l&apos;organisation active. Les compteurs mensuels repartent à
          zéro le 1er de chaque mois.
        </p>

        {paid === "ok" && (
          <p role="status" className="mt-4 rounded-lg border border-safe/30 bg-safe/10 px-4 py-2.5 text-sm text-fg">
            Paiement reçu, merci ! L&apos;offre s&apos;active dès la confirmation de Stripe
            (quelques secondes) : rechargez la page si elle n&apos;apparaît pas encore.
          </p>
        )}
        {paid === "annule" && (
          <p role="status" className="mt-4 rounded-lg border border-border bg-hover px-4 py-2.5 text-sm text-fg">
            Paiement annulé : rien n&apos;a été débité.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-risk/30 bg-risk/10 px-4 py-2.5 text-sm text-risk">
            {error}
          </p>
        )}

        {!data && !error && <div className="skeleton mt-8 h-40 w-full max-w-3xl" />}

        {data && (
          <>
            <section className="mt-8 card max-w-3xl p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-subtle">Offre actuelle</p>
                  <p className="mt-1 font-heading text-2xl font-bold text-fg">{data.label}</p>
                  <p className="mt-1 text-sm text-muted">
                    {data.exempt
                      ? "Offre attribuée par Kayzen."
                      : data.status
                        ? `${STATUS_FR[data.status] || data.status}${
                            data.periodEnd ? ` · prochaine échéance le ${formatDate(data.periodEnd)}` : ""
                          }`
                        : "Sans abonnement."}
                  </p>
                </div>
                {data.canManage && !data.exempt && (
                  <div className="flex flex-col gap-2">
                    {data.plan === "free" && (
                      <button
                        type="button"
                        onClick={() => go("checkout")}
                        disabled={busy || !data.billingConfigured}
                        className="btn btn-primary disabled:opacity-60"
                      >
                        Passer à l&apos;offre Plateforme
                      </button>
                    )}
                    {data.hasCustomer && (
                      <button type="button" onClick={() => go("portal")} disabled={busy} className="btn disabled:opacity-60">
                        Gérer l&apos;abonnement et les factures
                      </button>
                    )}
                  </div>
                )}
              </div>
              {data.status === "past_due" && (
                <p role="alert" className="mt-4 text-sm text-risk">
                  Le dernier paiement a échoué. Mettez à jour votre moyen de paiement pour
                  conserver l&apos;offre.
                </p>
              )}
              {data.plan === "free" && !data.billingConfigured && (
                <p className="mt-4 text-sm text-muted">
                  Le paiement en ligne n&apos;est pas encore activé :{" "}
                  <Link href="/#contact" className="underline">contactez-nous</Link> pour souscrire.
                </p>
              )}
              {!data.canManage && (
                <p className="mt-4 text-sm text-muted">
                  Seul un propriétaire ou un admin de l&apos;organisation peut modifier l&apos;abonnement.
                </p>
              )}
            </section>

            <section className="mt-6 card max-w-3xl p-6">
              <h2 className="font-heading text-lg font-semibold text-fg">Utilisation</h2>
              {!data.enforced && (
                <p className="mt-2 text-sm text-muted">
                  Les limites sont affichées à titre indicatif : elles ne sont pas encore
                  appliquées tant que le paiement en ligne n&apos;est pas activé.
                </p>
              )}
              <ul className="mt-4 divide-y divide-border/60">
                {ROWS.map((r) => (
                  <li key={r.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <span className="text-sm text-fg">{r.label}</span>
                    <Meter used={data.usage[r.key] ?? 0} limit={data.limits[r.key] ?? null} unit={r.unit} />
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-subtle">
                Offre Entreprise et audit managé : sur devis, via la page Contact.
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
