"""Regenerate committed browser goldens from the unchanged Python reference."""

import dataclasses
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import pytest  # noqa: E402

import engine.processor  # noqa: E402
from engine.files import email_values, inspect_file  # noqa: E402
from engine.models import Options  # noqa: E402


def main():
    cases = []
    original = engine.processor.process_emails

    def capture(emails, options=None):
        values = list(emails)
        settings = options or Options()
        records = original(values, settings)
        cases.append(
            {
                "values": values,
                "options": dataclasses.asdict(settings),
                "records": [record.to_dict() for record in records],
            }
        )
        return records

    engine.processor.process_emails = capture
    result = pytest.main([str(ROOT / "tests/test_engine.py"), "-q", "-p", "no:cacheprovider"])
    if result:
        raise SystemExit(result)
    values = []
    for case in cases:
        values.extend(case["values"])
    values.extend(
        [
            "\u001c a @ corp . com \u001f",
            "\ufeffINFO@ACME.COM",
            "a@corp.com\n",
            '"a@corp.com"',
            "'a@corp.com'",
            "a@corp.comt",
            "einfo@corp.com",
            "=SUM(1,2)",
            " +1+2",
            "@SUM(1)",
            "a\nb@corp.com",
            "a@corp.com\r",
            "a\u200d@corp.com",
            "20éééé@éééé.com",
            "２０info@acme.com",
        ]
    )
    for rule in ROOT.joinpath("rules").glob("*.json"):
        data = json.loads(rule.read_text(encoding="utf-8-sig"))
        if isinstance(data, list):
            values.extend(item if "@" in item else "person@" + item for item in data)
    for flag in dataclasses.asdict(Options()):
        if isinstance(getattr(Options(), flag), bool):
            capture(values, Options(**{flag: False}))
    capture(values)
    capture(["Straße <same@corp.com>", "Strasse <same@corp.com>"])
    capture([f"person{i % 31}@business{i % 9}.com" for i in range(2000)])
    capture(
        ["20alex@corp.com", "alex@corp.com", "a@business.co"],
        Options(
            local_corrections={"20alex@corp.com": "alex@corp.com"},
            domain_corrections={"business.co": "business.com"},
        ),
    )
    files = []
    for path in ROOT.joinpath("tests/fixtures").glob("acceptance.*"):
        metadata = inspect_file(path)
        column = metadata.suggested_column
        files.append(
            {
                "filename": path.name,
                "metadata": metadata.to_dict(),
                "records": [r.to_dict() for r in original(email_values(path, metadata, column))],
            }
        )
    output = ROOT / "frontend/tests/parity-golden.json"
    output.write_text(
        json.dumps({"cases": cases, "files": files}, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(
        f"Saved {len(cases)} cases / {sum(len(c['records']) for c in cases)} records and {len(files)} files"
    )


if __name__ == "__main__":
    main()
