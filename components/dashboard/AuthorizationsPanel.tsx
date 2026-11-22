"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { authorizationStatus, type AuthorizationStatus } from "@/lib/authorizationScope";
import { formatDateTime } from "@/lib/format";

type Authorization = {
  id: string;
  host: string;
  include_subdomains: boolean;
  starts_at: string;
  ends_at: string;
  signer_name: string;
  signer_title: string;
  accepted_at: string;
  recorded_by_email: string | null;
  created_at: string;
  revoked_at: string | null;
};

const STATUS: Record<AuthorizationStatus, { label: string; tone: string }> = {
  active: { label: "En cours de validité", tone: "safe" },
  upcoming: { label: "À venir", tone: "brand-light" },
  expired: { label: "Expirée", tone: "muted" },
  revoked: { label: "Révoquée", tone: "risk" },
};

const INPUT =
  "w-full rounded-xl border border-border-strong bg-bg px-4 py-3 text-fg outline-none placeholder:text-subtle focus:border-brand focus:ring-2 focus:ring-brand/30 disabled:opacity-60";

/** Champ datetime-local (heure locale du navigateur) → ISO 8601. */
function toIso(local: string): string {
  if (!local) return "";
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

const EMPTY = {
  host: "",
  includeSubdomains: false,
  startsAt: "",
  endsAt: "",
  signerName: "",
  signerTitle: "",
  acceptedAt: "",
};

/**
 * Autorisations écrites des clients : exigées (en plus du domaine vérifié) avant tout pentest
 * actif. Le scan passif d'en-têtes n'en dépend pas.
 */
export default function AuthorizationsPanel() {
  const [items, setItems] = useState<Authorization[]>([]);
  const [manage, setManage] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function load(signal?: AbortSignal) {
    try {
      const r = await fetch("/api/authorizations", { signal });
      const d = await r.json();
      if (r.ok) {
        setItems(d.authorizations || []);
        setManage(Boolean(d.canManage));
      }
    } catch {
      /* ignore */
    }
  }
  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, []);

  function set<K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function record(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/authorizations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          startsAt: toIso(form.startsAt),
          endsAt: toIso(form.endsAt),
          acceptedAt: toIso(form.acceptedAt),
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) toast.error(d.error || "Erreur.");
      else {
        setForm(EMPTY);
        toast.success("Autorisation enregistrée.");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function revoke(a: Authorization) {
    if (busy) return;
    if (!window.confirm(`Révoquer l'autorisation pour ${a.host} ? Les pentests sur ce périmètre seront refusés.`))
      return;
    setBusy(true);
    try {
      const r = await fetch(`/api/authorizations?id=${encodeURIComponent(a.id)}`, { method: "DELETE" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) toast.error(d.error || "Erreur.");
      else toast.info("Autorisation révoquée.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-10">
      <h2 className="font-heading text-xl font-semibold text-fg">Autorisations écrites des clients</h2>
      <p className="mt-1.5 text-sm text-muted">
        Un <strong className="text-fg">pentest actif</strong> n&apos;est lancé que si une autorisation
        écrite et signée du client, en cours de validité, couvre l&apos;hôte visé — en plus de la
        vérification du domaine. Le scan passif d&apos;en-têtes n&apos;en dépend pas. Conservez
        l&apos;original signé : Sentinel n&apos;enregistre que ses références.
      </p>

      {manage && (
        <form onSubmit={record} className="card mt-5 grid gap-3 p-5 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-subtle">Hôte ou périmètre autorisé</span>
            <input
              value={form.host}
              onChange={(e) => set("host", e.target.value)}
              placeholder="app.mon-site.fr ou *.mon-site.fr"
              required
              disabled={busy}
              className={INPUT}
            />
          </label>
          <label className="flex items-center gap-2.5 text-sm text-fg sm:col-span-2">
            <input
              type="checkbox"
              checked={form.includeSubdomains}
              onChange={(e) => set("includeSubdomains", e.target.checked)}
              disabled={busy}
              className="h-4 w-4"
            />
            Inclure les sous-domaines (l&apos;hôte et tout *.hôte)
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-subtle">Début de la fenêtre de test</span>
            <input type="datetime-local" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} required disabled={busy} className={INPUT} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-subtle">Fin de la fenêtre de test</span>
            <input type="datetime-local" value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} required disabled={busy} className={INPUT} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-subtle">Signataire — nom</span>
            <input value={form.signerName} onChange={(e) => set("signerName", e.target.value)} required maxLength={200} disabled={busy} className={INPUT} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-subtle">Signataire — fonction</span>
            <input value={form.signerTitle} onChange={(e) => set("signerTitle", e.target.value)} placeholder="DSI, gérant…" required maxLength={200} disabled={busy} className={INPUT} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-subtle">Date d&apos;acceptation (signature)</span>
            <input type="datetime-local" value={form.acceptedAt} onChange={(e) => set("acceptedAt", e.target.value)} required disabled={busy} className={INPUT} />
          </label>
          <div className="flex items-end">
            <button type="submit" disabled={busy} aria-busy={busy} className="btn btn-primary disabled:opacity-60">
              Enregistrer l&apos;autorisation
            </button>
          </div>
        </form>
      )}

      <ul className="mt-6 space-y-4">
        {items.length === 0 && (
          <li className="text-sm text-subtle">Aucune autorisation enregistrée : aucun pentest actif possible.</li>
        )}
        {items.map((a) => {
          const st = STATUS[authorizationStatus(a)];
          return (
            <li key={a.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-heading text-base font-semibold text-fg">
                  {a.include_subdomains ? `${a.host} + *.${a.host}` : a.host}
                </span>
                <span className="rounded-full px-2.5 py-1 text-xs font-semibold" data-tint="soft" data-tone={st.tone}>
                  {st.label}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">
                Du {formatDateTime(a.starts_at)} au {formatDateTime(a.ends_at)} · signée par{" "}
                <strong className="text-fg">{a.signer_name}</strong> ({a.signer_title}) le{" "}
                {formatDateTime(a.accepted_at)}
              </p>
              <p className="mt-1 text-xs text-subtle">
                Saisie le {formatDateTime(a.created_at)}
                {a.recorded_by_email ? ` par ${a.recorded_by_email}` : ""}
                {a.revoked_at ? ` · révoquée le ${formatDateTime(a.revoked_at)}` : ""}
              </p>
              {manage && !a.revoked_at && (
                <button
                  onClick={() => revoke(a)}
                  disabled={busy}
                  className="btn btn-ghost mt-3 !py-2 text-sm disabled:opacity-60"
                >
                  Révoquer
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
