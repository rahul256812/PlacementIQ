from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import InterviewRound
from auth import get_current_user

router = APIRouter(prefix="/api/rounds", tags=["rounds"])

@router.get("/")
def get_rounds(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    rounds = db.query(InterviewRound).all()
    return rounds
