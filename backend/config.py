import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")


@dataclass
class Settings:
    username: str = ""
    password: str = ""
    session_secret: str = ""
    origin: str = "http://127.0.0.1:3000"
    session_hours: int = 12
    secure_cookie: bool = False
    data_dir: Path = ROOT / ".data"
    retention_hours: int = 12
    max_upload_mb: int = 25
    max_rows: int = 100000

    def __post_init__(self):
        if not 1 <= self.max_rows <= 100000:
            raise ValueError("VERIFORGE_MAX_ROWS must be between 1 and 100000")
        if not 1 <= self.max_upload_mb <= 25:
            raise ValueError("VERIFORGE_MAX_UPLOAD_MB must be between 1 and 25")
        if not 1 <= self.session_hours <= 168 or not 1 <= self.retention_hours <= 168:
            raise ValueError("Session and retention hours must be between 1 and 168")
        if not self.origin.startswith(("http://", "https://")):
            raise ValueError("VERIFORGE_ORIGIN must be an HTTP(S) origin")

    @classmethod
    def from_env(cls):
        return cls(
            username=os.getenv("VERIFORGE_USERNAME", ""),
            password=os.getenv("VERIFORGE_PASSWORD", ""),
            session_secret=os.getenv("VERIFORGE_SESSION_SECRET", ""),
            origin=os.getenv("VERIFORGE_ORIGIN", "http://127.0.0.1:3000").rstrip("/"),
            session_hours=int(os.getenv("VERIFORGE_SESSION_HOURS", "12")),
            secure_cookie=os.getenv("VERIFORGE_SECURE_COOKIE", "false").lower() == "true",
            data_dir=Path(os.getenv("VERIFORGE_DATA_DIR", str(ROOT / ".data"))).resolve(),
            retention_hours=int(os.getenv("VERIFORGE_RETENTION_HOURS", "12")),
            max_upload_mb=int(os.getenv("VERIFORGE_MAX_UPLOAD_MB", "25")),
            max_rows=int(os.getenv("VERIFORGE_MAX_ROWS", "100000")),
        )
