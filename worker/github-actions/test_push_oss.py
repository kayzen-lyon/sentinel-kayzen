#!/usr/bin/env python3
"""Tests du normaliseur de findings OSS (push_oss_findings.py).

Exécution : `python worker/github-actions/test_push_oss.py`
N'exige aucune dépendance (stdlib). Ne réalise aucun appel réseau.
"""
import importlib.util
import os

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location(
    "push_oss_findings", os.path.join(HERE, "push_oss_findings.py")
)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def check(cond, msg):
    if not cond:
        raise AssertionError(msg)


# --- norm_sev : normalisation des sévérités ---------------------------------
check(mod.norm_sev("HIGH") == "high", "MAJUSCULE non normalisée")
check(mod.norm_sev(" Critical ") == "critical", "espaces non nettoyés")
check(mod.norm_sev("bogus") is None, "sévérité inconnue devrait être None")
check(mod.norm_sev(None) is None, "None devrait rester None")

# --- map_nuclei : format JSONL réel de Nuclei -------------------------------
nuclei_items = [
    {
        "template-id": "tech-detect",
        "info": {"name": "Technology Detection", "severity": "info", "tags": ["tech"]},
        "matched-at": "https://cible.example/",
    },
    {
        "template-id": "mixed-content",
        "info": {
            "name": "Mixed Content",
            "severity": "low",
            "description": "Ressource HTTP sur page HTTPS",
            "classification": {"cvss-score": 3.1, "cwe-id": ["CWE-311"]},
        },
        "matched-at": "https://cible.example/page",
    },
]
mapped = mod.map_nuclei(nuclei_items)
check(len(mapped) == 2, f"attendu 2 findings nuclei, obtenu {len(mapped)}")
f0, f1 = mapped
check(f0["nativeId"].startswith("nuclei:tech-detect@"), "nativeId nuclei mal formé")
check(f0["title"] == "Technology Detection", "titre nuclei incorrect")
check(f0["severity"] == "info", "sévérité nuclei incorrecte")
check(f0["cvss"] is None, "cvss devrait être None quand absent")
check(f1["severity"] == "low" and f1["cvss"] == 3.1, "mapping cvss/severity KO")
check(f1["payload"]["engine"] == "nuclei", "engine payload manquant")
check(f1["payload"]["cwe"] == ["CWE-311"], "cwe non repris")

# robustesse : entrées malformées ignorées sans planter
check(mod.map_nuclei([None, "x", {}]) is not None, "entrées invalides doivent être tolérées")
check(len(mod.map_nuclei([{}])) == 1, "un dict vide reste mappé avec des valeurs par défaut")

# --- map_testssl : format JSON réel de testssl.sh ---------------------------
testssl_rows = [
    {"id": "TLS1", "severity": "OK", "finding": "TLS 1.2 offert"},
    {"id": "cert_expiration", "severity": "INFO", "finding": "expire dans 60j"},
    {"id": "BREACH", "severity": "MEDIUM", "finding": "vulnérable", "cve": "CVE-2013-3587"},
    {"id": "RC4", "severity": "HIGH", "finding": "chiffrement RC4 accepté"},
]
tls = mod.map_testssl(testssl_rows)
# Seuls MEDIUM et HIGH doivent remonter (OK/INFO filtrés).
check(len(tls) == 2, f"attendu 2 findings testssl, obtenu {len(tls)}")
ids = {t["nativeId"] for t in tls}
check("testssl:BREACH" in ids and "testssl:RC4" in ids, "findings testssl attendus absents")
breach = next(t for t in tls if t["nativeId"] == "testssl:BREACH")
check(breach["severity"] == "medium", "sévérité testssl non normalisée")
check(breach["payload"]["cve"] == "CVE-2013-3587", "cve testssl non reprise")
check(mod.map_testssl("pas une liste") == [], "entrée non-liste doit donner []")

# --- terminal_status --------------------------------------------------------
os.environ.pop("OSS_EXIT", None)
check(mod.terminal_status([]) == "done", "sans OSS_EXIT → done")
os.environ["OSS_EXIT"] = "0"
check(mod.terminal_status([]) == "done", "OSS_EXIT=0 → done")
os.environ["OSS_EXIT"] = "1"
check(mod.terminal_status([]) == "error", "OSS_EXIT=1 → error")
os.environ.pop("OSS_EXIT", None)

print("OK — 6 groupes d'assertions du normaliseur OSS passent.")
