"""Run Python checks with a unique, workspace-owned temporary directory."""

import subprocess
import sys
import tempfile
from pathlib import Path

root = Path(__file__).resolve().parent.parent
runtime = root / ".runtime"
runtime.mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix="pytest-", dir=runtime) as directory:
    for args in [
        ["-m", "ruff", "check", "engine", "backend", "tests", "scripts"],
        ["-m", "pytest", "-q", "--tb=short", "--basetemp", str(Path(directory) / "tests")],
    ]:
        result = subprocess.run([sys.executable, *args], cwd=root)
        if result.returncode:
            raise SystemExit(result.returncode)
