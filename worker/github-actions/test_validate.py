"""Tests de la relecture contradictoire et de sa fusion dans push_findings (stdlib)."""
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import push_findings  # noqa: E402
import validate_findings  # noqa: E402


class ParseVerdict(unittest.TestCase):
    def test_valid_json_in_fence(self):
        raw = '```json\n{"verdict":"Rejected","severity":"LOW","reason":"attendu"}\n```'
        self.assertEqual(
            validate_findings.parse_verdict(raw),
            {"verdict": "rejected", "severity": "low", "reason": "attendu"},
        )

    def test_invalid(self):
        self.assertIsNone(validate_findings.parse_verdict(""))
        self.assertIsNone(validate_findings.parse_verdict('{"verdict":"maybe"}'))
        self.assertIsNone(validate_findings.parse_verdict("pas de json"))

    def test_unknown_severity_dropped(self):
        self.assertEqual(
            validate_findings.parse_verdict('{"verdict":"confirmed","severity":"énorme"}'),
            {"verdict": "confirmed"},
        )


class MergeIntoPayload(unittest.TestCase):
    def test_merge(self):
        with tempfile.TemporaryDirectory() as d:
            with open(os.path.join(d, "vulnerabilities.json"), "w", encoding="utf-8") as fh:
                json.dump([{"id": "v1", "title": "t"}, {"id": "v2"}], fh)
            with open(os.path.join(d, "sentinel_validations.json"), "w", encoding="utf-8") as fh:
                json.dump({"v1": {"verdict": "doubtful"}}, fh)
            out = push_findings.map_findings(d)
            self.assertEqual(out[0]["payload"]["_sentinel_validation"], {"verdict": "doubtful"})
            self.assertNotIn("_sentinel_validation", out[1]["payload"])


if __name__ == "__main__":
    unittest.main()
