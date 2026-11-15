"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AcceptInvitation({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || "Échec.");
        return;
      }
      router.push("/dashboard/pentest");
      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6">
      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-risk/30 bg-risk/10 px-4 py-2.5 text-sm text-risk">
          {error}
        </p>
      )}
      <button type="button" onClick={accept} disabled={busy} className="btn btn-primary w-full disabled:opacity-60">
        {busy ? "Validation…" : "Accepter l'invitation"}
      </button>
    </div>
  );
}
