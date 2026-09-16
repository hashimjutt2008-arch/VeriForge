import csv
from collections.abc import Iterable
from dataclasses import fields
from typing import TextIO

from engine.models import Result, Status

EXPORT_COLUMNS = {
    "valid": ["email"],
    "corrected": ["original_email", "corrected_email", "reason"],
    "removed": ["original_email", "category", "reason", "domain"],
    "review": ["original_email", "final_email", "reason", "domain"],
    "clean": ["email"],
    "full": [field.name for field in fields(Result)],
}


def export_row(record: Result, kind: str) -> list | None:
    if kind not in EXPORT_COLUMNS:
        raise ValueError("Unknown export type")
    if kind == "clean":
        return [record.final_email] if record.status in (Status.VALID, Status.CORRECTED) else None
    if kind == "valid":
        return [record.final_email] if record.status == Status.VALID else None
    if kind == "full":
        return [getattr(record, key) for key in EXPORT_COLUMNS[kind]]
    if record.status.value.lower() != kind:
        return None
    return [
        getattr(record, "final_email" if key == "corrected_email" else key)
        for key in EXPORT_COLUMNS[kind]
    ]


def safe_csv_cell(value: object) -> str:
    text = str(value)
    # Quoting alone does not prevent formulas in spreadsheet programs.
    if text.lstrip().startswith(("=", "+", "-", "@", "\t", "\r", "\n")):
        return "'" + text
    return text


def write_csv(records: Iterable[Result], output: TextIO, kind: str) -> int:
    writer = csv.writer(output)
    writer.writerow(EXPORT_COLUMNS[kind])
    count = 0
    for record in records:
        row = export_row(record, kind)
        if row is not None:
            writer.writerow([safe_csv_cell(cell) for cell in row])
            count += 1
    return count
