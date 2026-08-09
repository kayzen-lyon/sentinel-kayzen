#!/usr/bin/env python3
"""Remonte les findings du run Strix vers l'API d'ingestion de Sentinel.

Deux modes :
  - poller (défaut) : boucle toutes les 5 s et pousse les findings courants (status=running) ;
  - final (FINAL=1) : un dernier envoi avec le statut terminal, le rapport et le coût.

Env attendus : JOB_ID, INGEST_URL, WORKER_INGEST_SECRET. Optionnels : STRIX_EXIT.
Ne dépend que de la stdlib (urllib) — aucune install supplémentaire.
"""
from __future__ import annotations

import glob
import json
import os
import time
import urllib.request

JOB_ID = os.environ.get("JOB_ID", "")
INGEST_URL = os.environ.get("INGEST_URL", "")
SECRET = os.environ.get("WORKER_INGEST_SECRET", "")
FINAL = os.environ.get("FINAL") == "1"
RUNS_DIR = os.environ.get("STRIX_RUNS_DIR", "strix_runs")


def latest_run_dir() -> str | None:
    dirs = [d for d in glob.glob(os.path.join(RUNS_DIR, "*")) if os.path.isdir(d)]
    if not dirs:
        return None
    return max(dirs, key=os.path.getmtime)


def read_json(path: str):
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except Exception:
        return None


def read_text(path: str) -> str | None:
    try:
        with open(path, encoding="utf-8") as fh:
            return fh.read()
    except Exception:
        return None


def map_findings(run_dir: str) -> list[dict]:
    vulns = read_json(os.path.join(run_dir, "vulnerabilities.json")) or []
    out = []
    for v in vulns:
        if not isinstance(v, dict):
            continue
        cvss = v.get("cvss")
        out.append(
            {
                "nativeId": v.get("id") or f"vuln-{len(out) + 1}",
                "title": v.get("title"),
                "severity": (v.get("severity") or "").lower() or None,
                "cvss": cvss if isinstance(cvss, (int, float)) else None,
                "payload": v,
            }
        )
    return out


def extract_cost(run: dict | None) -> float | None:
    if not isinstance(run, dict):
        return None
    usage = run.get("llm_usage") or {}
    for key in ("total_cost_usd", "cost_usd", "total_cost", "cost"):
        val = usage.get(key) if isinstance(usage, dict) else None
        if isinstance(val, (int, float)):
            return float(val)
    return None


def terminal_status(run: dict | None) -> str:
    # Codes de sortie Strix : 0 propre, 2 vulnérabilités trouvées, 1 erreur infra.
    exit_code = os.environ.get("STRIX_EXIT")
    run_status = (run or {}).get("status") if isinstance(run, dict) else None
    if run_status in ("completed",) or exit_code in ("0", "2"):
        return "done"
    if run_status in ("stopped", "interrupted"):
        return "cancelled"
    return "error"


def post(body: dict) -> None:
    if not (JOB_ID and INGEST_URL and SECRET):
        return
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        INGEST_URL,
        data=data,
        headers={"content-type": "application/json", "x-worker-secret": SECRET},
        method="POST",
    )
    try:
        urllib.request.urlopen(req, timeout=15).read()
    except Exception as exc:  # best-effort : on n'interrompt jamais le run
        print(f"[push_findings] ingestion échouée: {exc}")


def push_once(final: bool) -> None:
    run_dir = latest_run_dir()
    body: dict = {"jobId": JOB_ID}
    if run_dir:
        body["findings"] = map_findings(run_dir)
        run = read_json(os.path.join(run_dir, "run.json"))
        run_name = os.path.basename(run_dir)
        body["runName"] = run_name
        graph = read_json(os.path.join(run_dir, ".state", "agents.json"))
        if graph is not None:
            body["agentsGraph"] = graph
        cost = extract_cost(run)
        if cost is not None:
            body["costUsd"] = cost
        if final:
            report = read_text(os.path.join(run_dir, "penetration_test_report.md"))
            if report:
                body["reportMd"] = report
            body["status"] = terminal_status(run)
    elif final:
        body["status"] = "error"
        body["error"] = "Aucun run Strix produit."
    else:
        body["status"] = "running"
    post(body)


def main() -> None:
    if FINAL:
        push_once(final=True)
        return
    # Poller : pousse les findings courants jusqu'à ce que le process soit tué.
    while True:
        push_once(final=False)
        time.sleep(5)


if __name__ == "__main__":
    main()
