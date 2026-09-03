import uuid
import datetime
import enum
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Enum, JSON
from sqlalchemy.orm import relationship
from database import Base

class RoleEnum(str, enum.Enum):
    STUDENT = "STUDENT"
    RECRUITER = "RECRUITER"
    ADMIN = "ADMIN"

class ApplicationStatusEnum(str, enum.Enum):
    APPLIED = "APPLIED"
    SHORTLISTED = "SHORTLISTED"
    REJECTED = "REJECTED"
    OFFERED = "OFFERED"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"

class RecruiterStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "User"
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True)
    passwordHash = Column(String)
    role = Column(Enum(RoleEnum), default=RoleEnum.STUDENT)
    fullName = Column(String)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
    
    studentProfile = relationship("StudentProfile", back_populates="user", uselist=False)
    recruiterProfile = relationship("RecruiterProfile", back_populates="user", uselist=False)

class StudentProfile(Base):
    __tablename__ = "StudentProfile"
    id = Column(String, primary_key=True, default=generate_uuid)
    userId = Column(String, ForeignKey("User.id"), unique=True)
    college = Column(String, nullable=True)
    branch = Column(String, nullable=True)
    graduationYear = Column(Integer, nullable=True)
    skills = Column(String, nullable=True)
    cgpa = Column(Float, nullable=True)
    experience = Column(String, nullable=True)
    projects = Column(String, nullable=True)
    
    user = relationship("User", back_populates="studentProfile")
    applications = relationship("Application", back_populates="student")

class RecruiterProfile(Base):
    __tablename__ = "RecruiterProfile"
    id = Column(String, primary_key=True, default=generate_uuid)
    userId = Column(String, ForeignKey("User.id"), unique=True)
    companyName = Column(String)
    designation = Column(String)
    status = Column(Enum(RecruiterStatusEnum), default=RecruiterStatusEnum.PENDING)
    
    user = relationship("User", back_populates="recruiterProfile")
    jobs = relationship("Job", back_populates="recruiter")
    activityLogs = relationship("JobActivityLog", back_populates="recruiter")

class Job(Base):
    __tablename__ = "Job"
    id = Column(String, primary_key=True, default=generate_uuid)
    recruiterProfileId = Column(String, ForeignKey("RecruiterProfile.id"))
    title = Column(String)
    description = Column(String)
    requirements = Column(String)
    salaryRange = Column(String, nullable=True)
    jobType = Column(String, nullable=True)
    location = Column(String, nullable=True)
    isOpen = Column(Boolean, default=True)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
    questions = Column(JSON, nullable=True)
    applyEndDate = Column(DateTime, nullable=True)
    applyStartDate = Column(DateTime, nullable=True)
    
    recruiter = relationship("RecruiterProfile", back_populates="jobs")
    applications = relationship("Application", back_populates="job")
    rounds = relationship("InterviewRound", back_populates="job")
    roundMessages = relationship("RoundMessage", back_populates="job")

class Application(Base):
    __tablename__ = "Application"
    id = Column(String, primary_key=True, default=generate_uuid)
    jobId = Column(String, ForeignKey("Job.id", ondelete="CASCADE"))
    studentProfileId = Column(String, ForeignKey("StudentProfile.id"))
    status = Column(Enum(ApplicationStatusEnum), default=ApplicationStatusEnum.APPLIED)
    coverLetterText = Column(String)
    appliedAt = Column(DateTime, default=datetime.datetime.utcnow)
    answers = Column(JSON, nullable=True)
    aiScreeningScore = Column(Float, nullable=True)
    aiScreeningFeedback = Column(String, nullable=True)
    
    job = relationship("Job", back_populates="applications")
    student = relationship("StudentProfile", back_populates="applications")
    progressions = relationship("CandidateProgress", back_populates="application")

class InterviewRound(Base):
    __tablename__ = "InterviewRound"
    id = Column(String, primary_key=True, default=generate_uuid)
    jobId = Column(String, ForeignKey("Job.id", ondelete="CASCADE"))
    title = Column(String)
    type = Column(String)
    format = Column(String)
    description = Column(String, nullable=True)
    instructions = Column(String, nullable=True)
    order = Column(Integer)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
    isMcqPublished = Column(Boolean, default=False)
    isCodingPublished = Column(Boolean, default=False)
    isMcqResultReleased = Column(Boolean, default=False)
    mcqDuration = Column(Integer, nullable=True)
    endDate = Column(DateTime, nullable=True)
    startDate = Column(DateTime, nullable=True)
    codingDuration = Column(Integer, nullable=True)
    
    job = relationship("Job", back_populates="rounds")
    progressions = relationship("CandidateProgress", back_populates="round")
    codingQuestions = relationship("CodingQuestion", back_populates="round")
    mcqQuestions = relationship("McqQuestion", back_populates="round")
    messages = relationship("RoundMessage", back_populates="round")

