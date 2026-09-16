#!/usr/bin/env python3
"""Normalise les findings des moteurs OSS (Nuclei, testssl.sh) vers l'API
d'ingestion de Sentinel — même contrat que push_findings.py (Strix).

Entrées (fichiers produits par le workflow oss-scan.yml, dans le répertoire courant) :
  - nuclei.jsonl   : sortie JSONL de Nuclei (`-jsonl`)
  - testssl.json   : sortie JSON de testssl.sh (`--jsonfile`)

Chaque finding est mappé sur {nativeId, title, severity, cvss, payload}. Le moteur
OSS est déterministe (pas de LLM), donc aucun coût ni graphe d'agents.

Env attendus : JOB_ID, INGEST_URL, WORKER_INGEST_SECRET. Optionnels : OSS_EXIT.
Ne dépend que de la stdlib (urllib).
"""
from __future__ import annotations

import json
import os
import urllib.request

JOB_ID = os.environ.get("JOB_ID", "")
INGEST_URL = os.environ.get("INGEST_URL", "")
SECRET = os.environ.get("WORKER_INGEST_SECRET", "")

# Sévérités reconnues côté produit (des plus graves aux plus faibles).
SEV = {"critical", "high", "medium", "low", "info"}


def read_jsonl(path: str) -> list[dict]:
    out: list[dict] = []
    try:
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    out.append(json.loads(line))
                except Exception:
                    continue
    except FileNotFoundError:
        pass
    return out


def read_json(path: str):
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except Exception:
        return None


def norm_sev(value: str | None) -> str | None:
    v = (value or "").strip().lower()
    return v if v in SEV else None


def map_nuclei(items: list[dict]) -> list[dict]:
    out: list[dict] = []
    for it in items:
        if not isinstance(it, dict):
            continue
        info = it.get("info") or {}
        classification = info.get("classification") or {}
        cvss = classification.get("cvss-score")
        template = it.get("template-id") or it.get("templateID") or "nuclei"
        matched = it.get("matched-at") or it.get("host") or ""
        native = f"nuclei:{template}"
        if matched:
            native += f"@{matched}"
        # Un même template peut matcher plusieurs fois la même URL (ex. un match par
        # en-tête manquant) : sans discriminant, les nativeId collisionnent et l'upsert
        # (ON CONFLICT job_id+native_id) écrase les findings. matcher-name / extracted
        # / matched-line lèvent l'ambiguïté.
        discriminant = it.get("matcher-name")
        if not discriminant:
            extracted = it.get("extracted-results")
            if isinstance(extracted, list) and extracted:
                discriminant = ",".join(str(x) for x in extracted)
        if not discriminant and it.get("matched-line"):
            discriminant = str(it.get("matched-line"))
        if discriminant:
            native += f"#{discriminant}"
        title = info.get("name") or template
        matcher = it.get("matcher-name")
        if matcher:
            title = f"{title} — {matcher}"
        out.append(
            {
                "nativeId": native[:200],
                "title": title,
                "severity": norm_sev(info.get("severity")),
                "cvss": cvss if isinstance(cvss, (int, float)) else None,
                "payload": {
                    "engine": "nuclei",
                    "template": template,
                    "matchedAt": matched,
                    "description": info.get("description"),
                    "reference": info.get("reference"),
                    "tags": info.get("tags"),
                    "cwe": classification.get("cwe-id"),
                    "cve": classification.get("cve-id"),
                    "remediation": info.get("remediation"),
                },
            }
        )
    return out


def map_testssl(data) -> list[dict]:
    """testssl --jsonfile produit une liste plate de {id, severity, finding, ...}."""
    if not isinstance(data, list):
        return []
    out: list[dict] = []
    for row in data:
        if not isinstance(row, dict):
            continue
        sev = norm_sev(row.get("severity"))
        # On ne remonte que ce qui a une sévérité exploitable (pas OK/INFO/DEBUG).
        if sev is None or sev == "info":
            continue
        rid = row.get("id") or "testssl"
        out.append(
            {
                "nativeId": f"testssl:{rid}"[:200],
                "title": f"TLS — {rid}",
                "severity": sev,
                "cvss": row.get("cvss") if isinstance(row.get("cvss"), (int, float)) else None,
                "payload": {
                    "engine": "testssl",
                    "id": rid,
                    "finding": row.get("finding"),
                    "cve": row.get("cve"),
                    "cwe": row.get("cwe"),
                },
            }
        )
    return out


def terminal_status(findings: list[dict]) -> str:
    # Nuclei/testssl : sortie 0 = OK (avec ou sans finding). Un code non nul = échec infra.
    exit_code = os.environ.get("OSS_EXIT")
    if exit_code in (None, "", "0"):
        return "done"
    return "error"


def post(body: dict) -> None:
    if not (JOB_ID and INGEST_URL and SECRET):
        print("[push_oss] JOB_ID / INGEST_URL / secret manquant — abandon.")
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
    except Exception as exc:
        print(f"[push_oss] ingestion échouée: {exc}")


def main() -> None:
    findings = map_nuclei(read_jsonl("nuclei.jsonl")) + map_testssl(read_json("testssl.json"))
    report = (
        f"# Rapport de scan OSS\n\n"
        f"- Moteurs : Nuclei + testssl.sh\n"
        f"- Findings remontés : **{len(findings)}**\n"
    )
    post(
        {
            "jobId": JOB_ID,
            "findings": findings,
            "runName": "oss-scan",
            "status": terminal_status(findings),
            "reportMd": report,
            "costUsd": 0,
        }
    )
    print(f"[push_oss] {len(findings)} finding(s) poussé(s).")


if __name__ == "__main__":
    main()
