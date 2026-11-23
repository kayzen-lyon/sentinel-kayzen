"use client";

import { useState } from "react";
import Link from "next/link";

// Assemblé ligne par ligne pour garder les `${{ ... }}` littéraux (pas d'interpolation JS).
const WORKFLOW_YAML = [
  "name: strix-security",
  "",
  "on:",
  "  pull_request:",
  "",
  "permissions:",
  "  contents: read",
  "  pull-requests: write",
  "",
  "jobs:",
  "  security-scan:",
  "    # Les PR de Dependabot n'ont pas accès aux secrets : le scan y échouerait à coup sûr.",
  "    if: github.actor != 'dependabot[bot]'",
  "    runs-on: ubuntu-latest",
  "    timeout-minutes: 30",
  "    steps:",
  "      - uses: actions/checkout@v4",
  "        with:",
  "          fetch-depth: 0",
  "",
  "      - uses: actions/setup-python@v5",
  '        with:',
  '          python-version: "3.12"',
  "",
  "      - name: Install Strix",
  "        run: pip install strix-agent",
  "",
  "      - name: Run Strix on the pull request",
  "        env:",
  "          STRIX_LLM: ${{ vars.STRIX_MODEL || 'gemini/gemini-3.8-flash' }}",
  "          LLM_API_KEY: ${{ secrets.GEMINI_API_KEY }}",
  "          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}",
  "          # Le niveau gratuit de Gemini peut répondre lentement aux heures chargées.",
  '          LLM_PREFLIGHT_TIMEOUT: "120"',
  "        # Exit code 2 si des vulnérabilités sont trouvées → le check PR échoue.",
  "        # Modèle saturé (échec de connexion) : essai des modèles de secours.",
  "        run: |",
  "          set -o pipefail",
  '          for modele in "$STRIX_LLM" gemini/gemini-3.6-flash gemini/gemini-3.5-flash-lite; do',
  "            code=0",
  '            STRIX_LLM="$modele" strix -n -t ./ --scan-mode quick 2>&1 | tee "$RUNNER_TEMP/strix.log" || code=$?',
  '            if [ "$code" -eq 0 ] || ! grep -q "LLM CONNECTION FAILED" "$RUNNER_TEMP/strix.log"; then exit "$code"; fi',
  "          done",
  "          exit 1",
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
          Ajoutez le moteur <strong className="text-fg">Strix</strong> à votre CI : à chaque
          pull request, Sentinel analyse le code modifié et <strong className="text-fg">bloque
          la fusion</strong> si des vulnérabilités sont détectées. 100 % gratuit (runner GitHub
          Actions + LLM à tier gratuit).
        </p>

        <ol className="mt-6 space-y-2 text-sm text-muted">
          <li>
            <strong className="text-fg">1.</strong> Dans votre dépôt, créez le fichier{" "}
            <code className="text-brand-light">.github/workflows/strix-security.yml</code> avec
            le contenu ci-dessous.
          </li>
          <li>
            <strong className="text-fg">2.</strong> Ajoutez le secret{" "}
            <code className="text-brand-light">GEMINI_API_KEY</code> (clé gratuite Google AI
            Studio) dans <em>Settings → Secrets and variables → Actions</em>.
          </li>
          <li>
            <strong className="text-fg">3.</strong> Ouvrez une PR : le check « strix-security »
            apparaît et échoue si des vulnérabilités sont trouvées.
          </li>
        </ol>

        <div className="card mt-6 p-4">
          <div className="no-print mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-subtle">
              .github/workflows/strix-security.yml
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
