import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func
from database import get_db
from models import Job, RecruiterProfile, Application, InterviewRound, JobActivityLog, RoundMessage, User
from auth import get_current_user
from pydantic import BaseModel
from typing import Optional, List, Any

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


def fmt_round(r):
    return {"id": r.id, "title": r.title, "type": r.type, "format": r.format, "order": r.order, "description": r.description, "instructions": r.instructions, "startDate": r.startDate, "endDate": r.endDate, "isMcqPublished": r.isMcqPublished, "isCodingPublished": r.isCodingPublished, "isMcqResultReleased": r.isMcqResultReleased, "mcqDuration": r.mcqDuration, "codingDuration": r.codingDuration}


class JobCreateRequest(BaseModel):
    title: str
    description: str
    requirements: str
    salaryRange: Optional[str] = None
    jobType: Optional[str] = None
    location: Optional[str] = None
    questions: Optional[List[Any]] = None
    applyStartDate: Optional[str] = None
    applyEndDate: Optional[str] = None


class JobUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    salaryRange: Optional[str] = None
    jobType: Optional[str] = None
    location: Optional[str] = None
    questions: Optional[List[Any]] = None
    isOpen: Optional[bool] = None
    applyStartDate: Optional[str] = None
    applyEndDate: Optional[str] = None


class RoundsSaveRequest(BaseModel):
    rounds: List[Any]


class MessageRequest(BaseModel):
    content: str


def parse_dt(s):
    if not s:
        return None
    try:
        return datetime.datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None


# --- Public ---

@router.get("/")
def get_jobs(db: Session = Depends(get_db)):
    jobs = db.query(Job).options(selectinload(Job.recruiter)).filter(Job.isOpen == True).order_by(Job.createdAt.desc()).all()
    return [{"id": j.id, "title": j.title, "description": j.description, "requirements": j.requirements, "salaryRange": j.salaryRange, "jobType": j.jobType, "location": j.location, "isOpen": j.isOpen, "createdAt": j.createdAt, "questions": j.questions, "applyStartDate": j.applyStartDate, "applyEndDate": j.applyEndDate, "recruiter": {"companyName": j.recruiter.companyName if j.recruiter else "Unknown"}} for j in jobs]


# --- Recruiter specific (must come before /{job_id}) ---

