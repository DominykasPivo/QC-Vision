import json
from typing import Awaitable, Callable, Optional

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
    if path.endswith("/upload") and m == "POST":
        return "UPLOAD"
    if m == "POST":
        return "CREATE"
    if m in ("PUT", "PATCH"):
        return "UPDATE"
    if m == "DELETE":
        return "DELETE"
    return "READ"


def try_extract_entity_id(body_bytes: bytes) -> Optional[int]:
    try:
        data = json.loads(body_bytes.decode("utf-8"))
        if isinstance(data, dict) and isinstance(data.get("id"), int):
            return data["id"]
    except Exception:
        pass
    return None


def extract_actor_user_id(request: Request) -> Optional[str]:
    """
    Extract actor user ID as a string (to match AuditLogCreate schema).
    Returns None if no user is found on the request state.
    """
    user = getattr(request.state, "user", None)
    if user is not None and hasattr(user, "id"):
        return str(user.id)

    uid = getattr(request.state, "user_id", None)
    if uid is not None:
        return str(uid)

    return None


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        path = request.url.path
        method = request.method

        should_audit = path.startswith("/api/v1/")

        db = None
        response = None
        body_bytes = b""

        try:
            response = await call_next(request)

            if should_audit:
                # FIX: Use response.body instead of response.body_iterator
                # StreamingResponse and similar don't expose body_iterator reliably.
                # We reconstruct the response by reading body via background iteration.
                raw_body = b""
                # BaseHTTPMiddleware wraps responses; body is accessible via iteration
                async for chunk in response.body_iterator:  # type: ignore[attr-defined]
                    raw_body += chunk
                body_bytes = raw_body

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

            # FIX: entity_id must be int (not None) per schema — default to 0
            entity_id: int = 0
            after_data = None

            if (
                success
                and response.media_type
                and "application/json" in response.media_type
            ):
                extracted = try_extract_entity_id(body_bytes)
                if extracted is not None:
                    entity_id = extracted

            if should_audit:
                db = SessionLocal()
                log_audit_event(
                    db,
                    AuditLogCreate(
                        actor_user_id=extract_actor_user_id(request),  # now str | None
                        action=action,
                        entity_type=entity_type,
                        entity_id=entity_id,  # now always int
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
                            actor_user_id=extract_actor_user_id(
                                request
                            ),  # now str | None
                            action=infer_action(method, path),
                            entity_type=infer_entity_type(path),
                            entity_id=0,  # FIX: use 0 instead of None
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
