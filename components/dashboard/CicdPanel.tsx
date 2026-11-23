"use client";

import { useState } from "react";
import Link from "next/link";

// Assemblé ligne par ligne pour garder les `${{ ... }}` littéraux (pas d'interpolation JS).
const WORKFLOW_YAML = [
  "name: sentinel-securite",
  "",
  "on:",
  "  pull_request:",
  "",
  "permissions:",
  "  contents: read",
  "",
  "jobs:",
  "  securite:",
  "    runs-on: ubuntu-latest",
  "    timeout-minutes: 20",
  "    steps:",
  "      - uses: actions/checkout@v4",
  "        with:",
  "          fetch-depth: 0",
  "",
  "      - name: Secrets oubliés dans le code (Gitleaks)",
  '        run: docker run --rm -v "$PWD:/repo" ghcr.io/gitleaks/gitleaks:v8.30.1 git /repo --redact',
  "",
  "      - name: Failles dans le code (Semgrep)",
  "        if: always()",
  "        run: |",
  "          pipx install semgrep",
  "          semgrep scan --config p/default --config p/owasp-top-ten --error --metrics=off",
  "",
  "      - name: Dépendances vulnérables (OSV-Scanner)",
  "        if: always()",
  '        run: docker run --rm -v "$PWD:/src" ghcr.io/google/osv-scanner:v2.7.1 scan source -r /src --allow-no-lockfiles',
].join("\n");

export default function CicdPanel() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(WORKFLOW_YAML);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="min-h-screen">
      <main className="container-x py-8 lg:py-10">
        <h1 className="font-heading text-3xl font-bold text-fg">
          Scan de sécurité sur les Pull Requests
        </h1>
        <p className="mt-2 max-w-2xl text-muted">
          À chaque pull request, ce workflow cherche les secrets oubliés, les failles du code et les
          dépendances vulnérables, et fait échouer le contrôle s'il en trouve. Outils open source :
          <strong className="text-fg"> aucune clé, aucun compte</strong>, et votre code reste sur GitHub.
        </p>

        <ol className="mt-6 space-y-2 text-sm text-muted">
          <li>
            <strong className="text-fg">1.</strong> Dans votre dépôt, créez le fichier{" "}
            <code className="text-brand-light">.github/workflows/sentinel-securite.yml</code> avec
            le contenu ci-dessous.
          </li>
          <li>
            <strong className="text-fg">2.</strong> Ouvrez une PR : le check « securite » apparaît.
          </li>
        </ol>

        <div className="card mt-6 p-4">
          <div className="no-print mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-subtle">
              .github/workflows/sentinel-securite.yml
            </span>
            <button onClick={copy} className="btn btn-ghost !py-1.5 text-xs">
              {copied ? "Copié ✓" : "Copier"}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-lg bg-sunken p-4 text-xs text-muted">
            {WORKFLOW_YAML}
          </pre>
        </div>

        <p className="mt-6 rounded-lg border border-border bg-bg-elev/40 px-4 py-3 text-sm text-muted">
          Pour un pentest complet déclenché depuis Sentinel (et non dans votre CI), utilisez
          l'onglet <Link href="/dashboard/pentest" className="text-brand-light">Pentest autonome</Link>.
        </p>
      </main>
    </div>
  );
}
