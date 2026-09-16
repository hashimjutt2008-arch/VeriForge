"""Reproducible standalone-engine performance and export-invariant measurements."""

import argparse
import csv
import json
import sqlite3
import subprocess
import sys
import time
import tracemalloc
from contextlib import closing
from pathlib import Path

from engine.models import Options
from engine.report import Report

ROOT = Path(__file__).resolve().parent.parent


def values(rows):
    for i in range(rows):
        if i % 20 == 0:
            yield "204@3x.png"
        elif i % 20 == 1:
            yield f"928-776-0050person{i}@gmail.com"
        elif i % 20 == 2:
            yield f"{i}@review-company.com"
        elif i % 20 == 3:
            yield f"person{i}@company-limit.com"
        elif i % 20 == 4:
            yield "duplicate@gmail.com"
        else:
            yield f"person{i}@gmail.com"


def measure(rows):
    directory = ROOT / ".runtime" / "benchmark"
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / f"results-{rows}.sqlite"
    output = directory / f"clean-{rows}.csv"
    path.unlink(missing_ok=True)
    report = Report(path)
    tracemalloc.start()
    started = time.perf_counter()
    summary = report.process(values(rows), Options())
    process_seconds = time.perf_counter() - started
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    started = time.perf_counter()
    exported = report.export(output, "clean")
    export_seconds = time.perf_counter() - started
    with closing(sqlite3.connect(path)) as db:
        total, unique = db.execute(
            "SELECT count(*), count(DISTINCT final_email) FROM results WHERE status IN ('VALID','CORRECTED')"
        ).fetchone()
        assert total == unique == exported == summary["clean"]
        assert (
            db.execute(
                "SELECT count(*) FROM results WHERE domain='company-limit.com' AND status IN ('VALID','CORRECTED')"
            ).fetchone()[0]
            <= 2
        )
    with output.open(encoding="utf-8-sig", newline="") as stream:
        assert sum(1 for _ in csv.reader(stream)) - 1 == exported
    assert summary["total"] == rows
    peak_rss = None
    if sys.platform == "win32":
        import ctypes
        from ctypes import wintypes

        class Counters(ctypes.Structure):
            _fields_ = [("cb", wintypes.DWORD), ("PageFaultCount", wintypes.DWORD)] + [
                (name, ctypes.c_size_t)
                for name in (
                    "PeakWorkingSetSize",
                    "WorkingSetSize",
                    "QuotaPeakPagedPoolUsage",
                    "QuotaPagedPoolUsage",
                    "QuotaPeakNonPagedPoolUsage",
                    "QuotaNonPagedPoolUsage",
                    "PagefileUsage",
                    "PeakPagefileUsage",
                )
            ]

        counters = Counters()
        counters.cb = ctypes.sizeof(counters)
        kernel = ctypes.WinDLL("kernel32", use_last_error=True)
        kernel.GetCurrentProcess.restype = wintypes.HANDLE
        psapi = ctypes.WinDLL("psapi")
        psapi.GetProcessMemoryInfo.argtypes = [
            wintypes.HANDLE,
            ctypes.POINTER(Counters),
            wintypes.DWORD,
        ]
        if psapi.GetProcessMemoryInfo(
            kernel.GetCurrentProcess(), ctypes.byref(counters), counters.cb
        ):
            peak_rss = round(counters.PeakWorkingSetSize / 1024**2, 2)
    path.unlink()
    output.unlink()
    return {
        "rows": rows,
        "processing_seconds_with_tracemalloc": round(process_seconds, 3),
        "csv_export_seconds": round(export_seconds, 3),
        "peak_python_allocations_mb": round(peak / 1024**2, 2),
        "peak_process_working_set_mb": peak_rss,
        "clean": summary["clean"],
        "invariants": "passed",
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--rows", type=int)
    args = parser.parse_args()
    if args.rows:
        print(json.dumps(measure(args.rows)), flush=True)
    else:
        results = []
        for count in (1000, 10000, 50000, 100000):
            process = subprocess.run(
                [sys.executable, __file__, "--rows", str(count)],
                capture_output=True,
                text=True,
                check=True,
                cwd=ROOT,
            )
            result = json.loads(process.stdout)
            results.append(result)
            print(json.dumps(result), flush=True)
        (ROOT / "docs" / "PERFORMANCE.json").write_text(
            json.dumps(results, indent=2) + "\n", encoding="utf-8"
        )
