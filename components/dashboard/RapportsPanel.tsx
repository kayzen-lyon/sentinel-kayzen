"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/format";

type Rapport = { id: string; titre: string; cree_le: string; scan_ids: string[]; job_ids: string[]; expire_le: string | null };
type Sources = {
  scans: { id: string; target_url: string; created_at: string; score: number | null }[];
  pentests: { id: string; target_url: string; created_at: string; mode: string }[];
};

const hote = (u: string) => {
  try {
    return new URL(u).hostname;
  } catch {
    return u;
  }
};

/**
 * Rapports de test d'intrusion. Le formulaire n'envoie que des identifiants : le serveur relit
 * chaque scan et pentest, vérifie qu'il appartient au compte et qu'il date de 7 jours au plus.
 */
export default function RapportsPanel() {
  const [rapports, setRapports] = useState<Rapport[]>([]);
  const [sources, setSources] = useState<Sources>({ scans: [], pentests: [] });
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();

  async function charger() {
    try {
      const r = await fetch("/api/rapports");
      const d = await r.json();
      if (r.ok) {
        setRapports(d.rapports || []);
        setSources(d.sources || { scans: [], pentests: [] });
      }
    } catch {
      /* hors ligne */
    }
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial
    charger();
  }, []);

  async function creer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const r = await fetch("/api/rapports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ titre: f.get("titre"), scanIds: f.getAll("scan"), jobIds: f.getAll("job") }),
      });
      const d = await r.json();
      if (!r.ok) toast.error(d.error || "Création impossible.");
      else router.push(`/dashboard/rapports/${d.id}`);
    } finally {
      setBusy(false);
    }
  }

  const vide = !sources.scans.length && !sources.pentests.length;

  return (
    <div>
      <p className="max-w-3xl text-sm text-muted">
        Un rapport rassemble des scans et des pentests <strong className="text-fg">terminés depuis 7 jours au plus</strong>,
        relus côté serveur. Il n&apos;est jamais public : seuls les membres de votre compte y accèdent, et ses exports
        ne contiennent aucune preuve d&apos;exploitation.
      </p>

      <form onSubmit={creer} className="card mt-5 p-5" aria-labelledby="nouveau-rapport">
        <h2 id="nouveau-rapport" className="font-heading text-lg font-semibold text-fg">Nouveau rapport</h2>
        {vide ? (
          <p className="mt-3 text-sm text-muted">
            Aucun scan ni pentest terminé depuis 7 jours. Lancez-en un depuis le{" "}
            <Link href="/dashboard/scan" className="text-brand-light underline underline-offset-2">Scanner</Link> ou le{" "}
            <Link href="/dashboard/pentest" className="text-brand-light underline underline-offset-2">Pentest autonome</Link>.
          </p>
        ) : (
          <>
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-medium text-subtle">Titre</span>
              <input
                name="titre"
                maxLength={140}
                placeholder="Rapport de test d'intrusion"
                className="w-full rounded-xl border border-border-strong bg-bg px-4 py-3 text-fg outline-none placeholder:text-subtle focus:border-brand focus:ring-2 focus:ring-brand/30"
              />
            </label>
            {sources.pentests.length > 0 && (
              <fieldset className="mt-4">
                <legend className="text-sm font-semibold text-fg">Pentests</legend>
                {sources.pentests.map((p) => (
                  <label key={p.id} className="mt-2 flex min-h-11 items-center gap-3 text-sm text-fg">
                    <input type="checkbox" name="job" value={p.id} defaultChecked className="size-5 accent-[rgb(var(--brand))]" />
                    {hote(p.target_url)} · mode {p.mode} · {formatDateTime(p.created_at)}
                  </label>
                ))}
              </fieldset>
            )}
            {sources.scans.length > 0 && (
              <fieldset className="mt-4">
                <legend className="text-sm font-semibold text-fg">Scans</legend>
                {sources.scans.map((s, i) => (
                  <label key={s.id} className="mt-2 flex min-h-11 items-center gap-3 text-sm text-fg">
                    <input type="checkbox" name="scan" value={s.id} defaultChecked={i === 0} className="size-5 accent-[rgb(var(--brand))]" />
                    {hote(s.target_url)} · {s.score !== null ? `${s.score}/100` : "—"} · {formatDateTime(s.created_at)}
                  </label>
                ))}
              </fieldset>
            )}
            <button type="submit" disabled={busy} aria-busy={busy} className="btn btn-primary mt-5 disabled:opacity-60">
              Créer le rapport
            </button>
          </>
        )}
      </form>

      <h2 className="mt-8 font-heading text-xl font-semibold text-fg">Rapports</h2>
      {rapports.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Aucun rapport pour l&apos;instant.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {rapports.map((r) => (
            <li key={r.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <Link href={`/dashboard/rapports/${r.id}`} className="font-semibold text-fg underline-offset-2 hover:underline">
                  {r.titre}
                </Link>
                <p className="text-xs text-subtle">
                  {formatDateTime(r.cree_le)} · {r.job_ids.length} pentest(s), {r.scan_ids.length} scan(s)
                  {r.expire_le ? ` · supprimé le ${formatDateTime(r.expire_le)}` : ""}
                </p>
              </div>
              <Link href={`/dashboard/rapports/${r.id}`} className="btn btn-ghost !py-2 text-sm">
                Ouvrir<span className="sr-only"> le rapport {r.titre}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
