from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, Response, UploadFile
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

from backend.auth import Auth
from backend.config import Settings
from backend.jobs import JobService
from backend.schemas import LoginInput, PasteInput, ProcessInput
from backend.security import SecurityMiddleware


def create_app(settings: Settings | None = None):
    settings = settings or Settings.from_env()
    auth = Auth(settings)
    jobs = JobService(settings)

    @asynccontextmanager
    async def lifespan(app):
        jobs.start_cleanup()
        yield
        jobs.close()

    app = FastAPI(
        title="VeriForge", docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan
    )
    app.state.auth = auth
    app.state.jobs = jobs
    app.state.settings = settings

    app.add_middleware(SecurityMiddleware, settings=settings, auth=auth)

    @app.get("/health")
    def health():
        return {"status": "ok", "service": "VeriForge"}

    @app.post("/auth/login")
    def login(body: LoginInput, response: Response, request: Request):
        return auth.login(
            body.username,
            body.password,
            response,
            request.client.host if request.client else "local",
        )

    @app.post("/auth/logout")
    def logout(request: Request, response: Response):
        return auth.logout(request, response)

    @app.get("/auth/session", dependencies=[Depends(auth.require)])
    def session():
        return {"authenticated": True, "username": settings.username}

    @app.get("/jobs", dependencies=[Depends(auth.require)])
    def history(offset: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=100)):
        return jobs.history(offset, limit)

    @app.get("/settings", dependencies=[Depends(auth.require)])
    def workspace_settings():
        return {
            "session_hours": settings.session_hours,
            "retention_hours": settings.retention_hours,
            "max_rows": settings.max_rows,
            "max_upload_mb": settings.max_upload_mb,
            "company_domain_limit": 2,
            "history": "server session",
        }

    @app.post("/jobs/upload", dependencies=[Depends(auth.require)], status_code=201)
    def upload(file: UploadFile = File(...), has_header: bool | None = None):
        filename = Path((file.filename or "").replace("\\", "/")).name[:200]
        suffix = Path(filename).suffix.lower()
        if suffix not in (".csv", ".txt", ".xlsx"):
            raise HTTPException(422, "Upload a CSV, TXT or XLSX file")
        job_id, path = jobs.allocate(suffix)
        try:
            total = 0
            with path.open("wb") as target:
                while chunk := file.file.read(1024 * 1024):
                    total += len(chunk)
                    if total > settings.max_upload_mb * 1024 * 1024:
                        raise HTTPException(
                            413, f"File exceeds the {settings.max_upload_mb} MB limit"
                        )
                    target.write(chunk)
            return jobs.add(job_id, path, filename, has_header)
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc
        except OSError as exc:
            raise HTTPException(503, "Temporary file storage is unavailable") from exc
        finally:
            file.file.close()
            if job_id not in jobs.jobs:
                jobs.remove_directory(path.parent)

    @app.post("/jobs/paste", dependencies=[Depends(auth.require)], status_code=201)
    def paste(body: PasteInput):
        if len(body.text.encode("utf-8")) > settings.max_upload_mb * 1024 * 1024:
            raise HTTPException(413, "Pasted input is too large")
        job_id, path = jobs.allocate(".txt")
        try:
            path.write_text(body.text, encoding="utf-8")
            return jobs.add(job_id, path, body.filename, False)
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc
        except OSError as exc:
            raise HTTPException(503, "Temporary file storage is unavailable") from exc

        finally:
            if job_id not in jobs.jobs:
                jobs.remove_directory(path.parent)

    @app.post("/jobs/{job_id}/process", dependencies=[Depends(auth.require)])
    def process(job_id: str, body: ProcessInput):
        return jobs.start(job_id, body.column, body.options)

    @app.get("/jobs/{job_id}", dependencies=[Depends(auth.require)])
    def job(job_id: str):
        return jobs.get(job_id)

    @app.get("/jobs/{job_id}/metadata", dependencies=[Depends(auth.require)])
    def metadata(job_id: str):
        return jobs.get(job_id)["metadata"]

    @app.get("/jobs/{job_id}/results", dependencies=[Depends(auth.require)])
    def results(
        job_id: str,
        offset: int = Query(0, ge=0),
        limit: int = Query(50, ge=1, le=200),
        status: Literal["", "VALID", "CORRECTED", "REMOVED", "REVIEW"] = "",
        category: str = Query("", max_length=100),
        domain: str = Query("", max_length=254),
        search: str = Query("", max_length=256),
    ):
        return jobs.results(
            job_id, offset, limit, status=status, category=category, domain=domain, search=search
        )

    @app.get("/jobs/{job_id}/download/{kind}", dependencies=[Depends(auth.require)])
    def download(
        job_id: str,
        kind: Literal["valid", "corrected", "removed", "review", "clean", "full"],
        format: Literal["csv", "xlsx"] = "csv",
    ):
        path = jobs.download(job_id, kind, format)
        media = (
            "text/csv"
            if format == "csv"
            else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        return FileResponse(
            path,
            media_type=media,
            filename=f"veriforge-{kind}-{job_id[:8]}.{format}",
            headers={"Cache-Control": "no-store"},
            background=BackgroundTask(jobs.release_download, job_id),
        )

    return app


app = create_app()
