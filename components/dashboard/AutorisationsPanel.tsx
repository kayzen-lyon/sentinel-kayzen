"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/format";

type Autorisation = {
  id: string;
  client: string;
  perimetre: string[];
  debut: string;
  fin: string;
  document_nom: string;
  document_sha256: string;
  revoked_at: string | null;
};

const champ =
  "w-full rounded-xl border border-border-strong bg-bg px-4 py-3 text-fg outline-none placeholder:text-subtle focus:border-brand focus:ring-2 focus:ring-brand/30 disabled:opacity-60";

function etat(a: Autorisation): { label: string; tone: string } {
  const j = new Date().toISOString().slice(0, 10);
  if (a.revoked_at) return { label: "Révoquée", tone: "muted" };
  if (j < a.debut) return { label: "À venir", tone: "warn" };
  if (j > a.fin) return { label: "Expirée", tone: "muted" };
  return { label: "En cours", tone: "safe" };
}

/** Registre des autorisations écrites des clients (garde-fou obligatoire avant tout test actif). */
export default function AutorisationsPanel() {
  const [liste, setListe] = useState<Autorisation[]>([]);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function charger() {
    try {
      const r = await fetch("/api/autorisations");
      const d = await r.json();
      if (r.ok) setListe(d.autorisations || []);
    } catch {
      /* hors ligne */
    }
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial
    charger();
  }, []);

  async function enregistrer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    try {
      const r = await fetch("/api/autorisations", { method: "POST", body: new FormData(form) });
      const d = await r.json();
      if (!r.ok) toast.error(d.error || "Enregistrement impossible.");
      else {
        toast.info("Autorisation enregistrée.");
        form.reset();
        await charger();
      }
    } finally {
      setBusy(false);
    }
  }

  async function revoquer(a: Autorisation) {
    if (!window.confirm(`Révoquer l'autorisation de ${a.client} ? Les tests sur ce périmètre seront bloqués.`)) return;
    const r = await fetch(`/api/autorisations?id=${a.id}`, { method: "DELETE" });
    if (!r.ok) toast.error("Révocation impossible.");
    await charger();
  }

  return (
    <div>
      <p className="max-w-3xl text-sm text-muted">
        Aucun test actif (pentest autonome, scan approfondi, surveillance planifiée) ne démarre sans une
        autorisation écrite du client couvrant l&apos;hôte visé, à la date du test. Elle est vérifiée par le
        serveur avant chaque lancement et à chaque passage de la surveillance quotidienne, en plus de la
        preuve de propriété du domaine (onglet Domaines).
      </p>

      <form onSubmit={enregistrer} className="card mt-5 grid gap-4 p-5 md:grid-cols-2" aria-labelledby="nouvelle-autorisation">
        <h2 id="nouvelle-autorisation" className="font-heading text-lg font-semibold text-fg md:col-span-2">
          Nouvelle autorisation
        </h2>
        <label>
          <span className="mb-1 block text-xs font-medium text-subtle">Client (signataire)</span>
          <input name="client" required autoComplete="organization" disabled={busy} className={champ} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-subtle">Document signé (PDF, PNG ou JPEG, 5 Mo max.)</span>
          <input name="document" type="file" required accept="application/pdf,image/png,image/jpeg" disabled={busy} className={champ} />
        </label>
        <label className="md:col-span-2">
          <span className="mb-1 block text-xs font-medium text-subtle" id="perimetre-aide">
            Périmètre autorisé : un hôte par ligne (ex. app.exemple.fr ; *.exemple.fr pour les sous-domaines)
          </span>
          <textarea name="perimetre" required rows={3} aria-describedby="perimetre-aide" disabled={busy} className={champ} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-subtle">Début (inclus)</span>
          <input name="debut" type="date" required disabled={busy} className={champ} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-subtle">Fin (incluse)</span>
          <input name="fin" type="date" required disabled={busy} className={champ} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={busy} aria-busy={busy} className="btn btn-primary disabled:opacity-60">
            Enregistrer l&apos;autorisation
          </button>
        </div>
      </form>

      <h2 className="mt-8 font-heading text-xl font-semibold text-fg">Autorisations enregistrées</h2>
      {liste.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Aucune autorisation : les tests actifs sont bloqués.</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Autorisations écrites de test d&apos;intrusion</caption>
            <thead className="text-subtle">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">Client</th>
                <th scope="col" className="px-4 py-2 font-medium">Périmètre</th>
                <th scope="col" className="px-4 py-2 font-medium">Période</th>
                <th scope="col" className="px-4 py-2 font-medium">État</th>
                <th scope="col" className="px-4 py-2 font-medium">Document</th>
                <th scope="col" className="px-4 py-2 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {liste.map((a) => {
                const e = etat(a);
                return (
                  <tr key={a.id} className="border-t border-border align-top">
                    <td className="px-4 py-2 font-medium text-fg">{a.client}</td>
                    <td className="px-4 py-2 text-muted">{a.perimetre.join(", ")}</td>
                    <td className="px-4 py-2 text-muted">
                      {formatDate(a.debut)} → {formatDate(a.fin)}
                    </td>
                    <td className="px-4 py-2">
                      <span className="rounded-full px-2.5 py-1 text-xs font-semibold" data-tint="soft" data-tone={e.tone}>
                        {e.label}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <a href={`/api/autorisations/${a.id}/document`} className="text-brand-light underline underline-offset-2">
                        {a.document_nom}
                      </a>
                      <span className="block text-xs text-subtle" title={a.document_sha256}>
                        SHA-256 {a.document_sha256.slice(0, 12)}…
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {!a.revoked_at && (
                        <button type="button" onClick={() => revoquer(a)} className="btn btn-ghost !py-1.5 text-xs">
                          Révoquer<span className="sr-only"> l&apos;autorisation de {a.client}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
