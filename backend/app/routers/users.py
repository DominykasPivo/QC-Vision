from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.users.models import User

router = APIRouter(prefix="/api/v1/users", tags=["Users"])


@router.get("/me")
def me(
    x_user: str = Header(default=""),
    db: Session = Depends(get_db),
):
    username = (x_user or "").strip()
    if len(username) != 5:
        raise HTTPException(
            status_code=400, detail="Username must be exactly 5 characters"
        )

    user = db.query(User).filter(User.username == username).first()
    if not user:
        user = User(username=username, role="user")
        db.add(user)
        db.commit()
        db.refresh(user)

    return {"username": user.username, "role": user.role}
