import hashlib
import hmac
import secrets
import time
from collections import deque
from threading import RLock

from fastapi import HTTPException, Request, Response

COOKIE = "veriforge_session"


class Auth:
    def __init__(self, settings):
        self.settings = settings
        self.sessions: dict[str, float] = {}
        self.failures: dict[str, deque] = {}
        self.lock = RLock()

    def sign(self, token):
        return hmac.new(
            self.settings.session_secret.encode(), token.encode(), hashlib.sha256
        ).hexdigest()

    def login(self, username: str, password: str, response: Response, client_ip="local"):
        settings = self.settings
        if (
            not settings.username
            or len(settings.password) < 12
            or len(settings.session_secret) < 32
        ):
            raise HTTPException(
                503,
                "Private access is not configured. Set a username, a 12-character password and a 32-character session secret on the server.",
            )
        now = time.time()
        with self.lock:
            self.sessions = {
                token: expiry for token, expiry in self.sessions.items() if expiry > now
            }
            self.failures = {
                ip: times for ip, times in self.failures.items() if times and times[-1] > now - 900
            }
            attempts = self.failures.setdefault(client_ip, deque())
            while attempts and attempts[0] <= now - 900:
                attempts.popleft()
            if len(attempts) >= 5:
                raise HTTPException(
                    429,
                    "Too many failed sign-in attempts. Try again in 15 minutes.",
                    headers={"Retry-After": "900"},
                )
            user_ok = secrets.compare_digest(username.encode(), settings.username.encode())
            password_ok = secrets.compare_digest(password.encode(), settings.password.encode())
            if not (user_ok & password_ok):
                attempts.append(now)
                raise HTTPException(401, "Invalid username or password")
            self.failures.pop(client_ip, None)
            if len(self.sessions) >= 1000:
                raise HTTPException(429, "Session limit reached. Please try again later.")
            token = secrets.token_urlsafe(32)
            duration = settings.session_hours * 3600
            self.sessions[token] = now + duration
        response.set_cookie(
            COOKIE,
            token + "." + self.sign(token),
            max_age=duration,
            httponly=True,
            samesite="strict",
            secure=settings.secure_cookie or settings.origin.startswith("https://"),
            path="/",
        )
        return {"authenticated": True, "username": settings.username}

    def require(self, request: Request):
        cookie = request.cookies.get(COOKIE, "")
        token, _, signature = cookie.partition(".")
        with self.lock:
            expires = self.sessions.get(token, 0)
            if expires <= time.time():
                self.sessions.pop(token, None)
        if (
            not token
            or expires <= time.time()
            or not secrets.compare_digest(signature, self.sign(token))
        ):
            raise HTTPException(401, "Session expired. Please sign in.")
        return token

    def logout(self, request: Request, response: Response):
        token = request.cookies.get(COOKIE, "").partition(".")[0]
        with self.lock:
            self.sessions.pop(token, None)
        response.delete_cookie(
            COOKIE,
            path="/",
            secure=self.settings.secure_cookie or self.settings.origin.startswith("https://"),
            httponly=True,
            samesite="strict",
        )
        return {"authenticated": False}
