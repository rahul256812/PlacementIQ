import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload
from database import get_db
from models import Application, StudentProfile, RecruiterProfile, Job, InterviewRound, CandidateProgress, ApplicationStatusEnum
from auth import get_current_user
from pydantic import BaseModel
from typing import Optional, Any

router = APIRouter(prefix="/api/applications", tags=["applications"])


def fmt_app(app):
    prog = []
    for p in (app.progressions or []):
        prog.append({
            "id": p.id, "roundId": p.roundId, "status": p.status, "feedback": p.feedback,
            "meetLink": p.meetLink, "isMeetLinkPublished": p.isMeetLinkPublished,
            "round": {"id": p.round.id, "title": p.round.title, "type": p.round.type, "format": p.round.format, "order": p.round.order} if p.round else None,
            "mcqResponse": {"id": p.mcqResponse.id, "score": p.mcqResponse.score, "totalPossibleMarks": p.mcqResponse.totalPossibleMarks, "submittedAt": p.mcqResponse.submittedAt} if p.mcqResponse else None,
            "codingSubmissions": [{"id": cs.id, "score": cs.score, "status": cs.status, "passedCasesCount": cs.passedCasesCount, "totalCasesCount": cs.totalCasesCount, "question": {"id": cs.question.id, "title": cs.question.title} if cs.question else None} for cs in (p.codingSubmissions or [])]
        })
    job_dict = None
    if app.job:
        rounds = [{"id": r.id, "title": r.title, "type": r.type, "format": r.format, "order": r.order} for r in sorted(app.job.rounds or [], key=lambda x: x.order)]
        job_dict = {"id": app.job.id, "title": app.job.title, "location": app.job.location, "jobType": app.job.jobType, "isOpen": app.job.isOpen, "rounds": rounds, "recruiter": {"companyName": app.job.recruiter.companyName if app.job.recruiter else "Unknown"}}
    return {
        "id": app.id, "jobId": app.jobId, "status": app.status.value if hasattr(app.status, 'value') else app.status,
        "coverLetterText": app.coverLetterText, "answers": app.answers,
        "appliedAt": app.appliedAt, "aiScreeningScore": app.aiScreeningScore, "aiScreeningFeedback": app.aiScreeningFeedback,
        "job": job_dict, "progressions": prog
    }


class ApplyRequest(BaseModel):
    coverLetterText: Optional[str] = ""
    answers: Optional[Any] = None


