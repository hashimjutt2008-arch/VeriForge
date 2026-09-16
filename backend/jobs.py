import shutil
import threading
import time
import uuid
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from fastapi import HTTPException

from engine.files import email_values, inspect_file
from engine.report import Report


class JobService:
    def __init__(self, settings):
        self.settings = settings
        self.root = settings.data_dir
        self.jobs: dict[str, dict] = {}
        self.reserved: set[str] = set()
        self.downloads: Counter[str] = Counter()
        self.lock = threading.RLock()
        self.export_lock = threading.Lock()
        self.executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="veriforge")
        self.stop_event = threading.Event()
        self.cleanup_thread = None

    def start_cleanup(self):
        self.root.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.cleanup()

        def sweep():
            while not self.stop_event.wait(60):
                self.cleanup()

        self.cleanup_thread = threading.Thread(
            target=sweep, daemon=True, name="veriforge-retention"
        )
        self.cleanup_thread.start()

    def allocate(self, suffix: str) -> tuple[str, Path]:
        if suffix not in (".txt", ".csv", ".xlsx"):
            raise ValueError("Unsupported input format")
        with self.lock:
            if len(self.jobs) + len(self.reserved) >= 100:
                raise HTTPException(
                    429, "Temporary job limit reached. Wait for older jobs to expire."
                )
            job_id = uuid.uuid4().hex
            self.reserved.add(job_id)
        directory = self.root / job_id
        try:
            directory.mkdir(parents=True, mode=0o700)
            (directory / ".veriforge-job").touch()
            return job_id, directory / ("input" + suffix)
        except OSError:
            with self.lock:
                self.reserved.discard(job_id)
            raise HTTPException(503, "Temporary storage is unavailable") from None

    def add(self, job_id, path, filename, has_header=None):
        try:
            metadata = inspect_file(path, self.settings.max_rows, has_header)
            metadata.filename = filename
        except Exception:
            self.remove_directory(path.parent)
            raise
        public = {
            "id": job_id,
            "filename": filename,
            "created_at": time.time(),
            "state": "ready",
            "stage": "Ready to clean",
            "processed": 0,
            "total": metadata.row_count,
            "counts": {},
            "summary": None,
            "error": None,
            "metadata": metadata.to_dict(),
            "options": None,
        }
        with self.lock:
            self.reserved.discard(job_id)
            self.jobs[job_id] = {"public": public, "path": path, "metadata": metadata}
        return self.get(job_id)

    def get(self, job_id):
        with self.lock:
            entry = self.jobs.get(job_id)
            if entry and self.expired(entry["public"]) and not self.downloads[job_id]:
                self.remove_directory(entry["path"].parent)
                self.jobs.pop(job_id, None)
                entry = None
            if not entry:
                raise HTTPException(404, "Job not found or expired")
            return {**entry["public"], "counts": dict(entry["public"]["counts"])}

    def expired(self, job, now=None):
        return (
            job["state"] != "processing"
            and job["created_at"] < (now or time.time()) - self.settings.retention_hours * 3600
        )

    def history(self, offset=0, limit=100):
        with self.lock:
            ordered = sorted(
                (entry for entry in self.jobs.values() if not self.expired(entry["public"])),
                key=lambda entry: entry["public"]["created_at"],
                reverse=True,
            )
            fields = (
                "id",
                "filename",
                "created_at",
                "state",
                "stage",
                "processed",
                "total",
                "summary",
                "error",
            )
            return {
                "items": [
                    {key: entry["public"][key] for key in fields}
                    for entry in ordered[offset : offset + limit]
                ],
                "total": len(ordered),
            }

    def start(self, job_id, column, options):
        with self.lock:
            self.get(job_id)
            entry = self.jobs[job_id]
            if entry["public"]["state"] != "ready":
                raise HTTPException(409, "This job has already started")
            if not 0 <= column < len(entry["metadata"].columns):
                raise HTTPException(422, "Select an available email column")
            if sum(j["public"]["state"] == "processing" for j in self.jobs.values()) >= 2:
                raise HTTPException(
                    429, "Two lists are already processing. Please try again shortly."
                )
            entry["public"].update(
                state="processing", stage="Cleaning and classifying", options=options.model_dump()
            )
            self.executor.submit(self.run, job_id, column, options.engine_options())
        return self.get(job_id)

    def run(self, job_id, column, options):
        entry = self.jobs[job_id]
        report_path = entry["path"].parent / "results.sqlite"

        def progress(count, counts):
            with self.lock:
                entry["public"].update(processed=count, counts=counts)

        try:
            summary = Report(report_path).process(
                email_values(entry["path"], entry["metadata"], column), options, progress
            )
            entry["path"].unlink(missing_ok=True)
            with self.lock:
                entry["metadata"].sample.clear()
                entry["public"]["metadata"]["sample"] = []
                entry["public"].update(state="complete", stage="Complete", summary=summary)
        except Exception as exc:
            for path in (entry["path"], report_path):
                try:
                    path.unlink(missing_ok=True)
                except OSError:
                    pass  # The retention sweeper retries deletion of the owned directory.
            with self.lock:
                entry["metadata"].sample.clear()
                entry["public"]["metadata"]["sample"] = []
                entry["public"].update(
                    state="failed",
                    stage="Processing failed",
                    error=str(exc)
                    if isinstance(exc, ValueError)
                    else "Processing failed. Check the file and try a new clean.",
                )

    def report(self, job_id):
        if self.get(job_id)["state"] != "complete":
            raise HTTPException(409, "Results are not ready")
        return Report(self.root / job_id / "results.sqlite")

    def results(self, job_id, offset=0, limit=50, **filters):
        # Hold the lifecycle lock until this bounded read completes, so retention
        # cannot remove the report between authorization and opening SQLite.
        with self.lock:
            return self.report(job_id).page(offset, limit, **filters)

    def download(self, job_id, kind, format):
        with self.lock:
            report = self.report(job_id)
            self.downloads[job_id] += 1
        path = self.root / job_id / f"{kind}.{format}"
        temporary = path.with_suffix(path.suffix + ".tmp")
        try:
            with self.export_lock:
                if not path.exists():
                    try:
                        report.export(temporary, kind, format)
                        temporary.replace(path)
                    finally:
                        temporary.unlink(missing_ok=True)
            return path
        except Exception:
            self.release_download(job_id)
            raise HTTPException(
                503, "The export could not be prepared. Please try again."
            ) from None

    def release_download(self, job_id):
        with self.lock:
            self.downloads[job_id] -= 1
            if self.downloads[job_id] <= 0:
                self.downloads.pop(job_id, None)

    def remove_directory(self, path):
        root, target = self.root.resolve(), path.resolve()
        if (
            path.is_symlink()
            or target.parent != root
            or len(target.name) != 32
            or not all(c in "0123456789abcdef" for c in target.name)
        ):
            raise ValueError("Refused cleanup outside the job directory")
        if target.exists():
            shutil.rmtree(target)
        with self.lock:
            self.reserved.discard(target.name)

    def cleanup(self, now=None):
        now = now or time.time()
        with self.lock:
            for job_id, entry in list(self.jobs.items()):
                if self.expired(entry["public"], now) and not self.downloads[job_id]:
                    try:
                        self.remove_directory(entry["path"].parent)
                        self.jobs.pop(job_id, None)
                    except OSError:
                        pass
            if not self.root.exists():
                return
            for directory in self.root.iterdir():
                if (
                    directory.name in self.jobs
                    or directory.name in self.reserved
                    or directory.is_symlink()
                ):
                    continue
                marker = directory / ".veriforge-job"
                try:
                    if (
                        marker.is_file()
                        and marker.stat().st_mtime < now - self.settings.retention_hours * 3600
                    ):
                        self.remove_directory(directory)
                except (OSError, ValueError):
                    pass

    def close(self):
        self.stop_event.set()
        if self.cleanup_thread:
            self.cleanup_thread.join(timeout=2)
        self.executor.shutdown(wait=True)
