from fastapi import HTTPException, Request
from starlette.datastructures import Headers, MutableHeaders
from starlette.responses import JSONResponse


class BodyTooLarge(HTTPException):
    def __init__(self):
        super().__init__(413, "Request exceeds the input size limit")


class SecurityMiddleware:
    """Reject unauthenticated uploads before multipart parsing; cap streamed bodies."""

    def __init__(self, app, settings, auth):
        self.app, self.settings, self.auth = app, settings, auth

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        headers = Headers(scope=scope)
        path = scope["path"]

        async def protected_send(message):
            if message["type"] == "http.response.start":
                out = MutableHeaders(scope=message)
                out["Cache-Control"] = "no-store"
                out["X-Content-Type-Options"] = "nosniff"
                out["X-Frame-Options"] = "DENY"
                out["Referrer-Policy"] = "no-referrer"
            await send(message)

        async def reject(status, detail, extra=None):
            await JSONResponse({"detail": detail}, status_code=status, headers=extra)(
                scope, receive, protected_send
            )

        if (
            scope["method"] not in ("GET", "HEAD", "OPTIONS")
            and headers.get("origin") != self.settings.origin
        ):
            return await reject(403, "Request origin is not allowed")
        if path == "/jobs" or path.startswith("/jobs/") or path == "/settings":
            try:
                self.auth.require(Request(scope))
            except HTTPException as exc:
                return await reject(exc.status_code, exc.detail, exc.headers)
        limit = (
            16 * 1024
            if path.startswith("/auth/")
            else (self.settings.max_upload_mb + 1) * 1024 * 1024
        )
        try:
            length = int(headers.get("content-length", "0"))
        except ValueError:
            return await reject(400, "Invalid Content-Length")
        if length < 0:
            return await reject(400, "Invalid Content-Length")
        if length > limit:
            return await reject(413, "Request exceeds the input size limit")
        size = 0

        async def bounded_receive():
            nonlocal size
            message = await receive()
            if message["type"] == "http.request":
                size += len(message.get("body", b""))
                if size > limit:
                    raise BodyTooLarge()
            return message

        try:
            await self.app(scope, bounded_receive, protected_send)
        except BodyTooLarge:
            await reject(413, "Request exceeds the input size limit")
