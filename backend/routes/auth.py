from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, RoleEnum, StudentProfile, RecruiterProfile
from auth import verify_password, get_password_hash, create_access_token, get_current_user
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/auth", tags=["auth"])

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    fullName: str
    role: str
    college: Optional[str] = None
    branch: Optional[str] = None
    graduationYear: Optional[str] = None
    companyName: Optional[str] = None
    designation: Optional[str] = None

class ProfileUpdateRequest(BaseModel):
    fullName: Optional[str] = None
    college: Optional[str] = None
    branch: Optional[str] = None
    graduationYear: Optional[str] = None
    skills: Optional[str] = None
    cgpa: Optional[str] = None
    experience: Optional[str] = None
    projects: Optional[str] = None
    companyName: Optional[str] = None
    designation: Optional[str] = None

@router.post("/signup")
def signup(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    hashed = get_password_hash(req.password)
    role_enum = RoleEnum[req.role]
    user = User(email=req.email, passwordHash=hashed, role=role_enum, fullName=req.fullName)
    db.add(user)
    db.commit()
    db.refresh(user)
    if req.role == "STUDENT":
        db.add(StudentProfile(userId=user.id, college=req.college, branch=req.branch, graduationYear=int(req.graduationYear) if req.graduationYear else None))
    elif req.role == "RECRUITER":
        db.add(RecruiterProfile(userId=user.id, companyName=req.companyName or "Unknown", designation=req.designation or "Recruiter"))
    db.commit()
    token = create_access_token({"userId": user.id, "role": user.role.value, "email": user.email})
    return {"token": token, "user": {"id": user.id, "email": user.email, "role": user.role.value, "fullName": user.fullName}}

@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.passwordHash):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    token = create_access_token({"userId": user.id, "role": user.role.value, "email": user.email})
    profile = None
    status = None
    if user.role.value == "STUDENT":
        sp = db.query(StudentProfile).filter(StudentProfile.userId == user.id).first()
        if sp:
            profile = {"id": sp.id, "college": sp.college, "branch": sp.branch, "graduationYear": sp.graduationYear, "skills": sp.skills, "cgpa": sp.cgpa, "experience": sp.experience, "projects": sp.projects}
    elif user.role.value == "RECRUITER":
        rp = db.query(RecruiterProfile).filter(RecruiterProfile.userId == user.id).first()
        if rp:
            status = rp.status.value
            profile = {"id": rp.id, "companyName": rp.companyName, "designation": rp.designation, "status": rp.status.value}
    return {"token": token, "user": {"id": user.id, "email": user.email, "role": user.role.value, "fullName": user.fullName, "status": status}, "profile": profile}

@router.get("/profile")
def get_profile(db: Session = Depends(get_db), user_jwt: dict = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_jwt["userId"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    profile = None
    status = None
    if user.role.value == "STUDENT":
        sp = db.query(StudentProfile).filter(StudentProfile.userId == user.id).first()
        if sp:
            profile = {"id": sp.id, "college": sp.college, "branch": sp.branch, "graduationYear": sp.graduationYear, "skills": sp.skills, "cgpa": sp.cgpa, "experience": sp.experience, "projects": sp.projects}
    elif user.role.value == "RECRUITER":
        rp = db.query(RecruiterProfile).filter(RecruiterProfile.userId == user.id).first()
        if rp:
            status = rp.status.value
            profile = {"id": rp.id, "companyName": rp.companyName, "designation": rp.designation, "status": rp.status.value}
    elif user.role.value == "ADMIN":
        profile = {}
    return {"user": {"id": user.id, "email": user.email, "role": user.role.value, "fullName": user.fullName, "status": status}, "profile": profile}

@router.put("/profile")
def update_profile(req: ProfileUpdateRequest, db: Session = Depends(get_db), user_jwt: dict = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_jwt["userId"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if req.fullName is not None:
        user.fullName = req.fullName
    if user.role.value == "STUDENT":
        sp = db.query(StudentProfile).filter(StudentProfile.userId == user.id).first()
        if sp:
            if req.college is not None: sp.college = req.college
            if req.branch is not None: sp.branch = req.branch
            if req.graduationYear is not None: sp.graduationYear = int(req.graduationYear) if req.graduationYear else None
            if req.skills is not None: sp.skills = req.skills
            if req.cgpa is not None: sp.cgpa = float(req.cgpa) if req.cgpa else None
            if req.experience is not None: sp.experience = req.experience
            if req.projects is not None: sp.projects = req.projects
    elif user.role.value == "RECRUITER":
        rp = db.query(RecruiterProfile).filter(RecruiterProfile.userId == user.id).first()
        if rp:
            if req.companyName is not None: rp.companyName = req.companyName
            if req.designation is not None: rp.designation = req.designation
    db.commit()
    return {"message": "Profile updated successfully"}