@router.post("/{job_id}")
def apply_to_job(job_id: str, req: ApplyRequest, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    if user.get("role") != "STUDENT":
        raise HTTPException(status_code=403, detail="Only students can apply")
    student = db.query(StudentProfile).filter(StudentProfile.userId == user["userId"]).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    existing = db.query(Application).filter(Application.jobId == job_id, Application.studentProfileId == student.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already applied to this job")
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    now = datetime.datetime.utcnow()
    if job.applyStartDate and now < job.applyStartDate:
        raise HTTPException(status_code=400, detail="Job applications have not opened yet")
    if job.applyEndDate and now > job.applyEndDate:
        raise HTTPException(status_code=400, detail="Job applications have closed")
    new_app = Application(jobId=job_id, studentProfileId=student.id, coverLetterText=req.coverLetterText or "", answers=req.answers, status=ApplicationStatusEnum.APPLIED, appliedAt=now)
    db.add(new_app)
    db.commit()
    db.refresh(new_app)
    return {"id": new_app.id, "status": "APPLIED", "jobId": job_id}


@router.get("/me")
def get_my_applications(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    if user.get("role") != "STUDENT":
        raise HTTPException(status_code=403, detail="Forbidden")
    student = db.query(StudentProfile).filter(StudentProfile.userId == user["userId"]).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    apps = db.query(Application).options(
        selectinload(Application.job).selectinload(Job.recruiter),
        selectinload(Application.job).selectinload(Job.rounds),
        selectinload(Application.progressions).selectinload(CandidateProgress.round),
        selectinload(Application.progressions).selectinload(CandidateProgress.mcqResponse),
        selectinload(Application.progressions).selectinload(CandidateProgress.codingSubmissions)
    ).filter(Application.studentProfileId == student.id).order_by(Application.appliedAt.desc()).all()
    return [fmt_app(a) for a in apps]


@router.get("/job/{job_id}")
def get_job_applicants(job_id: str, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    if user.get("role") != "RECRUITER":
        raise HTTPException(status_code=403, detail="Forbidden")
    recruiter = db.query(RecruiterProfile).filter(RecruiterProfile.userId == user["userId"]).first()
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job or job.recruiterProfileId != recruiter.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    apps = db.query(Application).options(
        selectinload(Application.job).selectinload(Job.rounds),
        selectinload(Application.progressions).selectinload(CandidateProgress.round),
        selectinload(Application.progressions).selectinload(CandidateProgress.mcqResponse),
        selectinload(Application.progressions).selectinload(CandidateProgress.codingSubmissions),
        selectinload(Application.student).selectinload(StudentProfile.user)
    ).filter(Application.jobId == job_id).order_by(Application.appliedAt.desc()).all()
    result = []
    for a in apps:
        d = fmt_app(a)
        if a.student and a.student.user:
            d["student"] = {"id": a.student.id, "college": a.student.college, "branch": a.student.branch, "cgpa": a.student.cgpa, "skills": a.student.skills, "experience": a.student.experience, "user": {"fullName": a.student.user.fullName, "email": a.student.user.email}}
        result.append(d)
    return result


@router.patch("/{app_id}/status")
def update_status(app_id: str, body: dict, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    if user.get("role") != "RECRUITER":
        raise HTTPException(status_code=403, detail="Forbidden")
    app = db.query(Application).options(selectinload(Application.job)).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    recruiter = db.query(RecruiterProfile).filter(RecruiterProfile.userId == user["userId"]).first()
    if app.job.recruiterProfileId != recruiter.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    new_status = body.get("status")
    app.status = ApplicationStatusEnum[new_status]
    db.commit()
    if new_status == "SHORTLISTED":
        first_round = db.query(InterviewRound).filter(InterviewRound.jobId == app.jobId).order_by(InterviewRound.order.asc()).first()
        if first_round:
            existing_prog = db.query(CandidateProgress).filter(CandidateProgress.applicationId == app_id, CandidateProgress.roundId == first_round.id).first()
            if not existing_prog:
                db.add(CandidateProgress(applicationId=app_id, roundId=first_round.id, status="PENDING"))
            else:
                existing_prog.status = "PENDING"
            db.commit()
    return {"id": app.id, "status": new_status}


@router.patch("/{app_id}/respond")
def respond_to_offer(app_id: str, body: dict, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    if user.get("role") != "STUDENT":
        raise HTTPException(status_code=403, detail="Forbidden")
    response = body.get("response")
    if response not in ["ACCEPTED", "DECLINED"]:
        raise HTTPException(status_code=400, detail="Invalid response")
    student = db.query(StudentProfile).filter(StudentProfile.userId == user["userId"]).first()
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app or app.studentProfileId != student.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    if (app.status.value if hasattr(app.status, 'value') else app.status) != "OFFERED":
        raise HTTPException(status_code=400, detail="No active offer to respond to")
    app.status = ApplicationStatusEnum[response]
    db.commit()
    return {"id": app.id, "status": response}


@router.post("/job/{job_id}/ai-screen")
def ai_screen(job_id: str, body: dict, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    if user.get("role") != "RECRUITER":
        raise HTTPException(status_code=403, detail="Forbidden")
    keywords = body.get("keywords", "")
    if not keywords.strip():
        raise HTTPException(status_code=400, detail="Keywords required")
    recruiter = db.query(RecruiterProfile).filter(RecruiterProfile.userId == user["userId"]).first()
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job or job.recruiterProfileId != recruiter.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    apps = db.query(Application).options(selectinload(Application.student)).filter(Application.jobId == job_id).all()
    kw_list = [k.strip().lower() for k in keywords.split(",") if k.strip()]
    for app in apps:
        score = 0
        feedback = []
        text = " ".join(filter(None, [app.coverLetterText or "", app.student.skills or "", app.student.experience or ""])).lower()
        for kw in kw_list:
            if kw in text:
                score += 1
                feedback.append(f"Found keyword: {kw}")
            else:
                feedback.append(f"Missing keyword: {kw}")
        app.aiScreeningScore = round((score / len(kw_list)) * 100, 1) if kw_list else 0
        app.aiScreeningFeedback = str(feedback)
    db.commit()
    # Return updated list
    updated = db.query(Application).options(
        selectinload(Application.job).selectinload(Job.rounds),
        selectinload(Application.progressions).selectinload(CandidateProgress.round),
        selectinload(Application.progressions).selectinload(CandidateProgress.mcqResponse),
        selectinload(Application.progressions).selectinload(CandidateProgress.codingSubmissions),
        selectinload(Application.student).selectinload(StudentProfile.user)
    ).filter(Application.jobId == job_id).order_by(Application.appliedAt.desc()).all()
    result = []
    for a in updated:
        d = fmt_app(a)
        if a.student and a.student.user:
            d["student"] = {"id": a.student.id, "college": a.student.college, "branch": a.student.branch, "cgpa": a.student.cgpa, "skills": a.student.skills, "experience": a.student.experience, "user": {"fullName": a.student.user.fullName, "email": a.student.user.email}}
        result.append(d)
    return result
