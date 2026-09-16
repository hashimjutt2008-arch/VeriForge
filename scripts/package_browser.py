"""Create a source-only deployment archive, excluding local data and secrets."""

import json
import subprocess
from pathlib import Path, PurePosixPath
from zipfile import ZIP_DEFLATED, ZipFile

from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[1]
TOP_FILES = {
    ".env.example",
    ".gitignore",
    "BUILD_PROGRESS.md",
    "README.md",
    "netlify.toml",
    "pyproject.toml",
    "requirements.lock",
}
TOP_DIRS = {"frontend", "backend", "engine", "rules", "docs", "scripts", "tests"}
EXCLUDED = {
    ".git",
    ".env",
    ".venv",
    ".runtime",
    ".data",
    "node_modules",
    ".next",
    "__pycache__",
    ".netlify",
}


def main():
    names = (
        subprocess.check_output(
            ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"], cwd=ROOT
        )
        .decode()
        .split("\0")
    )
    local = dotenv_values(ROOT / ".env")
    secrets = [
        local[key].encode()
        for key in ("VERIFORGE_PASSWORD", "VERIFORGE_SESSION_SECRET")
        if local.get(key)
    ]
    sources = []
    for name in sorted(set(filter(None, names))):
        relative = PurePosixPath(name)
        if relative.parts[0] not in TOP_DIRS and name not in TOP_FILES:
            continue
        if any(part in EXCLUDED for part in relative.parts):
            continue
        path = (ROOT / name).resolve()
        if not path.is_file():
            continue
        assert path.is_relative_to(ROOT), "Source path leaves workspace"
        data = path.read_bytes()
        assert not any(secret in data for secret in secrets), "Local credential found in source"
        sources.append((name, data))
    instructions = """VERIFORGE BROWSER-ONLY SOURCE

Extract this ZIP before uploading to GitHub. Preserve the frontend folder.
Use GitHub Desktop to replace the old project, review deletions, commit and push.
GitHub browser uploads do not delete obsolete files automatically.

Connect the GitHub repository to Netlify. The root netlify.toml configures:
  Base directory: frontend
  Build command: pnpm build
  Publish directory: .next

No Render, Python backend, login, password or backend URL is required.
Do not drag this source ZIP into Netlify's manual static upload area.
Read docs/NETLIFY_DEPLOYMENT.md for the complete beginner guide.

The archive excludes local credentials, browser data, installed dependencies and builds.
Python source is retained only as a legacy parity reference.
"""
    target = ROOT / ".runtime" / "VeriForge-browser-only-source.zip"
    target.parent.mkdir(exist_ok=True)
    with ZipFile(target, "w", compression=ZIP_DEFLATED) as archive:
        for name, data in sources:
            archive.writestr(name, data)
        archive.writestr("UPLOAD-INSTRUCTIONS.txt", instructions)
    with ZipFile(target) as archive:
        assert archive.testzip() is None
        manifest = set(archive.namelist())
        required = {
            "frontend/package.json",
            "frontend/pnpm-lock.yaml",
            "frontend/pnpm-workspace.yaml",
            "frontend/workers/email-cleaner.worker.ts",
            "frontend/lib/engine/cleaner.ts",
            "docs/BROWSER_ONLY_QA.md",
            "netlify.toml",
        }
        assert required.issubset(manifest)
        assert not any(part in EXCLUDED for name in manifest for part in PurePosixPath(name).parts)
        assert not any(name.startswith("frontend/app/api/") for name in manifest)
        json.loads(archive.read("frontend/package.json"))
    print(f"Created {target.name}: {len(sources)} source files; {target.stat().st_size:,} bytes.")
    print(
        "PASS: archive integrity, required browser source, folder structure and credential exclusion."
    )


if __name__ == "__main__":
    main()
