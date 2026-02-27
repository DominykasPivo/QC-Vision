import json
from typing import Awaitable, Callable, Optional, Tuple

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.database import SessionLocal
from app.modules.audit.schemas import AuditLogCreate
from app.modules.audit.service import log_audit_event  # ✅ use this, not log_action

EXCLUDED_PATH_PREFIXES = ("/docs", "/redoc", "/openapi.json", "/health")


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


def try_extract_ids(body_bytes: bytes) -> Tuple[Optional[int], Optional[int]]:
    """
    Returns (entity_id, test_id) from JSON response body if present.
    """
    try:
        data = json.loads(body_bytes.decode("utf-8"))
        if isinstance(data, dict):
            entity_id = data.get("id") if isinstance(data.get("id"), int) else None
            test_id = (
                data.get("test_id") if isinstance(data.get("test_id"), int) else None
            )
            return entity_id, test_id
    except Exception:
        pass
    return None, None


def extract_actor_user_id(request: Request) -> Optional[str]:
    user = getattr(request.state, "user", None)
    if (
        user is not None
        and hasattr(user, "id")
        and getattr(user, "id", None) is not None
    ):
        return str(user.id)

    uid = getattr(request.state, "user_id", None)
    if uid is not None:
        return str(uid)

    return None


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        path = request.url.path
        method = request.method

        should_audit = (
            path.startswith("/api/v1/")
            and not path.startswith(EXCLUDED_PATH_PREFIXES)
            and method.upper() != "GET"
        )

        db = None
        body_bytes = b""

        try:
            response = await call_next(request)

            status_code = response.status_code
            success = status_code < 400

            if should_audit:
                raw_body = b""
                async for chunk in response.body_iterator:  # type: ignore[attr-defined]
                    raw_body += chunk
                body_bytes = raw_body

                # Recreate response so client still receives the body
                response = Response(
                    content=body_bytes,
                    status_code=status_code,
                    headers=dict(response.headers),
                    media_type=response.media_type,
                )

                entity_id: int = 0
                after_data = None

                if (
                    response.media_type
                    and "application/json" in response.media_type
                    and success
                ):
                    extracted_entity_id, _test_id = try_extract_ids(body_bytes)
                    entity_id = extracted_entity_id or 0
                    try:
                        after_data = json.loads(body_bytes.decode("utf-8"))
                    except Exception:
                        after_data = None

                db = SessionLocal()

                # ✅ Correct: middleware logs via log_audit_event(AuditLogCreate)
                log_audit_event(
                    db,
                    AuditLogCreate(
                        actor_user_id=extract_actor_user_id(request),
                        action=infer_action(method, path),
                        entity_type=infer_entity_type(path),
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
                            entity_id=0,
                            success=False,
                            status_code=500,
                            method=method,
                            path=path,
                            ip_address=request.client.host if request.client else None,
                            user_agent=request.headers.get("user-agent"),
                            message="unhandled exception",
                            after_data=None,
                            error_data={"error": str(e), "type": e.__class__.__name__},
                        ),
                    )
                finally:
                    if db:
                        db.close()
            raise

        finally:
            if db:
                db.close()
