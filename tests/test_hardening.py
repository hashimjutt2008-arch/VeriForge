import os
import threading
import time
import zipfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pytest
from fastapi import HTTPException

from backend.config import Settings
from backend.jobs import JobService
from engine.files import inspect_file
from tests.test_api import complete, login


def test_unauthenticated_body_rejected_before_upload_parse(client):
    assert (
        client.post(
            "/jobs/upload",
            content=b"broken multipart",
            headers={"content-type": "multipart/form-data; boundary=abc"},
        ).status_code
        == 401
    )


def test_large_and_chunked_inputs(client):
    login(client)
    response = client.post(
        "/jobs/paste",
        content=b"x",
        headers={"content-length": str(28 * 1024 * 1024), "content-type": "application/json"},
    )
    assert response.status_code == 413
    response = client.post(
        "/auth/login",
        content=(b"x" * 9000 for _ in range(3)),
        headers={"content-type": "application/json"},
    )
    assert response.status_code == 413


def test_cleanup_expired_ready_complete_and_orphan(tmp_path):
    service = JobService(Settings(data_dir=tmp_path, retention_hours=1))
    try:
        job_id, path = service.allocate(".txt")
        path.write_text("private@corp.com", encoding="utf-8")
        service.add(job_id, path, "Private")
        service.jobs[job_id]["public"]["created_at"] = time.time() - 4000
        service.cleanup()
        assert not path.parent.exists() and job_id not in service.jobs
        orphan, orphan_path = service.allocate(".txt")
        orphan_path.write_text("private@corp.com", encoding="utf-8")
        service.reserved.discard(orphan)
        os.utime(orphan_path.parent / ".veriforge-job", (time.time() - 4000,) * 2)
        service.cleanup()
        assert not orphan_path.parent.exists()
        untouched = tmp_path / ("a" * 32)
        untouched.mkdir()
        (untouched / "user.txt").write_text("keep")
        service.cleanup(time.time() + 10000)
        assert (untouched / "user.txt").exists()
    finally:
        service.close()


def test_cleanup_keeps_active_jobs_and_downloads(client):
    login(client)
    job_id = client.post("/jobs/paste", json={"text": "a@corp.com"}).json()["id"]
    client.post(f"/jobs/{job_id}/process", json={"column": 0})
    complete(client, job_id)
    service = client.app.state.jobs
    service.jobs[job_id]["public"]["created_at"] = time.time() - 50000
    service.downloads[job_id] = 1
    service.cleanup()
    assert job_id in service.jobs
    service.release_download(job_id)
    service.cleanup()
    assert job_id not in service.jobs
    assert client.get(f"/jobs/{job_id}").status_code == 404


def test_cleanup_path_guard(tmp_path):
    service = JobService(Settings(data_dir=tmp_path / "jobs"))
    try:
        with pytest.raises(ValueError):
            service.remove_directory(tmp_path)
    finally:
        service.close()


def test_reservation_limit_is_atomic(tmp_path):
    service = JobService(Settings(data_dir=tmp_path))
    try:
        service.reserved = {str(i) for i in range(99)}
        barrier = threading.Barrier(2)

        def allocate():
            barrier.wait()
            try:
                return service.allocate(".txt")[0]
            except HTTPException as exc:
                return exc.status_code

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda _: allocate(), range(2)))
        assert sum(result == 429 for result in results) == 1
    finally:
        service.close()


def test_malformed_xml_and_zip_expansion(tmp_path):
    path = tmp_path / "malformed.xlsx"
    with zipfile.ZipFile(path, "w") as z:
        z.writestr("[Content_Types].xml", "<broken")
    with pytest.raises(ValueError):
        inspect_file(path)
    path = tmp_path / "bomb.xlsx"
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr("huge.xml", b"0" * (129 * 1024 * 1024))
    with pytest.raises(ValueError, match="128 MB"):
        inspect_file(path)


def test_config_limits():
    for kwargs in (
        {"max_rows": 100001},
        {"max_upload_mb": 26},
        {"retention_hours": 0},
        {"session_hours": 0},
    ):
        with pytest.raises(ValueError):
            Settings(**kwargs)


def test_failed_job_clears_input_and_partial_report(client, monkeypatch):
    login(client)
    job_id = client.post("/jobs/paste", json={"text": "a@corp.com"}).json()["id"]

    def fail(self, *args, **kwargs):
        self.path.write_bytes(b"partial")
        raise ValueError("Malformed input")

    monkeypatch.setattr("engine.report.Report.process", fail)
    client.post(f"/jobs/{job_id}/process", json={"column": 0})
    for _ in range(100):
        job = client.get(f"/jobs/{job_id}").json()
        if job["state"] == "failed":
            break
        time.sleep(0.01)
    assert job["state"] == "failed"
    assert job["metadata"]["sample"] == []
    directory = client.app.state.jobs.root / job_id
    assert not (directory / "input.txt").exists()
    assert not (directory / "results.sqlite").exists()


def test_export_generation_is_atomic(client, monkeypatch):
    login(client)
    job_id = client.post("/jobs/paste", json={"text": "a@corp.com"}).json()["id"]
    client.post(f"/jobs/{job_id}/process", json={"column": 0})
    complete(client, job_id)

    def fail(self, path, *args):
        Path(path).write_text("partial", encoding="utf-8")
        raise OSError("disk failure")

    monkeypatch.setattr("engine.report.Report.export", fail)
    assert client.get(f"/jobs/{job_id}/download/clean").status_code == 503
    directory = client.app.state.jobs.root / job_id
    assert not (directory / "clean.csv").exists()
    assert not (directory / "clean.csv.tmp").exists()
