import pytest
from fastapi.testclient import TestClient

from backend.config import Settings
from backend.main import create_app


@pytest.fixture
def client(tmp_path):
    settings = Settings(
        username="test-user",
        password="test-password",
        session_secret="test-secret-" * 4,
        data_dir=tmp_path / "data",
    )
    with TestClient(create_app(settings)) as client:
        client.headers["origin"] = settings.origin
        yield client
