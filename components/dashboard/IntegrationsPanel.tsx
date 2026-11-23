"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/format";

type Installation = {
  installation_id: string;
  account_login: string | null;
  created_at: string;
  confirme_le: string | null;
};

export default function IntegrationsPanel() {
  const [configured, setConfigured] = useState(false);
  const [installUrl, setInstallUrl] = useState<string | null>(null);
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [analysePr, setAnalysePr] = useState(false);
  const [loading, setLoading] = useState(true);
  const [callbackMsg, setCallbackMsg] = useState<
    { kind: "ok" | "warn"; text: string } | null
  >(null);

  // Tickets (Jira / Linear)
  const [canManage, setCanManage] = useState(false);
  const [jiraBaseUrl, setJiraBaseUrl] = useState("");
  const [jiraEmail, setJiraEmail] = useState("");
  const [jiraToken, setJiraToken] = useState("");
  const [jiraProject, setJiraProject] = useState("");
  const [linearKey, setLinearKey] = useState("");
  const [linearTeam, setLinearTeam] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("installed") === "1")
      setCallbackMsg({ kind: "ok", text: "GitHub App reliée à votre compte." });
    else if (q.get("install_conflict") === "1")
      setCallbackMsg({
        kind: "warn",
        text:
          "Cette installation GitHub est déjà reliée à un autre compte Sentinel. " +
          "Elle n'a pas été rattachée au vôtre.",
      });
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      const [gh, tk] = await Promise.all([
        fetch("/api/integrations/github", { signal: ac.signal }),
        fetch("/api/integrations/tickets", { signal: ac.signal }),
      ]);
      if (gh.ok) {
        const d = await gh.json();
        setConfigured(Boolean(d.configured));
        setInstallUrl(d.installUrl || null);
        setInstallations(d.installations || []);
        setAnalysePr(Boolean(d.analysePr));
      }
      if (tk.ok) {
        const d = await tk.json();
        setCanManage(Boolean(d.canManage));
        setJiraBaseUrl(d.jira?.baseUrl || "");
        setJiraEmail(d.jira?.email || "");
        setJiraProject(d.jira?.project || "");
        setLinearTeam(d.linear?.team || "");
      }
      setLoading(false);
    })().catch(() => {});
    return () => ac.abort();
  }, []);

  async function confirmer(id: string) {
    const res = await fetch("/api/integrations/github", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ installationId: Number(id), confirme: true }),
    });
    const d = await res.json();
    if (!res.ok) return toast.error(d.error || "Échec.");
    setInstallations((l) =>
      l.map((i) => (i.installation_id === id ? { ...i, confirme_le: d.confirme_le } : i))
    );
    toast.success("Installation confirmée.");
  }

  async function saveTickets(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/integrations/tickets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jiraBaseUrl,
          jiraEmail,
          jiraToken,
          jiraProject,
          linearKey,
          linearTeam,
        }),
      });
      const d = await res.json();
      if (res.ok) toast.success("Configuration enregistrée.");
      else toast.error(d.error || "Échec.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <main className="container-x py-8 lg:py-10">
        <h1 className="font-heading text-3xl font-bold text-fg">Intégrations</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Connectez Sentinel à vos outils de développement.
        </p>

        {callbackMsg && (
          <p
            className={`mt-6 rounded-lg px-4 py-2.5 text-sm ${
              callbackMsg.kind === "ok"
                ? "border border-brand/30 bg-brand/10 text-brand-light"
                : "border border-warn/30 bg-warn/10 text-warn"
            }`}
          >
            {callbackMsg.text}
          </p>
        )}

        <section className="mt-8">
          <h2 className="font-heading text-lg font-semibold text-fg">GitHub App</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Installez l'app Sentinel sur vos dépôts : chaque pull request est scannée par le
            moteur Strix, avec un <strong className="text-fg">statut de check</strong> et un
            commentaire récapitulatif directement sur la PR.
          </p>

          {!loading && !analysePr && (
            <p className="mt-4 rounded-lg border border-warn/30 bg-warn/10 px-4 py-2.5 text-sm text-warn">
              L'analyse du code des pull requests est désactivée : elle dépend d'un moteur d'IA. Pour un
              contrôle gratuit et sans clé à chaque pull request, utilisez le workflow de la page CI/CD.
            </p>
          )}
          {loading ? (
            <p className="mt-4 text-sm text-muted">Chargement…</p>
          ) : !configured ? (
            <p className="mt-4 rounded-lg border border-warn/30 bg-warn/10 px-4 py-2.5 text-sm text-warn">
              La GitHub App n'est pas encore configurée côté serveur (variables{" "}
              <code>GITHUB_APP_ID</code>, <code>GITHUB_APP_PRIVATE_KEY</code>,{" "}
              <code>GITHUB_WEBHOOK_SECRET</code>).
            </p>
          ) : (
            <>
              {installUrl && (
                <a href={installUrl} className="btn btn-primary mt-4 inline-flex">
                  Installer l'app GitHub
                </a>
              )}
              <ul className="mt-4 space-y-2">
                {installations.length === 0 && (
                  <li className="text-sm text-muted">Aucune installation reliée.</li>
                )}
                {installations.map((i) => (
                  <li key={i.installation_id} className="card flex items-center justify-between gap-3 p-3">
                    <span className="text-sm font-medium text-fg">
                      {i.account_login || `Installation ${i.installation_id}`}
                    </span>
                    <span className="text-xs text-subtle">
                      reliée le {formatDate(i.created_at)}
                      {i.confirme_le && `, confirmée le ${formatDate(i.confirme_le)}`}
                    </span>
                    {!i.confirme_le && (
                      <button
                        type="button"
                        className="btn btn-ghost text-xs"
                        onClick={() => confirmer(i.installation_id)}
                      >
                        Je suis responsable de ces dépôts et j'autorise leur analyse
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="mt-10">
          <h2 className="font-heading text-lg font-semibold text-fg">
            Tickets — Jira & Linear
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Configurez un gestionnaire de tickets pour créer une tâche depuis n'importe quelle
            vulnérabilité (bouton « Ticket » dans la console pentest).
          </p>

          {!loading && !canManage && (
            <p className="mt-4 text-sm text-muted">
              Seuls les administrateurs de l'organisation peuvent configurer les tickets.
            </p>
          )}

          {canManage && (
            <form onSubmit={saveTickets} className="mt-4 grid gap-6 lg:grid-cols-2">
              <div className="card space-y-3 p-4">
                <h3 className="font-heading text-sm font-semibold text-subtle">Jira</h3>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-subtle">URL de l'espace Jira</span>
                  <input className="input w-full" placeholder="https://votre-espace.atlassian.net"
                    value={jiraBaseUrl} onChange={(e) => setJiraBaseUrl(e.target.value)} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-subtle">E-mail Jira</span>
                  <input className="input w-full" placeholder="vous@entreprise.fr"
                    value={jiraEmail} onChange={(e) => setJiraEmail(e.target.value)} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-subtle">Token API</span>
                  <input className="input w-full" placeholder="Laisser vide = inchangé"
                    type="password" value={jiraToken} onChange={(e) => setJiraToken(e.target.value)} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-subtle">Clé de projet</span>
                  <input className="input w-full" placeholder="ex. SEC"
                    value={jiraProject} onChange={(e) => setJiraProject(e.target.value)} />
                </label>
              </div>
              <div className="card space-y-3 p-4">
                <h3 className="font-heading text-sm font-semibold text-subtle">Linear</h3>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-subtle">Clé API Linear</span>
                  <input className="input w-full" placeholder="Laisser vide = inchangé"
                    type="password" value={linearKey} onChange={(e) => setLinearKey(e.target.value)} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-subtle">Team ID Linear</span>
                  <input className="input w-full" placeholder="ex. TEAM-123"
                    value={linearTeam} onChange={(e) => setLinearTeam(e.target.value)} />
                </label>
              </div>
              <div className="flex items-center gap-3 lg:col-span-2">
                <button type="submit" disabled={saving} aria-busy={saving} className="btn btn-primary disabled:opacity-60">Enregistrer</button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
