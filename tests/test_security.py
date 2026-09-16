import time

from fastapi.testclient import TestClient

from backend.config import Settings
from backend.main import create_app
from tests.test_api import login


def test_cookie_flags_and_expiration(client):
    response = login(client)
    cookie = response.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=strict" in cookie and "max-age=43200" in cookie
    token = client.cookies.get("veriforge_session").partition(".")[0]
    client.app.state.auth.sessions[token] = time.time() - 1
    assert client.get("/auth/session").status_code == 401


def test_tampered_cookie(client):
    login(client)
    client.cookies.clear()
    client.cookies.set("veriforge_session", "fabricated.signature")
    assert client.get("/auth/session").status_code == 401


def test_failed_login_rate_limit(client):
    for _ in range(5):
        assert (
            client.post("/auth/login", json={"username": "bad", "password": "bad"}).status_code
            == 401
        )
    response = client.post(
        "/auth/login", json={"username": "test-user", "password": "test-password"}
    )
    assert response.status_code == 429
    assert response.headers["retry-after"] == "900"


def test_csrf_and_headers(client):
    login(client)
    response = client.post(
        "/jobs/paste", json={"text": "a@corp.com"}, headers={"origin": "https://evil.test"}
    )
    assert response.status_code == 403
    client.headers.pop("origin")
    assert client.post("/auth/logout").status_code == 403
    response = client.get("/auth/session")
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-content-type-options"] == "nosniff"


def test_missing_configuration_fails_closed(tmp_path):
    with TestClient(create_app(Settings(data_dir=tmp_path))) as c:
        assert (
            c.post(
                "/auth/login",
                json={"username": "", "password": ""},
                headers={"origin": "http://127.0.0.1:3000"},
            ).status_code
            == 503
        )


def test_https_forces_secure_cookie(tmp_path):
    settings = Settings(
        username="test-user",
        password="test-password",
        session_secret="x" * 40,
        origin="https://private.test",
        data_dir=tmp_path,
    )
    with TestClient(create_app(settings), base_url="https://private.test") as c:
        response = c.post(
            "/auth/login",
            json={"username": "test-user", "password": "test-password"},
            headers={"origin": settings.origin},
        )
        assert "; Secure" in response.headers["set-cookie"]
