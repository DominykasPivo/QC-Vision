from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.users.models import User

router = APIRouter(prefix="/users", tags=["Users"])


class RoleUpdate(BaseModel):
    role: str


@router.get("/me")
def me(
    x_user: str = Header(default=""),
    db: Session = Depends(get_db),
):
    username = (x_user or "").strip()
    if len(username) < 2 or len(username) > 32:
        raise HTTPException(status_code=400, detail="Username must be 2-32 characters")

    user = db.query(User).filter(User.username == username).first()
    if not user:
        user = User(username=username, role="user")
        db.add(user)
        db.commit()
        db.refresh(user)

    return {"username": user.username, "role": user.role}


@router.put("/me/role")
def update_role(
    role_update: RoleUpdate,
    x_user: str = Header(default=""),
    db: Session = Depends(get_db),
):
    """Update the current user's role"""
    username = (x_user or "").strip()
    if len(username) < 2 or len(username) > 32:
        raise HTTPException(status_code=400, detail="Username must be 2-32 characters")

    # Validate role
    if role_update.role not in ("user", "reviewer", "admin"):
        raise HTTPException(
            status_code=400,
            detail="Invalid role. Must be 'user', 'reviewer', or 'admin'",
        )

    user = db.query(User).filter(User.username == username).first()
    if not user:
        user = User(username=username, role=role_update.role)
        db.add(user)
    else:
        user.role = role_update.role

    db.commit()
    db.refresh(user)

    return {"username": user.username, "role": user.role}
