"use client";

import { useEffect, useState } from "react";
import ConsoleHeader from "@/components/dashboard/ConsoleHeader";
import { formatDateTime } from "@/lib/format";

type Role = "owner" | "admin" | "member" | "viewer";
type Member = {
  user_id: string;
  email: string;
  name: string | null;
  role: Role;
  created_at: string;
};
type Invitation = {
  id: string;
  email: string;
  role: Role;
  expires_at: string;
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
  "team.invite": "Invitation envoyée",
  "team.invite_revoked": "Invitation annulée",
  "team.invite_accepted": "Invitation acceptée",
  "team.set_role": "Rôle modifié",
  "team.remove_member": "Membre retiré",
  "team.require_approval": "Politique d'approbation modifiée",
  "team.integrations": "Notifications configurées",
  "scan.regression": "Régression de sécurité détectée",
};

/**
 * Champ d'URL secrète : vide par défaut avec l'aperçu de la valeur enregistrée.
 * `value === undefined` = non modifié (conservé), `""` = à supprimer.
 */
function SecretUrlField({
  label,
  placeholder,
  hint,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  hint: string;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}) {
  const removed = value === "" && Boolean(hint);
  return (
    <div>
      <label className="block">
        <span className="block text-xs text-muted">{label}</span>
        <input
          type="url"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" && !hint ? undefined : e.target.value)}
          placeholder={hint ? `Configuré : ${hint} — saisir pour remplacer` : placeholder}
          className="input mt-1 w-full"
        />
      </label>
      {hint && (
        <button
          type="button"
          onClick={() => onChange(removed ? undefined : "")}
          className="mt-1 text-xs text-muted underline-offset-2 hover:underline"
        >
          {removed ? "Annuler la suppression" : "Retirer ce webhook"}
        </button>
      )}
      {removed && <span className="ml-2 text-xs text-risk">Sera supprimé à l'enregistrement</span>}
    </div>
  );
}

export default function TeamPanel() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  // Lien d'invitation montré une seule fois après création (seul son hash est stocké).
  const [lastInvite, setLastInvite] = useState<{ email: string; url: string; emailSent: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [role, setRole] = useState<Role | null>(null);
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>("member");
  const [requireApproval, setRequireApproval] = useState(false);
  // Les URLs enregistrées ne reviennent jamais au navigateur : seulement un aperçu (hint).
  // Un champ n'est envoyé que s'il a été modifié (sinon la valeur actuelle est conservée).
  const [slackUrl, setSlackUrl] = useState<string | undefined>(undefined);
  const [webhookUrl, setWebhookUrl] = useState<string | undefined>(undefined);
  const [slackHint, setSlackHint] = useState("");
  const [webhookHint, setWebhookHint] = useState("");
  const [integSaved, setIntegSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const canManage = role === "owner" || role === "admin";

  async function load(signal?: AbortSignal) {
    const res = await fetch("/api/team", { signal });
    if (res.ok) {
      const d = await res.json();
      setMembers(d.members || []);
      setInvitations(d.invitations || []);
      setAudit(d.audit || []);
      setRole(d.role || null);
      setRequireApproval(Boolean(d.requireApproval));
      setSlackHint(d.slackHint || "");
      setWebhookHint(d.webhookHint || "");
      setSlackUrl(undefined);
      setWebhookUrl(undefined);
    }
    setLoading(false);
  }

  async function saveIntegrations(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setIntegSaved(false);
    try {
      const res = await fetch("/api/team/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slackUrl, webhookUrl }),
      });
      if (res.ok) {
        setIntegSaved(true);
        setTimeout(() => setIntegSaved(false), 2000);
        await load();
      } else {
        const d = await res.json();
        setError(d.error || "Échec.");
      }
    } finally {
      setBusy(false);
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
    const ac = new AbortController();
    load(ac.signal).catch(() => {});
    return () => ac.abort();
  }, []);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
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
      if (d.invited) {
        setLastInvite({ email, url: d.inviteUrl, emailSent: Boolean(d.emailSent) });
        setCopied(false);
      } else {
        setLastInvite(null);
        setMembers(d.members || []);
      }
      setEmail("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(userId: string, r: Role) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/team", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, role: r }),
      });
      const d = await res.json();
      if (res.ok) setMembers(d.members || []);
      else setError(d.error || "Échec.");
    } finally {
      setBusy(false);
    }
  }

  async function revokeInvite(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/team", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invitationId: id }),
      });
      const d = await res.json();
      if (res.ok) setInvitations(d.invitations || []);
      else setError(d.error || "Échec.");
    } finally {
      setBusy(false);
    }
  }

  async function copyInvite() {
    if (!lastInvite) return;
    try {
      await navigator.clipboard.writeText(lastInvite.url);
      setCopied(true);
    } catch {
      /* presse-papiers indisponible : le lien reste sélectionnable */
    }
  }

  async function remove(userId: string) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/team", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const d = await res.json();
      if (res.ok) setMembers(d.members || []);
      else setError(d.error || "Échec.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <ConsoleHeader active="team" />

      <main className="container-x py-10">
        <h1 className="font-heading text-3xl font-bold text-fg">Équipe & audit</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Invitez des coéquipiers à partager vos pentests (un lien d&apos;invitation est créé
          s&apos;ils n&apos;ont pas encore de compte), et consultez le journal d&apos;audit de votre
          organisation.
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
            <SecretUrlField
              label="Webhook Slack (Incoming Webhook)"
              placeholder="https://hooks.slack.com/services/…"
              hint={slackHint}
              value={slackUrl}
              onChange={setSlackUrl}
            />
            <SecretUrlField
              label="Webhook générique (JSON)"
              placeholder="https://exemple.fr/webhook"
              hint={webhookHint}
              value={webhookUrl}
              onChange={setWebhookUrl}
            />
            <div className="flex items-center gap-3">
              <button type="submit" disabled={busy} className="btn btn-primary !py-2 text-sm disabled:opacity-60">
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
                <button type="submit" disabled={busy} className="btn btn-primary disabled:opacity-60">
                  Inviter
                </button>
              </form>
            )}
            {lastInvite && (
              <div role="status" className="mt-3 card space-y-2 p-3 text-sm">
                <p className="text-fg">
                  {lastInvite.email} n&apos;a pas encore de compte : invitation créée
                  {lastInvite.emailSent ? " et envoyée par e-mail." : "."}{" "}
                  {!lastInvite.emailSent && "Envoyez-lui ce lien (valable 7 jours, affiché une seule fois) :"}
                </p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={lastInvite.url}
                    onFocus={(e) => e.currentTarget.select()}
                    className="input flex-1 !text-xs"
                    aria-label="Lien d'invitation"
                  />
                  <button type="button" onClick={copyInvite} className="btn !py-2 text-sm">
                    {copied ? "Copié ✓" : "Copier"}
                  </button>
                </div>
              </div>
            )}
            {invitations.length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-subtle">
                  Invitations en attente
                </h3>
                <ul className="mt-2 space-y-2">
                  {invitations.map((i) => (
                    <li key={i.id} className="card flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-fg">{i.email}</p>
                        <p className="text-xs text-subtle">
                          {ROLE_LABEL[i.role]} · expire le {formatDateTime(i.expires_at)}
                        </p>
                      </div>
                      {canManage && (
                        <button
                          onClick={() => revokeInvite(i.id)}
                          className="flex-none rounded-md px-2 py-1 text-xs text-risk transition-colors hover:bg-hover"
                        >
                          Annuler
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <ul className="mt-4 space-y-2">
              {loading &&
          Array.from({ length: 3 }).map((_, i) => (
            <li key={`sk-${i}`} className="card p-3">
              <div className="skeleton h-4 w-2/3" />
            </li>
          ))}
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
                    {formatDateTime(a.created_at)}
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