class CandidateProgress(Base):
    __tablename__ = "CandidateProgress"
    id = Column(String, primary_key=True, default=generate_uuid)
    applicationId = Column(String, ForeignKey("Application.id", ondelete="CASCADE"))
    roundId = Column(String, ForeignKey("InterviewRound.id", ondelete="CASCADE"))
    status = Column(String, default="PENDING")
    feedback = Column(String, nullable=True)
    updatedAt = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    codingTestExited = Column(Boolean, default=False)
    meetLink = Column(String, nullable=True)
    isMeetLinkPublished = Column(Boolean, default=False)
    
    application = relationship("Application", back_populates="progressions")
    round = relationship("InterviewRound", back_populates="progressions")
    codingSubmissions = relationship("CandidateCodingSub", back_populates="progress")
    mcqResponse = relationship("CandidateMcqResponse", back_populates="progress", uselist=False)

class RoundMessage(Base):
    __tablename__ = "RoundMessage"
    id = Column(String, primary_key=True, default=generate_uuid)
    jobId = Column(String, ForeignKey("Job.id", ondelete="CASCADE"))
    roundId = Column(String, ForeignKey("InterviewRound.id", ondelete="CASCADE"), nullable=True)
    senderId = Column(String)
    senderName = Column(String)
    content = Column(String)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
    
    job = relationship("Job", back_populates="roundMessages")
    round = relationship("InterviewRound", back_populates="messages")

class JobActivityLog(Base):
    __tablename__ = "JobActivityLog"
    id = Column(String, primary_key=True, default=generate_uuid)
    recruiterProfileId = Column(String, ForeignKey("RecruiterProfile.id", ondelete="CASCADE"))
    jobId = Column(String, nullable=True)
    jobTitle = Column(String)
    action = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    details = Column(String, nullable=True)
    
    recruiter = relationship("RecruiterProfile", back_populates="activityLogs")

class McqQuestion(Base):
    __tablename__ = "McqQuestion"
    id = Column(String, primary_key=True, default=generate_uuid)
    roundId = Column(String, ForeignKey("InterviewRound.id", ondelete="CASCADE"))
    questionText = Column(String)
    imageBlob = Column(String, nullable=True)
    type = Column(String)
    options = Column(JSON)
    correctAnswers = Column(JSON)
    marks = Column(Integer, default=1)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
    duration = Column(Integer, nullable=True)
    
    round = relationship("InterviewRound", back_populates="mcqQuestions")

class CandidateMcqResponse(Base):
    __tablename__ = "CandidateMcqResponse"
    id = Column(String, primary_key=True, default=generate_uuid)
    candidateProgressId = Column(String, ForeignKey("CandidateProgress.id", ondelete="CASCADE"), unique=True)
    answers = Column(JSON)
    score = Column(Float, nullable=True)
    totalPossibleMarks = Column(Float, nullable=True)
    submittedAt = Column(DateTime, default=datetime.datetime.utcnow)
    timeTaken = Column(Integer, nullable=True)
    
    progress = relationship("CandidateProgress", back_populates="mcqResponse")

class CodingQuestion(Base):
    __tablename__ = "CodingQuestion"
    id = Column(String, primary_key=True, default=generate_uuid)
    roundId = Column(String, ForeignKey("InterviewRound.id", ondelete="CASCADE"))
    title = Column(String)
    description = Column(String)
    constraints = Column(String, nullable=True)
    imageBlob = Column(String, nullable=True)
    starterCode = Column(JSON)
    marks = Column(Integer, default=10)
    maxRunAttempts = Column(Integer, nullable=True)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
    
    round = relationship("InterviewRound", back_populates="codingQuestions")
    submissions = relationship("CandidateCodingSub", back_populates="question")
    testCases = relationship("CodingTestCase", back_populates="question")

class CodingTestCase(Base):
    __tablename__ = "CodingTestCase"
    id = Column(String, primary_key=True, default=generate_uuid)
    questionId = Column(String, ForeignKey("CodingQuestion.id", ondelete="CASCADE"))
    input = Column(String)
    expectedOutput = Column(String)
    isHidden = Column(Boolean, default=False)
    
    question = relationship("CodingQuestion", back_populates="testCases")

class CandidateCodingSub(Base):
    __tablename__ = "CandidateCodingSub"
    id = Column(String, primary_key=True, default=generate_uuid)
    candidateProgressId = Column(String, ForeignKey("CandidateProgress.id", ondelete="CASCADE"))
    codingQuestionId = Column(String, ForeignKey("CodingQuestion.id", ondelete="CASCADE"))
    code = Column(String)
    language = Column(String)
    status = Column(String)
    passedCasesCount = Column(Integer)
    totalCasesCount = Column(Integer)
    score = Column(Float)
    runtimeMessage = Column(String, nullable=True)
    submittedAt = Column(DateTime, default=datetime.datetime.utcnow)
    timeTaken = Column(Integer, nullable=True)
    
    progress = relationship("CandidateProgress", back_populates="codingSubmissions")
    question = relationship("CodingQuestion", back_populates="submissions")

