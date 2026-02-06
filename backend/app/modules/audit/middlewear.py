import json
from typing import Callable, Awaitable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.database import SessionLocal
from app.modules.audit.schemas import AuditLogCreate
from app.modules.audit.service import log_audit_event


def infer_entity_type(path: str) -> str:
    if "/api/v1/photos" in path:
        return "Photo"
    if "/api/v1/tests" in path:
        return "Test"
    if "/api/v1/albums" in path:
        return "Album"
    if "/api/v1/users" in path:
        return "User"
    if "/api/v1/permissions" in path:
        return "Permission"
    return "Unknown"


def infer_action(method: str, path: str) -> str:
    m = method.upper()
    # Special case for your upload endpoint
    if path.endswith("/upload") and m == "POST":
        return "UPLOAD"
    if m == "POST":
        return "CREATE"
    if m in ("PUT", "PATCH"):
        return "UPDATE"
    if m == "DELETE":
        return "DELETE"
    return "READ"


def try_extract_entity_id(body_bytes: bytes) -> int | None:
    # Your PhotoResponse includes: id, test_id, file_path, time_stamp, analysis_results
    try:
        data = json.loads(body_bytes.decode("utf-8"))
        if isinstance(data, dict) and isinstance(data.get("id"), int):
            return data["id"]
    except Exception:
        pass
    return None


def extract_actor_user_id(request: Request) -> int | None:
    """
    Your current upload endpoint has no authentication dependency,
    so this will usually be None (until auth is added).
    If later you store user on request.state, this starts working automatically.
    """
    user = getattr(request.state, "user", None)
    if user is not None and hasattr(user, "id"):
        return user.id

    uid = getattr(request.state, "user_id", None)
    if isinstance(uid, int):
        return uid

    return None


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        path = request.url.path
        method = request.method

        # Only audit the endpoints you care about (you can widen this later)
        should_audit = path.startswith("/api/v1/")

        db = None
        response = None
        body_bytes = b""

        try:
            response = await call_next(request)

            if should_audit:
                async for chunk in response.body_iterator:
                    body_bytes += chunk

                response = Response(
                    content=body_bytes,
                    status_code=response.status_code,
                    headers=dict(response.headers),
                    media_type=response.media_type,
                )

            status_code = response.status_code
            success = status_code < 400

            entity_type = infer_entity_type(path)
            action = infer_action(method, path)

            entity_id = None
            after_data = None

            if success and response.media_type and "application/json" in response.media_type:
                entity_id = try_extract_entity_id(body_bytes)

            if should_audit:
                db = SessionLocal()
                log_audit_event(
                    db,
                    AuditLogCreate(
                        actor_user_id=extract_actor_user_id(request),
                        action=action,
                        entity_type=entity_type,
                        entity_id=entity_id,
                        success=success,
                        status_code=status_code,
                        method=method,
                        path=path,
                        ip_address=request.client.host if request.client else None,
                        user_agent=request.headers.get("user-agent"),
                        message="request audit",
                        after_data=after_data,
                        error_data=None,
                    ),
                )

            return response

        except Exception as e:
            if should_audit:
                try:
                    db = SessionLocal()
                    log_audit_event(
                        db,
                        AuditLogCreate(
                            actor_user_id=extract_actor_user_id(request),
                            action=infer_action(method, path),
                            entity_type=infer_entity_type(path),
                            entity_id=None,
                            success=False,
                            status_code=500,
                            method=method,
                            path=path,
                            ip_address=request.client.host if request.client else None,
                            user_agent=request.headers.get("user-agent"), 
                            message="unhandled exception",
                            error_data={"error": str(e), "type": e.__class__.__name__},
                        ),
                    )
                finally:
                    if db is not None:
                        db.close()
            raise
        finally:
            if db is not None:
                db.close()
