"use client";

import { useEffect, useState } from "react";

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

  async function load() {
    const res = await fetch("/api/keys");
    if (res.ok) setKeys((await res.json()).keys || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
    if (typeof window !== "undefined") setMcpUrl(`${window.location.origin}/api/mcp`);
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFreshToken(null);
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
  }

  async function revoke(id: string) {
    const res = await fetch("/api/keys", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const d = await res.json();
    if (res.ok) setKeys(d.keys || []);
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

      <form onSubmit={create} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom de la clé (ex. Claude Desktop)"
          className="input flex-1"
          aria-label="Nom de la clé"
        />
        <button type="submit" className="btn btn-primary">
          Générer une clé
        </button>
      </form>

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
        {loading && <li className="text-sm text-muted">Chargement…</li>}
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
                  ? `Dernière utilisation ${new Date(k.last_used_at).toLocaleDateString("fr-FR")}`
                  : "Jamais utilisée"}
              </p>
            </div>
            <button
              onClick={() => revoke(k.id)}
              className="flex-none rounded-md px-2.5 py-1 text-xs text-risk transition-colors hover:bg-hover"
            >
              Révoquer
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-lg border border-border bg-bg-elev/40 p-4">
        <p className="text-sm font-semibold text-fg">Configuration MCP (Claude Desktop)</p>
        <pre className="mt-2 overflow-x-auto rounded-md bg-bg-elev/70 p-3 text-xs text-muted">
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
