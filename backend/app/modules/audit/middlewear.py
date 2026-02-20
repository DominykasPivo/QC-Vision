import json
from typing import Awaitable, Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.database import SessionLocal
from app.modules.audit.service import log_action

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

    # Special case: upload endpoint
    if path.endswith("/upload") and m == "POST":
        return "UPLOAD"

    if m == "POST":
        return "CREATE"
    if m in ("PUT", "PATCH"):
        return "UPDATE"
    if m == "DELETE":
        return "DELETE"

    return "READ"


def try_extract_ids(body_bytes: bytes) -> tuple[int | None, int | None]:
    """
    Extracts:
    - entity_id (id)
    - test_id (if present in response)
    """
    try:
        data = json.loads(body_bytes.decode("utf-8"))
        if isinstance(data, dict):
            entity_id = data.get("id") if isinstance(data.get("id"), int) else None
            test_id = data.get("test_id") if isinstance(data.get("test_id"), int) else None
            return entity_id, test_id
    except Exception:
        pass

    return None, None


def extract_username(request: Request) -> str:
    """
    Extract username safely.
    Falls back to 'system' if no auth is configured.
    """
    user = getattr(request.state, "user", None)

    if user:
        if hasattr(user, "username") and user.username:
            return str(user.username)
        if hasattr(user, "email") and user.email:
            return str(user.email)

    return "system"


# =========================================================
# Middleware
# =========================================================


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:

        path = request.url.path
        method = request.method

        # Only audit API routes
        should_audit = (
            path.startswith("/api/v1/")
            and not path.startswith(EXCLUDED_PATH_PREFIXES)
            and method.upper() != "GET"  # Remove READ noise
        )

        db = None
        response = None
        body_bytes = b""

        try:
            response = await call_next(request)

            # Capture response body (needed to extract IDs)
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

            if should_audit:
                db = SessionLocal()

                action = infer_action(method, path)
                entity_type = infer_entity_type(path)

                entity_id = None
                test_id = None

                if (
                    success
                    and response.media_type
                    and "application/json" in response.media_type
                ):
                    entity_id, test_id = try_extract_ids(body_bytes)

                # Build structured meta
                meta = {
                    "method": method,
                    "path": path,
                    "status_code": status_code,
                    "success": success,
                    "ip_address": request.client.host if request.client else None,
                    "user_agent": request.headers.get("user-agent"),
                }

                if test_id is not None:
                    meta["test_id"] = test_id

                log_action(
                    db,
                    action=action,
                    entity_type=entity_type,
                    entity_id=entity_id or 0,  # fallback if id missing
                    username=extract_username(request),
                    meta=meta,
                )

            return response

        except Exception as e:
            if should_audit:
                try:
                    db = SessionLocal()

                    log_action(
                        db,
                        action=infer_action(method, path),
                        entity_type=infer_entity_type(path),
                        entity_id=0,
                        username=extract_username(request),
                        meta={
                            "method": method,
                            "path": path,
                            "status_code": 500,
                            "success": False,
                            "error": str(e),
                            "error_type": e.__class__.__name__,
                        },
                    )
                finally:
                    if db:
                        db.close()

            raise

        finally:
            if db:
                db.close()
