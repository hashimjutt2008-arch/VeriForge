import sqlite3
from collections import Counter
from collections.abc import Iterable, Iterator
from contextlib import closing
from dataclasses import fields
from pathlib import Path

from openpyxl import Workbook
from openpyxl.cell import WriteOnlyCell

from engine.exports import EXPORT_COLUMNS, export_row, write_csv
from engine.models import Options, Result, Status
from engine.processor import iter_results

COLUMNS = [field.name for field in fields(Result)]


class Report:
    """Temporary disk-backed result repository, independent of any HTTP framework."""

    def __init__(self, path: Path):
        self.path = path

    def create(self):
        with closing(sqlite3.connect(self.path)) as db:
            schema = ",".join(
                f"{name} "
                + (
                    "INTEGER PRIMARY KEY"
                    if name == "row_number"
                    else "INTEGER"
                    if name == "was_corrected"
                    else "TEXT NOT NULL"
                )
                for name in COLUMNS
            )
            db.execute(f"CREATE TABLE results ({schema})")
            db.commit()

    def process(self, values: Iterable[object], options: Options, progress=None) -> dict:
        self.create()
        counts = Counter({status.value: 0 for status in Status})
        categories = Counter()
        repaired = 0
        batch = []
        total = 0
        with closing(sqlite3.connect(self.path)) as db:
            sql = f"INSERT INTO results VALUES ({','.join('?' for _ in COLUMNS)})"
            for result in iter_results(values, options):
                batch.append(tuple(getattr(result, key) for key in COLUMNS))
                counts[result.status.value] += 1
                categories[result.category] += 1
                repaired += int(result.was_corrected)
                total += 1
                if len(batch) == 500:
                    db.executemany(sql, batch)
                    db.commit()
                    batch.clear()
                    if progress:
                        progress(total, dict(counts))
            if batch:
                db.executemany(sql, batch)
            for name in ("status", "category", "domain"):
                db.execute(f"CREATE INDEX idx_results_{name} ON results({name})")
            db.commit()
            db.execute("PRAGMA optimize")
        if progress:
            progress(total, dict(counts))
        return {
            **counts,
            "total": total,
            "clean": counts["VALID"] + counts["CORRECTED"],
            "categories": dict(categories),
            "repaired": repaired,
        }

    @staticmethod
    def filters(status="", category="", domain="", search="") -> tuple[str, list[str]]:
        clauses, values = [], []
        for key, value in (("status", status), ("category", category), ("domain", domain)):
            if value:
                clauses.append(f"{key} = ?")
                values.append(value)
        if search:
            # Literal substring matching: SQL wildcard characters are not special.
            clauses.append(
                "(instr(lower(original_email), ?) > 0 OR instr(lower(final_email), ?) > 0)"
            )
            values.extend([search.lower(), search.lower()])
        return (" WHERE " + " AND ".join(clauses) if clauses else ""), values

    def page(self, offset=0, limit=50, **filters) -> dict:
        where, values = self.filters(**filters)
        with closing(sqlite3.connect(self.path)) as db:
            db.row_factory = sqlite3.Row
            total = db.execute("SELECT COUNT(*) FROM results" + where, values).fetchone()[0]
            rows = db.execute(
                "SELECT * FROM results" + where + " ORDER BY row_number LIMIT ? OFFSET ?",
                [*values, limit, offset],
            ).fetchall()
        return {
            "total": total,
            "offset": offset,
            "limit": limit,
            "items": [dict(row) for row in rows],
        }

    def records(self) -> Iterator[Result]:
        with closing(sqlite3.connect(self.path)) as db:
            db.row_factory = sqlite3.Row
            for row in db.execute("SELECT * FROM results ORDER BY row_number"):
                data = dict(row)
                data["status"] = Status(data["status"])
                data["was_corrected"] = bool(data["was_corrected"])
                yield Result(**data)

    def export(self, path: Path, kind: str, format="csv") -> int:
        if kind not in EXPORT_COLUMNS or format not in ("csv", "xlsx"):
            raise ValueError("Unsupported export type or format")
        if format == "csv":
            with path.open("w", encoding="utf-8-sig", newline="") as stream:
                return write_csv(self.records(), stream, kind)
        workbook = Workbook(write_only=True)
        sheet = workbook.create_sheet("VeriForge")
        count = 0

        def append(values):
            cells = []
            for value in values:
                cell = WriteOnlyCell(sheet, value=str(value))
                cell.data_type = (
                    "s"  # Prevent formula evaluation without changing the original string.
                )
                cells.append(cell)
            sheet.append(cells)

        append(EXPORT_COLUMNS[kind])
        for record in self.records():
            row = export_row(record, kind)
            if row is not None:
                append(row)
                count += 1
        workbook.save(path)
        return count
