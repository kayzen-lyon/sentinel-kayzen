"use client";

import { useEffect, useState } from "react";
import ConsoleHeader from "@/components/dashboard/ConsoleHeader";

type Role = "owner" | "admin" | "member" | "viewer";
type Member = {
  user_id: string;
  email: string;
  name: string | null;
  role: Role;
  created_at: string;
};
type Audit = {
  id: string;
  actor_email: string | null;
  action: string;
  target: string | null;
  created_at: string;
};

const ROLE_LABEL: Record<Role, string> = {
  owner: "Propriétaire",
  admin: "Admin",
  member: "Membre",
  viewer: "Lecteur",
};

const ACTION_LABEL: Record<string, string> = {
  "auth.login": "Connexion",
  "auth.signup": "Création de compte",
  "domain.verified": "Domaine vérifié",
  "pentest.launch": "Pentest lancé",
  "pentest.pending": "Pentest en attente d'approbation",
  "pentest.approved": "Pentest approuvé",
  "pentest.rejected": "Pentest rejeté",
  "finding.status": "Statut de vulnérabilité modifié",
  "team.add_member": "Membre ajouté",
  "team.set_role": "Rôle modifié",
  "team.remove_member": "Membre retiré",
  "team.require_approval": "Politique d'approbation modifiée",
  "team.integrations": "Notifications configurées",
  "scan.regression": "Régression de sécurité détectée",
};

export default function TeamPanel() {
  const [members, setMembers] = useState<Member[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [role, setRole] = useState<Role | null>(null);
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>("member");
  const [requireApproval, setRequireApproval] = useState(false);
  const [slackUrl, setSlackUrl] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [integSaved, setIntegSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const canManage = role === "owner" || role === "admin";

  async function load() {
    const res = await fetch("/api/team");
    if (res.ok) {
      const d = await res.json();
      setMembers(d.members || []);
      setAudit(d.audit || []);
      setRole(d.role || null);
      setRequireApproval(Boolean(d.requireApproval));
      setSlackUrl(d.slackUrl || "");
      setWebhookUrl(d.webhookUrl || "");
    }
    setLoading(false);
  }

  async function saveIntegrations(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIntegSaved(false);
    const res = await fetch("/api/team/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slackUrl, webhookUrl }),
    });
    if (res.ok) {
      setIntegSaved(true);
      setTimeout(() => setIntegSaved(false), 2000);
    } else {
      const d = await res.json();
      setError(d.error || "Échec.");
    }
  }

  async function toggleApproval(value: boolean) {
    setRequireApproval(value);
    const res = await fetch("/api/team/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requireApproval: value }),
    });
    if (!res.ok) {
      setRequireApproval(!value);
      const d = await res.json();
      setError(d.error || "Échec.");
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, role: newRole }),
    });
    const d = await res.json();
    if (!res.ok) {
      setError(d.error || "Échec.");
      return;
    }
    setMembers(d.members || []);
    setEmail("");
    load();
  }

  async function changeRole(userId: string, r: Role) {
    const res = await fetch("/api/team", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, role: r }),
    });
    const d = await res.json();
    if (res.ok) setMembers(d.members || []);
    else setError(d.error || "Échec.");
  }

  async function remove(userId: string) {
    const res = await fetch("/api/team", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const d = await res.json();
    if (res.ok) setMembers(d.members || []);
    else setError(d.error || "Échec.");
  }

  return (
    <div className="min-h-screen">
      <ConsoleHeader active="team" />

      <main className="container-x py-10">
        <h1 className="font-heading text-3xl font-bold text-fg">Équipe & audit</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Invitez des coéquipiers (comptes Sentinel existants) à partager vos pentests, et
          consultez le journal d'audit de votre organisation.
        </p>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-risk/30 bg-risk/10 px-4 py-2.5 text-sm text-risk">
            {error}
          </p>
        )}

        {canManage && (
          <div className="mt-6 card flex flex-wrap items-center gap-3 p-4">
            <label className="flex items-center gap-2.5 text-sm text-fg">
              <input
                type="checkbox"
                checked={requireApproval}
                onChange={(e) => toggleApproval(e.target.checked)}
                className="h-4 w-4"
              />
              Exiger l'approbation d'un administrateur avant tout pentest lancé par un membre
            </label>
          </div>
        )}

        {canManage && (
          <form onSubmit={saveIntegrations} className="mt-4 card space-y-3 p-4">
            <h2 className="font-heading text-sm font-semibold text-subtle">
              Notifications sortantes
            </h2>
            <div>
              <label className="text-xs text-muted">Webhook Slack (Incoming Webhook)</label>
              <input
                type="url"
                value={slackUrl}
                onChange={(e) => setSlackUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/…"
                className="input mt-1 w-full"
              />
            </div>
            <div>
              <label className="text-xs text-muted">Webhook générique (JSON)</label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://exemple.fr/webhook"
                className="input mt-1 w-full"
              />
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" className="btn btn-primary !py-2 text-sm">
                Enregistrer
              </button>
              {integSaved && <span className="text-sm text-safe">Enregistré ✓</span>}
            </div>
          </form>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {/* Membres */}
          <section>
            <h2 className="font-heading text-lg font-semibold text-fg">Membres</h2>
            {canManage && (
              <form onSubmit={addMember} className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="collegue@entreprise.fr"
                  className="input flex-1"
                  aria-label="E-mail du membre"
                  required
                />
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as Role)}
                  className="input sm:w-36"
                  aria-label="Rôle"
                >
                  <option value="admin">Admin</option>
                  <option value="member">Membre</option>
                  <option value="viewer">Lecteur</option>
                </select>
                <button type="submit" className="btn btn-primary">
                  Inviter
                </button>
              </form>
            )}
            <ul className="mt-4 space-y-2">
              {loading && <li className="text-sm text-muted">Chargement…</li>}
              {members.map((m) => (
                <li key={m.user_id} className="card flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg">{m.email}</p>
                    {m.name && <p className="truncate text-xs text-subtle">{m.name}</p>}
                  </div>
                  <div className="flex flex-none items-center gap-2">
                    {canManage && m.role !== "owner" ? (
                      <>
                        <select
                          value={m.role}
                          onChange={(e) => changeRole(m.user_id, e.target.value as Role)}
                          className="input !py-1 !text-xs"
                          aria-label={`Rôle de ${m.email}`}
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Membre</option>
                          <option value="viewer">Lecteur</option>
                        </select>
                        <button
                          onClick={() => remove(m.user_id)}
                          className="rounded-md px-2 py-1 text-xs text-risk transition-colors hover:bg-hover"
                        >
                          Retirer
                        </button>
                      </>
                    ) : (
                      <span className="rounded-full bg-hover px-2.5 py-1 text-xs font-semibold text-muted">
                        {ROLE_LABEL[m.role]}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Journal d'audit */}
          <section>
            <h2 className="font-heading text-lg font-semibold text-fg">Journal d'audit</h2>
            <ul className="mt-3 space-y-1.5">
              {audit.length === 0 && !loading && (
                <li className="text-sm text-muted">Aucun évènement.</li>
              )}
              {audit.map((a) => (
                <li key={a.id} className="flex items-baseline justify-between gap-3 border-b border-border/60 py-2 text-sm">
                  <span className="text-fg">
                    {ACTION_LABEL[a.action] || a.action}
                    {a.target && <span className="text-muted"> · {a.target}</span>}
                  </span>
                  <span className="flex-none text-xs text-subtle">
                    {new Date(a.created_at).toLocaleString("fr-FR")}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
