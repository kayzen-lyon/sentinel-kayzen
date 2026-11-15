"use client";

import { useEffect, useState } from "react";

type Org = { id: string; name: string; personal: boolean; role: string };

/**
 * Sélecteur d'organisation active. Masqué tant que l'utilisateur n'appartient qu'à
 * son espace personnel. Le changement recharge la page : chaque panneau relit ses
 * données dans le contexte de la nouvelle organisation.
 */
export default function OrgSwitcher() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [active, setActive] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/orgs", { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setOrgs(d.orgs || []);
        setActive(d.activeOrgId || "");
      })
      .catch(() => {});
    return () => ac.abort();
  }, []);

  if (orgs.length < 2) return null;

  async function change(orgId: string) {
    setBusy(true);
    const res = await fetch("/api/orgs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orgId }),
    }).catch(() => null);
    if (res?.ok) window.location.reload();
    else setBusy(false);
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">Organisation active</span>
      <select
        value={active}
        onChange={(e) => change(e.target.value)}
        disabled={busy}
        className="input !w-auto max-w-[14rem] !py-1.5 text-sm"
        title="Organisation active"
      >
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>
            {o.personal ? "Espace personnel" : o.name}
          </option>
        ))}
      </select>
    </label>
  );
}
