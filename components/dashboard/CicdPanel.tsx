"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  "          STRIX_LLM: ${{ vars.STRIX_MODEL || 'gemini/gemini-2.0-flash' }}",
  "          LLM_API_KEY: ${{ secrets.GEMINI_API_KEY }}",
  "          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}",
  "        # Exit code 2 si des vulnérabilités sont trouvées → le check PR échoue.",
  "        run: strix -n -t ./ --scan-mode quick",
].join("\n");

export default function CicdPanel() {
  const router = useRouter();
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

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-xl">
        <div className="container-x flex h-[64px] items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/logo-mark.png" alt="Sentinel by Kayzen" width={32} height={32} className="h-8 w-auto" />
              <span className="font-heading text-base font-semibold text-fg">
                Sentinel <span className="text-subtle">Console</span>
              </span>
            </Link>
            <nav className="hidden gap-1 sm:flex">
              <Link href="/dashboard" className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-fg">
                Scanner
              </Link>
              <Link href="/dashboard/pentest" className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-fg">
                Pentest autonome
              </Link>
              <span className="rounded-lg bg-hover px-3 py-1.5 text-sm font-medium text-fg">
                CI/CD
              </span>
              <Link href="/dashboard/team" className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-fg">
                Équipe
              </Link>
            </nav>
          </div>
          <button onClick={logout} className="btn btn-ghost !px-3.5 !py-2 text-sm">
            Déconnexion
          </button>
        </div>
      </header>

      <main className="container-x py-10">
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

        <div className="mt-6">
          <div className="no-print mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-subtle">
              .github/workflows/strix-security.yml
            </span>
            <button onClick={copy} className="btn btn-ghost !py-1.5 text-xs">
              {copied ? "Copié ✓" : "Copier"}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-lg border border-border bg-bg-elev/60 p-4 text-xs text-muted">
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
