from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User
from auth import get_current_user

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/users")
def get_users(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    if user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Forbidden")
    users = db.query(User).all()
    return users
