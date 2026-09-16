"use client";

import { useEffect, useState } from "react";

type Domain = {
  id: string;
  domain: string;
  token: string;
  method: string | null;
  verified_at: string | null;
};

export default function DomainsPanel() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load(signal?: AbortSignal) {
    try {
      const r = await fetch("/api/domains", { signal });
      const d = await r.json();
      if (r.ok) setDomains(d.domains || []);
    } catch {
      /* ignore */
    }
  }
  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, []);

  async function addDomain(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const r = await fetch("/api/domains", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domain: input }),
      });
      const d = await r.json();
      if (!r.ok) setError(d.error || "Erreur.");
      else {
        setInput("");
        setNotice(`Jeton généré pour ${d.domain}. Ajoutez-le puis cliquez « Vérifier ».`);
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function verify(domain: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const r = await fetch("/api/domains/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        setError(err.error || "Vérification indisponible.");
        await load();
        return;
      }
      const d = await r.json();
      if (d.verified) setNotice(`${domain} vérifié via ${d.method === "dns" ? "DNS" : "fichier"} ✓`);
      else setError(d.reason || "Vérification échouée.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="font-heading text-xl font-semibold text-fg">Mes domaines</h2>
      <p className="mt-1.5 text-sm text-muted">
        Vérifiez la propriété d'un domaine pour débloquer le{" "}
        <strong className="text-fg">scan approfondi</strong> (certificat TLS, SPF/DMARC,
        contenu mixte, robots.txt…).
      </p>

      <form onSubmit={addDomain} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="mb-1 block text-xs font-medium text-subtle">
            Domaine à vérifier
          </span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="mon-site.fr"
            disabled={busy}
            className="w-full rounded-xl border border-border-strong bg-bg px-4 py-3 text-fg outline-none placeholder:text-subtle focus:border-brand focus:ring-2 focus:ring-brand/30 disabled:opacity-60"
          />
        </label>
        <button type="submit" disabled={busy} aria-busy={busy} className="btn btn-primary disabled:opacity-60">
          Générer un jeton
        </button>
      </form>

      {notice && (
        <p className="mt-4 rounded-lg border border-safe/30 bg-safe/10 px-4 py-2.5 text-sm text-safe">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-risk/30 bg-risk/10 px-4 py-2.5 text-sm text-risk">
          {error}
        </p>
      )}

      <ul className="mt-6 space-y-4">
        {domains.length === 0 && (
          <li className="text-sm text-subtle">Aucun domaine pour l'instant.</li>
        )}
        {domains.map((d) => (
          <li key={d.id} className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="font-heading text-base font-semibold text-fg">{d.domain}</span>
              {d.verified_at ? (
                <span className="rounded-full bg-safe/14 px-2.5 py-1 text-xs font-semibold text-safe">
                  Vérifié ✓
                </span>
              ) : (
                <span className="rounded-full bg-warn/14 px-2.5 py-1 text-xs font-semibold text-warn">
                  En attente
                </span>
              )}
            </div>

            {!d.verified_at && (
              <div className="mt-4 space-y-3 text-sm">
                <p className="text-muted">
                  Ajoutez <strong className="text-fg">l'une</strong> de ces deux preuves,
                  puis cliquez « Vérifier » :
                </p>
                <div className="rounded-lg border border-border bg-bg-elev/60 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-subtle">
                    Option A — Enregistrement DNS TXT
                  </p>
                  <code className="mt-1 block break-all text-xs text-fg">
                    _sentinel-verify.{d.domain} → {d.token}
                  </code>
                </div>
                <div className="rounded-lg border border-border bg-bg-elev/60 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-subtle">
                    Option B — Fichier
                  </p>
                  <code className="mt-1 block break-all text-xs text-fg">
                    https://{d.domain}/.well-known/sentinel-verify.txt
                  </code>
                  <p className="mt-1 text-xs text-muted">contenant : <code className="text-fg">{d.token}</code></p>
                </div>
                <button
                  onClick={() => verify(d.domain)}
                  disabled={busy}
                  className="btn btn-ghost !py-2 text-sm disabled:opacity-60"
                >
                  Vérifier maintenant
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
