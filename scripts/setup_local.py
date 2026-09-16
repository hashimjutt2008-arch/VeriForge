"""Legacy Python-only setup. Not used by the browser application or deployment."""

import secrets
from pathlib import Path

root = Path(__file__).resolve().parent.parent
target = root / ".env"
if target.exists():
    print("Existing .env preserved. Edit it to change credentials.")
else:
    password = secrets.token_urlsafe(24)
    secret = secrets.token_urlsafe(48)
    template = (root / "backend" / ".env.example").read_text(encoding="utf-8-sig")
    template = template.replace("VERIFORGE_USERNAME=\n", "VERIFORGE_USERNAME=veriforge\n")
    template = template.replace("VERIFORGE_PASSWORD=\n", f"VERIFORGE_PASSWORD={password}\n")
    template = template.replace(
        "VERIFORGE_SESSION_SECRET=\n", f"VERIFORGE_SESSION_SECRET={secret}\n"
    )
    target.write_text(template, encoding="utf-8")
    access = root / ".runtime" / "LOCAL_ACCESS.md"
    access.parent.mkdir(exist_ok=True)
    access.write_text(
        f"# Local VeriForge access\n\nURL: http://127.0.0.1:3000\n\nUsername: veriforge\n\nPassword: {password}\n\nThese generated local credentials are ignored by Git. Change .env and restart the backend to replace them.\n",
        encoding="utf-8",
    )
    print("Created ignored .env and .runtime/LOCAL_ACCESS.md. No credentials were printed.")
