from typing import TypedDict

from fastapi import Header, HTTPException, status


class Actor(TypedDict):
    username: str
    role: str


def require_reviewer(
    x_user: str = Header(default="system", alias="X-User"),
    x_role: str = Header(default="user", alias="X-Role"),
) -> Actor:
    if x_role not in ("reviewer", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Reviewer access required",
        )
    return {"username": x_user, "role": x_role}
