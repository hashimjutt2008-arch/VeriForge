from backend.main import app
from engine.models import Options, Result, Status


def test_backend_imports():
    assert app.title == "VeriForge"


def test_contract():
    result = Result("RAW", "raw", "raw", Status.VALID, "VALID", "Passed all checks")
    assert result.to_dict()["original_email"] == "RAW"
    assert Options().company_domain_limit == 2