@router.get("/me")
def get_my_jobs(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    if user.get("role") != "RECRUITER":
        raise HTTPException(status_code=403, detail="Forbidden")
    recruiter = db.query(RecruiterProfile).filter(RecruiterProfile.userId == user["userId"]).first()
    if not recruiter:
        raise HTTPException(status_code=404, detail="Profile not found")
    jobs = db.query(Job).options(selectinload(Job.rounds)).filter(Job.recruiterProfileId == recruiter.id).order_by(Job.createdAt.desc()).all()
    result = []
    for j in jobs:
        app_count = db.query(func.count(Application.id)).filter(Application.jobId == j.id).scalar()
        result.append({"id": j.id, "title": j.title, "description": j.description, "requirements": j.requirements, "salaryRange": j.salaryRange, "jobType": j.jobType, "location": j.location, "isOpen": j.isOpen, "createdAt": j.createdAt, "questions": j.questions, "applyStartDate": j.applyStartDate, "applyEndDate": j.applyEndDate, "rounds": [fmt_round(r) for r in sorted(j.rounds, key=lambda x: x.order)], "_count": {"applications": app_count}})
    return result


@router.get("/history")
def get_history(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    if user.get("role") != "RECRUITER":
        raise HTTPException(status_code=403, detail="Forbidden")
    recruiter = db.query(RecruiterProfile).filter(RecruiterProfile.userId == user["userId"]).first()
    logs = db.query(JobActivityLog).filter(JobActivityLog.recruiterProfileId == recruiter.id).order_by(JobActivityLog.timestamp.desc()).all()
    return [{"id": l.id, "action": l.action, "jobTitle": l.jobTitle, "details": l.details, "timestamp": l.timestamp} for l in logs]


@router.post("/")
def create_job(req: JobCreateRequest, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    if user.get("role") != "RECRUITER":
        raise HTTPException(status_code=403, detail="Forbidden")
    recruiter = db.query(RecruiterProfile).filter(RecruiterProfile.userId == user["userId"]).first()
    if not recruiter:
        raise HTTPException(status_code=404, detail="Profile not found")
    if recruiter.status.value != "APPROVED":
        raise HTTPException(status_code=403, detail="Your account is pending admin approval")
    new_job = Job(recruiterProfileId=recruiter.id, title=req.title, description=req.description, requirements=req.requirements, salaryRange=req.salaryRange, jobType=req.jobType, location=req.location, questions=req.questions, applyStartDate=parse_dt(req.applyStartDate), applyEndDate=parse_dt(req.applyEndDate))
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    db.add(JobActivityLog(recruiterProfileId=recruiter.id, jobId=new_job.id, jobTitle=new_job.title, action="POSTED", details=f"Job posted at {req.location or 'Remote'} with salary {req.salaryRange or 'Not specified'}."))
    db.commit()
    return {"id": new_job.id, "title": new_job.title, "description": new_job.description}


@router.get("/{job_id}")
def get_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).options(selectinload(Job.recruiter), selectinload(Job.rounds)).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"id": job.id, "title": job.title, "description": job.description, "requirements": job.requirements, "salaryRange": job.salaryRange, "jobType": job.jobType, "location": job.location, "isOpen": job.isOpen, "createdAt": job.createdAt, "questions": job.questions, "applyStartDate": job.applyStartDate, "applyEndDate": job.applyEndDate, "recruiter": {"companyName": job.recruiter.companyName if job.recruiter else "Unknown"}, "rounds": [fmt_round(r) for r in sorted(job.rounds, key=lambda x: x.order)]}


@router.put("/{job_id}")
def update_job(job_id: str, req: JobUpdateRequest, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    if user.get("role") != "RECRUITER":
        raise HTTPException(status_code=403, detail="Forbidden")
    recruiter = db.query(RecruiterProfile).filter(RecruiterProfile.userId == user["userId"]).first()
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job or job.recruiterProfileId != recruiter.id:
        raise HTTPException(status_code=404, detail="Job not found or unauthorized")
    old_is_open = job.isOpen
    if req.title is not None: job.title = req.title
    if req.description is not None: job.description = req.description
    if req.requirements is not None: job.requirements = req.requirements
    if req.salaryRange is not None: job.salaryRange = req.salaryRange
    if req.jobType is not None: job.jobType = req.jobType
    if req.location is not None: job.location = req.location
    if req.questions is not None: job.questions = req.questions
    if req.isOpen is not None: job.isOpen = req.isOpen
    if req.applyStartDate is not None: job.applyStartDate = parse_dt(req.applyStartDate)
    if req.applyEndDate is not None: job.applyEndDate = parse_dt(req.applyEndDate)
    db.commit()
    db.refresh(job)
    is_status_changing = req.isOpen is not None and req.isOpen != old_is_open
    if is_status_changing:
        db.add(JobActivityLog(recruiterProfileId=recruiter.id, jobId=job.id, jobTitle=job.title, action="RESUMED" if req.isOpen else "PAUSED", details="Recruiting process resumed." if req.isOpen else "Recruiting process put on hold."))
    else:
        db.add(JobActivityLog(recruiterProfileId=recruiter.id, jobId=job.id, jobTitle=job.title, action="EDITED", details="Job posting details updated."))
    db.commit()
    return {"id": job.id}


@router.delete("/{job_id}")
def delete_job(job_id: str, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    if user.get("role") != "RECRUITER":
        raise HTTPException(status_code=403, detail="Forbidden")
    recruiter = db.query(RecruiterProfile).filter(RecruiterProfile.userId == user["userId"]).first()
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job or job.recruiterProfileId != recruiter.id:
        raise HTTPException(status_code=404, detail="Job not found or unauthorized")
    db.add(JobActivityLog(recruiterProfileId=recruiter.id, jobId=None, jobTitle=job.title, action="DELETED", details=f'Job posting "{job.title}" was deleted.'))
    db.delete(job)
    db.commit()
    return {"message": "Job deleted"}


@router.post("/{job_id}/rounds")
def save_rounds(job_id: str, req: RoundsSaveRequest, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    if user.get("role") != "RECRUITER":
        raise HTTPException(status_code=403, detail="Forbidden")
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    db.query(InterviewRound).filter(InterviewRound.jobId == job_id).delete()
    for r in req.rounds:
        db.add(InterviewRound(jobId=job_id, title=r.get("title", ""), type=r.get("type", "Technical Interview"), format=r.get("format", "Online"), description=r.get("description"), instructions=r.get("instructions"), order=r.get("order", 1), startDate=parse_dt(r.get("startDate")), endDate=parse_dt(r.get("endDate"))))
    db.commit()
    return {"message": "Rounds saved"}


@router.get("/{job_id}/messages")
def get_messages(job_id: str, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    messages = db.query(RoundMessage).filter(RoundMessage.jobId == job_id).order_by(RoundMessage.createdAt.asc()).all()
    db_user = db.query(User).filter(User.id == user["userId"]).first()
    result = []
    for m in messages:
        sender_user = db.query(User).filter(User.id == m.senderId).first()
        result.append({"id": m.id, "content": m.content, "createdAt": m.createdAt, "senderName": m.senderName or (sender_user.fullName if sender_user else "Unknown"), "sender": {"id": m.senderId, "fullName": m.senderName or (sender_user.fullName if sender_user else "Unknown"), "role": sender_user.role.value if sender_user else "STUDENT"}})
    return result


@router.post("/{job_id}/messages")
def post_message(job_id: str, req: MessageRequest, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    sender = db.query(User).filter(User.id == user["userId"]).first()
    new_msg = RoundMessage(jobId=job_id, senderId=user["userId"], senderName=sender.fullName if sender else "", content=req.content)
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)
    return {"id": new_msg.id, "content": new_msg.content, "createdAt": new_msg.createdAt}
