import io
import time

import pytest
from openpyxl import Workbook


def login(client):
    response = client.post(
        "/auth/login", json={"username": "test-user", "password": "test-password"}
    )
    assert response.status_code == 200
    return response


def complete(client, job_id):
    for _ in range(100):
        job = client.get(f"/jobs/{job_id}").json()
        if job["state"] in ("complete", "failed"):
            assert job["state"] == "complete", job
            return job
        time.sleep(0.01)
    pytest.fail("Job did not complete")


def test_health_and_auth(client):
    assert client.get("/health").status_code == 200
    assert client.get("/jobs/missing").status_code == 401
    assert (
        client.post("/auth/login", json={"username": "bad", "password": "bad"}).status_code == 401
    )
    login(client)
    assert client.get("/auth/session").json()["authenticated"] is True
    cookie = client.cookies.get("veriforge_session")
    assert client.post("/auth/logout").status_code == 200
    client.cookies.set("veriforge_session", cookie)
    assert client.get("/auth/session").status_code == 401


@pytest.mark.parametrize("kind", ["paste", "csv", "xlsx", "txt"])
def test_full_api_workflow(client, kind):
    login(client)
    emails = ["one@corp.com", "two@corp.comt", "one@corp.com", "123@corp.com", "bad"]
    if kind == "paste":
        response = client.post("/jobs/paste", json={"text": "\n".join(emails)})
        column = 0
    else:
        if kind == "xlsx":
            wb = Workbook()
            wb.active.append(["Name", "Email"])
            for email in emails:
                wb.active.append(["Person", email])
            content = io.BytesIO()
            wb.save(content)
            payload = content.getvalue()
            column = 1
        elif kind == "csv":
            payload = ("Name,Email\n" + "\n".join("Person," + email for email in emails)).encode()
            column = 1
        else:
            payload = "\n".join(emails).encode()
            column = 0
        response = client.post("/jobs/upload", files={"file": (f"contacts.{kind}", payload)})
    assert response.status_code == 201, response.text
    job_id = response.json()["id"]
    assert response.json()["total"] == 5
    assert client.get(f"/jobs/{job_id}/metadata").json()["suggested_column"] == column
    assert client.get(f"/jobs/{job_id}/results").status_code == 409
    assert (
        client.post(
            f"/jobs/{job_id}/process",
            json={"column": column, "options": {"company_domain_limit": 2}},
        ).status_code
        == 200
    )
    assert client.post(f"/jobs/{job_id}/process", json={"column": column}).status_code == 409
    result = complete(client, job_id)
    assert result["summary"]["clean"] == 2
    assert client.get(f"/jobs/{job_id}/results?status=CORRECTED").json()["total"] == 1
    assert (
        client.get(f"/jobs/{job_id}/results?limit=1&offset=1").json()["items"][0]["row_number"] == 2
    )
    for export in ["valid", "corrected", "removed", "review", "clean", "full"]:
        for format in ["csv", "xlsx"]:
            response = client.get(f"/jobs/{job_id}/download/{export}?format={format}")
            assert response.status_code == 200
            assert "attachment" in response.headers["content-disposition"]
    assert not (
        client.app.state.jobs.root / job_id / ("input." + (kind if kind != "paste" else "txt"))
    ).exists()


def test_api_input_errors(client):
    login(client)
    assert client.post("/jobs/upload", files={"file": ("bad.exe", b"abc")}).status_code == 422
    assert client.post("/jobs/upload", files={"file": ("bad.xlsx", b"abc")}).status_code == 422
    assert client.post("/jobs/paste", json={"text": ""}).status_code == 422
    assert client.get("/jobs/missing").status_code == 404
    job_id = client.post("/jobs/paste", json={"text": "one@corp.com"}).json()["id"]
    assert client.post(f"/jobs/{job_id}/process", json={"column": 10}).status_code == 422
    assert (
        client.post(
            f"/jobs/{job_id}/process", json={"column": 0, "options": {"company_domain_limit": 0}}
        ).status_code
        == 422
    )
    assert client.get(f"/jobs/{job_id}/results?limit=100000").status_code == 422


def test_history_and_settings_are_private(client):
    assert client.get("/jobs").status_code == 401
    assert client.get("/settings").status_code == 401
    login(client)
    job_id = client.post(
        "/jobs/paste", json={"text": "one@corp.com", "filename": "History test"}
    ).json()["id"]
    client.post(f"/jobs/{job_id}/process", json={"column": 0})
    complete(client, job_id)
    history = client.get("/jobs").json()
    assert history["total"] == 1
    assert history["items"][0]["summary"]["clean"] == 1
    assert "metadata" not in history["items"][0]
    settings = client.get("/settings").json()
    assert settings["retention_hours"] == 12
    assert "password" not in settings and "session_secret" not in settings
