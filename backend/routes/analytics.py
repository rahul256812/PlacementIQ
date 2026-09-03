from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Application, Job, StudentProfile, RecruiterProfile
from auth import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/student")
def student_analytics(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    if user.get("role") != "STUDENT":
        raise HTTPException(status_code=403, detail="Forbidden")
    student = db.query(StudentProfile).filter(StudentProfile.userId == user["userId"]).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    apps = db.query(Application).filter(Application.studentProfileId == student.id).all()
    status_counts = {"APPLIED": 0, "SHORTLISTED": 0, "OFFERED": 0, "ACCEPTED": 0, "REJECTED": 0, "DECLINED": 0}
    for app in apps:
        s = app.status.value if hasattr(app.status, 'value') else str(app.status)
        if s in status_counts:
            status_counts[s] += 1
    total_open_jobs = db.query(func.count(Job.id)).filter(Job.isOpen == True).scalar()
    return {"totalApplications": len(apps), "applications": status_counts, "totalOpenJobs": total_open_jobs}

@router.get("/recruiter")
def recruiter_analytics(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    if user.get("role") != "RECRUITER":
        raise HTTPException(status_code=403, detail="Forbidden")
    recruiter = db.query(RecruiterProfile).filter(RecruiterProfile.userId == user["userId"]).first()
    if not recruiter:
        raise HTTPException(status_code=404, detail="Recruiter profile not found")
    jobs = db.query(Job).filter(Job.recruiterProfileId == recruiter.id).all()
    total_jobs = len(jobs)
    open_jobs = sum(1 for j in jobs if j.isOpen)
    job_ids = [j.id for j in jobs]
    apps = db.query(Application).filter(Application.jobId.in_(job_ids)).all() if job_ids else []
    status_counts = {"APPLIED": 0, "SHORTLISTED": 0, "OFFERED": 0, "ACCEPTED": 0, "REJECTED": 0, "DECLINED": 0}
    for app in apps:
        s = app.status.value if hasattr(app.status, 'value') else str(app.status)
        if s in status_counts:
            status_counts[s] += 1
    app_count_by_job = {}
    for app in apps:
        app_count_by_job[app.jobId] = app_count_by_job.get(app.jobId, 0) + 1
    jobs_chart_data = [{"title": j.title, "applications": app_count_by_job.get(j.id, 0), "isOpen": j.isOpen} for j in jobs]
    return {"summary": {"totalJobs": total_jobs, "openJobs": open_jobs, "closedJobs": total_jobs - open_jobs, "totalApplications": len(apps)}, "applications": status_counts, "jobsChartData": jobs_chart_data}

@router.get("/admin")
def admin_analytics(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    if user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Forbidden")
    total_students = db.query(func.count(StudentProfile.id)).scalar()
    total_recruiters = db.query(func.count(RecruiterProfile.id)).scalar()
    total_jobs = db.query(func.count(Job.id)).scalar()
    total_apps = db.query(func.count(Application.id)).scalar()
    open_jobs = db.query(func.count(Job.id)).filter(Job.isOpen == True).scalar()
    apps = db.query(Application).all()
    status_counts = {"APPLIED": 0, "SHORTLISTED": 0, "OFFERED": 0, "ACCEPTED": 0, "REJECTED": 0, "DECLINED": 0}
    for app in apps:
        s = app.status.value if hasattr(app.status, 'value') else str(app.status)
        if s in status_counts:
            status_counts[s] += 1
    return {
        "summary": {"totalStudents": total_students, "totalRecruiters": total_recruiters, "totalJobs": total_jobs, "totalApplications": total_apps},
        "jobs": {"open": open_jobs, "closed": total_jobs - open_jobs},
        "applications": status_counts
    }
