"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/format";

type ApiKey = {
  id: string;
  name: string | null;
  token_prefix: string;
  last_used_at: string | null;
  created_at: string;
};

export default function ApiKeysPanel() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState("");
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mcpUrl, setMcpUrl] = useState("/api/mcp");
  const [busy, setBusy] = useState(false);

  async function load(signal?: AbortSignal) {
    const res = await fetch("/api/keys", { signal });
    if (res.ok) setKeys((await res.json()).keys || []);
    setLoading(false);
  }
  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal).catch(() => {});
    setMcpUrl(`${window.location.origin}/api/mcp`);
    return () => ac.abort();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setFreshToken(null);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || "Échec.");
        return;
      }
      setFreshToken(d.token);
      setKeys(d.keys || []);
      setName("");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/keys", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const d = await res.json();
      if (res.ok) setKeys(d.keys || []);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2 className="font-heading text-xl font-bold text-fg">Clés API & serveur MCP</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Générez une clé pour piloter Sentinel depuis un client IA (Claude Desktop, Cursor…) via
        le <strong className="text-fg">serveur MCP</strong>. Outils exposés : <code>passive_scan</code>,{" "}
        <code>list_scans</code>, <code>launch_pentest</code>, <code>get_pentest</code>.
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-risk/30 bg-risk/10 px-4 py-2.5 text-sm text-risk">
          {error}
        </p>
      )}

      <div className="card mt-4 p-5">
        <form onSubmit={create} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1">
            <span className="mb-1 block text-xs font-medium text-subtle">Nom de la clé</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex. Claude Desktop"
              className="input"
            />
          </label>
          <button type="submit" disabled={busy} aria-busy={busy} className="btn btn-primary disabled:opacity-60">
            Générer une clé
          </button>
        </form>
      </div>

      {freshToken && (
        <div className="mt-4 rounded-lg border border-safe/30 bg-safe/10 p-4">
          <p className="text-sm text-fg">
            Copiez cette clé maintenant — elle ne sera <strong>plus jamais affichée</strong> :
          </p>
          <code className="mt-2 block break-all rounded-md bg-bg-elev/70 px-3 py-2 font-mono text-sm text-brand-light">
            {freshToken}
          </code>
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {loading &&
          Array.from({ length: 3 }).map((_, i) => (
            <li key={`sk-${i}`} className="card p-3">
              <div className="skeleton h-4 w-2/3" />
            </li>
          ))}
        {!loading && keys.length === 0 && (
          <li className="text-sm text-muted">Aucune clé API.</li>
        )}
        {keys.map((k) => (
          <li key={k.id} className="card flex items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-fg">
                {k.name || "Sans nom"}{" "}
                <span className="font-mono text-xs text-subtle">{k.token_prefix}…</span>
              </p>
              <p className="text-xs text-subtle">
                {k.last_used_at
                  ? `Dernière utilisation ${formatDate(k.last_used_at)}`
                  : "Jamais utilisée"}
              </p>
            </div>
            <button
              onClick={() => revoke(k.id)}
              disabled={busy}
              className="flex-none rounded-md px-2.5 py-1 text-xs text-risk transition-colors hover:bg-hover disabled:opacity-60"
            >
              Révoquer
            </button>
          </li>
        ))}
      </ul>

      <div className="card mt-6 p-4">
        <p className="text-sm font-semibold text-fg">Configuration MCP (Claude Desktop)</p>
        <pre className="mt-2 overflow-x-auto rounded-md bg-sunken p-3 text-xs text-muted">
{`{
  "mcpServers": {
    "sentinel": {
      "type": "http",
      "url": "${mcpUrl}",
      "headers": { "Authorization": "Bearer sntl_VOTRE_CLE" }
    }
  }
}`}
        </pre>
      </div>
    </section>
  );
}
