import sys
import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super().showPage()
        super().save()

    def draw_header_footer(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 750, "PlacementIQ — Technical & Functional System Specification")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(54, 742, 612 - 54, 742)
            
        # Footer (all pages)
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(612 - 54, 36, page_str)
        self.drawString(54, 36, "PlacementIQ — Enterprise Campus Recruitment System")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(54, 48, 612 - 54, 48)
        
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=64,
        bottomMargin=64
    )

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor("#1E293B"),
        spaceAfter=4
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#475569"),
        spaceAfter=12
    )
    
    h1_style = ParagraphStyle(
        'H1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )
    
    h2_style = ParagraphStyle(
        'H2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor("#1E3A8A"),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155"),
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'Bullet',
        parent=body_style,
        leftIndent=12,
        bulletIndent=4,
        spaceAfter=4
    )

    code_style = ParagraphStyle(
        'Code',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=10.5,
        textColor=colors.HexColor("#0F172A"),
        backColor=colors.HexColor("#F8FAFC"),
        borderColor=colors.HexColor("#E2E8F0"),
        borderWidth=0.5,
        borderPadding=6,
        spaceBefore=4,
        spaceAfter=8
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#1E293B")
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=table_cell_style,
        fontName='Helvetica-Bold'
    )

    story = []

    # Title Block
    story.append(Paragraph("PlacementIQ", title_style))
    story.append(Paragraph("Enterprise Campus Recruitment Management System — Full Specification", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#2563EB"), spaceAfter=12))

    # Metadata Table
    meta_data = [
        [
            Paragraph("<b>Architecture:</b> FastAPI + React 18", table_cell_style),
            Paragraph("<b>Database:</b> PostgreSQL (steps_db)", table_cell_style),
            Paragraph("<b>Version:</b> 2.0 Python Edition", table_cell_style),
            Paragraph("<b>Date:</b> September 2026", table_cell_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[125, 135, 120, 124])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # --- SECTION 1: EXECUTIVE SUMMARY ---
    story.append(Paragraph("1. Executive Summary", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.75, color=colors.HexColor("#CBD5E1"), spaceAfter=6))
    
    exec_summary_text = (
        "<b>PlacementIQ</b> is an end-to-end automated Campus Placement and Recruitment Management System designed to "
        "streamline hiring workflows for educational institutions, corporate recruiters, and student candidates. "
        "The platform bridges the communication gap between university placement cells and corporate talent acquisition teams "
        "by unifying job publication, applicant tracking, multi-stage assessment management, AI-driven candidate keyword screening, "
        "in-app communication, and real-time operational analytics into a cohesive application."
    )
    story.append(Paragraph(exec_summary_text, body_style))

    story.append(Paragraph("Key Value Propositions:", h2_style))
    story.append(Paragraph("• <b>Automated Multi-Stage Pipeline:</b> Enables recruiters to build customized multi-round evaluation tracks (MCQ assessments, live coding challenges, technical interviews, HR rounds).", bullet_style))
    story.append(Paragraph("• <b>AI-Powered Screening Engine:</b> Uses keyword matching algorithms against candidate resumes, skill sets, and cover letters to immediately rank applicants.", bullet_style))
    story.append(Paragraph("• <b>Complete Operational Audit Trail:</b> Logs recruiter actions (job posting, edits, pauses, resumes, and deletions) via structured activity history logs.", bullet_style))
    story.append(Paragraph("• <b>High-Performance Python Architecture:</b> Migrated to FastAPI and SQLAlchemy for async capabilities, type-safe request validation, and high throughput.", bullet_style))

    story.append(Spacer(1, 10))

    # --- SECTION 2: TECHNICAL ARCHITECTURE & STACK ---
    story.append(Paragraph("2. Technical Architecture & Stack", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.75, color=colors.HexColor("#CBD5E1"), spaceAfter=6))
    
    tech_intro = (
        "PlacementIQ operates on a modern decoupled client-server architecture. The React single-page frontend communicates "
        "with the Python FastAPI REST backend over HTTP REST APIs secured by Bearer JWT authentication tokens."
    )
    story.append(Paragraph(tech_intro, body_style))

    tech_table_data = [
        [Paragraph("Layer", table_header_style), Paragraph("Technology / Framework", table_header_style), Paragraph("Key Role & Responsibility", table_header_style)],
        [Paragraph("<b>Frontend SPA</b>", table_cell_bold), Paragraph("React 18, TypeScript, Vite", table_cell_style), Paragraph("Responsive client user interface with dynamic routing, reactive state, and modal management.", table_cell_style)],
        [Paragraph("<b>UI Styling</b>", table_cell_bold), Paragraph("Tailwind CSS, Lucide Icons", table_cell_style), Paragraph("Modern styling framework and icon components.", table_cell_style)],
        [Paragraph("<b>API Client</b>", table_cell_bold), Paragraph("Axios, Custom Service Layer", table_cell_style), Paragraph("Encapsulates endpoints, injects Bearer JWT headers, and handles response handling.", table_cell_style)],
        [Paragraph("<b>Backend Core</b>", table_cell_bold), Paragraph("Python 3.13, FastAPI", table_cell_style), Paragraph("High-performance ASGI REST backend offering auto-generated Swagger docs and async execution.", table_cell_style)],
        [Paragraph("<b>Validation</b>", table_cell_bold), Paragraph("Pydantic v2", table_cell_style), Paragraph("Strict input/output request schema validation and data parsing.", table_cell_style)],
        [Paragraph("<b>Database ORM</b>", table_cell_bold), Paragraph("SQLAlchemy 2.0", table_cell_style), Paragraph("ORM with eager loading (`selectinload`), entity relationships, and cascades.", table_cell_style)],
        [Paragraph("<b>Auth System</b>", table_cell_bold), Paragraph("PyJWT, Native Bcrypt", table_cell_style), Paragraph("Stateless JWT token issuance/verification and salted password hashing.", table_cell_style)],
        [Paragraph("<b>Database Engine</b>", table_cell_bold), Paragraph("PostgreSQL 14+ (`steps_db`)", table_cell_style), Paragraph("Relational data store hosted on port 5431 with foreign key integrity constraints.", table_cell_style)],
        [Paragraph("<b>ASGI Server</b>", table_cell_bold), Paragraph("Uvicorn", table_cell_style), Paragraph("Lightning-fast ASGI web server hosting the FastAPI application.", table_cell_style)]
    ]
    tech_table = Table(tech_table_data, colWidths=[90, 140, 274])
    tech_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(tech_table)

    story.append(Spacer(1, 10))

    # --- SECTION 3: MULTI-ROLE USER HIERARCHY ---
    story.append(Paragraph("3. Multi-Role User Hierarchy", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.75, color=colors.HexColor("#CBD5E1"), spaceAfter=6))
    
    role_desc = "PlacementIQ implements Role-Based Access Control (RBAC) to enforce operational boundaries across three primary roles:"
    story.append(Paragraph(role_desc, body_style))

    roles_table_data = [
        [Paragraph("User Role", table_header_style), Paragraph("Access Scope", table_header_style), Paragraph("Permissions & Core Functions", table_header_style)],
        [
            Paragraph("<b>STUDENT</b>", table_cell_bold),
            Paragraph("Candidate Portal", table_cell_style),
            Paragraph("• View active open job postings.<br/>• Submit applications with custom cover letters and answers.<br/>• Track application statuses (`APPLIED`, `SHORTLISTED`, `OFFERED`, `REJECTED`).<br/>• Respond to active job offers (`ACCEPTED` / `DECLINED`).<br/>• Edit candidate profile (Skills, CGPA, Branch, Experience, Projects).", table_cell_style)
        ],
        [
            Paragraph("<b>RECRUITER</b>", table_cell_bold),
            Paragraph("Employer Dashboard", table_cell_style),
            Paragraph("• Create and publish job openings with custom screening questions.<br/>• Define multi-round interview pipelines (MCQ, Coding, Technical, HR).<br/>• Trigger AI-assisted candidate resume and keyword screening.<br/>• Update applicant statuses across rounds.<br/>• Manage job posting lifecycle (Pause, Resume, Edit, Delete).<br/>• Access job activity audit logs and candidate communication chats.", table_cell_style)
        ],
        [
            Paragraph("<b>ADMIN</b>", table_cell_bold),
            Paragraph("System Admin Panel", table_cell_style),
            Paragraph("• Review and verify pending recruiter account registrations.<br/>• Access global placement analytics (Placement Rate %, Total Placements, Open vs Closed Jobs).<br/>• Monitor university-wide application statistics.", table_cell_style)
        ]
    ]
    roles_table = Table(roles_table_data, colWidths=[80, 100, 324])
    roles_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(roles_table)

    story.append(Spacer(1, 10))

    # --- SECTION 4: KEY BUSINESS WORKFLOWS ---
    story.append(Paragraph("4. Key Business Workflows", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.75, color=colors.HexColor("#CBD5E1"), spaceAfter=6))

    story.append(Paragraph("A. Job Creation & Hiring Pipeline Configuration", h2_style))
    story.append(Paragraph("1. Recruiter submits job metadata (Title, Description, Salary Range, Location, Start/End Dates).", bullet_style))
    story.append(Paragraph("2. Recruiter configures screening questions for candidates to fill out during application.", bullet_style))
    story.append(Paragraph("3. Recruiter adds ordered evaluation rounds (e.g., Round 1: Online MCQ, Round 2: Coding Assessment, Round 3: HR Interview).", bullet_style))
    story.append(Paragraph("4. System saves job entity, binds rounds, and records a <b>POSTED</b> event in <code>JobActivityLog</code>.", bullet_style))

    story.append(Paragraph("B. Candidate Discovery & Application Submission", h2_style))
    story.append(Paragraph("1. Student browses open listings on Candidate Dashboard.", bullet_style))
    story.append(Paragraph("2. Student opens job application modal, inputs cover letter, answers custom screening questions, and submits.", bullet_style))
    story.append(Paragraph("3. System validates constraints (duplicate application check, application window validation).", bullet_style))
    story.append(Paragraph("4. System creates <code>Application</code> entity with initial status <code>APPLIED</code>.", bullet_style))

    story.append(Paragraph("C. AI Keyword Screening & Candidate Shortlisting", h2_style))
    story.append(Paragraph("1. Recruiter triggers AI Screening by submitting target skill keywords (e.g., 'Python, React, PostgreSQL').", bullet_style))
    story.append(Paragraph("2. Backend calculates keyword presence across candidate resume skills, experience, and cover letter text.", bullet_style))
    story.append(Paragraph("3. System computes a percentage match score (0–100%) and generates structured feedback.", bullet_style))
    story.append(Paragraph("4. Recruiter updates candidate status to <code>SHORTLISTED</code>, automatically advancing candidate into Round 1 of <code>CandidateProgress</code>.", bullet_style))

    story.append(Paragraph("D. Job Lifecycle Management & Operational Audit Logging", h2_style))
    story.append(Paragraph("1. Recruiter toggles job state to Paused (<code>isOpen = False</code>). System logs <b>PAUSED</b> activity.", bullet_style))
    story.append(Paragraph("2. Recruiter updates job details. System logs <b>EDITED</b> activity.", bullet_style))
    story.append(Paragraph("3. Recruiter deletes job. System logs <b>DELETED</b> activity and performs cascade cleanup.", bullet_style))

    story.append(Spacer(1, 10))

    # --- SECTION 5: DATABASE ENTITIES & SCHEMA ---
    story.append(Paragraph("5. Database Entities & Schema", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.75, color=colors.HexColor("#CBD5E1"), spaceAfter=6))

    story.append(Paragraph("PlacementIQ relies on a relational model implemented in PostgreSQL:", body_style))

    schema_table_data = [
        [Paragraph("Entity Model", table_header_style), Paragraph("Primary Key & Foreign Keys", table_header_style), Paragraph("Key Attributes & Data Types", table_header_style)],
        [Paragraph("<b>User</b>", table_cell_bold), Paragraph("`id` (UUID)", table_cell_style), Paragraph("`email`, `passwordHash`, `fullName`, `role` (Enum: `STUDENT`, `RECRUITER`, `ADMIN`), `createdAt`.", table_cell_style)],
        [Paragraph("<b>StudentProfile</b>", table_cell_bold), Paragraph("`id`, FK: `userId` -> User", table_cell_style), Paragraph("`college`, `branch`, `graduationYear`, `skills`, `cgpa`, `experience`, `projects`.", table_cell_style)],
        [Paragraph("<b>RecruiterProfile</b>", table_cell_bold), Paragraph("`id`, FK: `userId` -> User", table_cell_style), Paragraph("`companyName`, `designation`, `status` (Enum: `PENDING`, `APPROVED`, `REJECTED`).", table_cell_style)],
        [Paragraph("<b>Job</b>", table_cell_bold), Paragraph("`id`, FK: `recruiterProfileId`", table_cell_style), Paragraph("`title`, `description`, `requirements`, `salaryRange`, `jobType`, `location`, `isOpen`, `questions` (JSON), `applyStartDate`, `applyEndDate`.", table_cell_style)],
        [Paragraph("<b>InterviewRound</b>", table_cell_bold), Paragraph("`id`, FK: `jobId`", table_cell_style), Paragraph("`title`, `type`, `format`, `description`, `instructions`, `order`, `mcqDuration`, `codingDuration`.", table_cell_style)],
        [Paragraph("<b>Application</b>", table_cell_bold), Paragraph("`id`, FK: `jobId`, `studentProfileId`", table_cell_style), Paragraph("`status` (Enum), `coverLetterText`, `answers` (JSON), `aiScreeningScore`, `aiScreeningFeedback`, `appliedAt`.", table_cell_style)],
        [Paragraph("<b>CandidateProgress</b>", table_cell_bold), Paragraph("`id`, FK: `applicationId`, `roundId`", table_cell_style), Paragraph("`status` (`PENDING`, `QUALIFIED`, `REJECTED`), `feedback`, `meetLink`, `isMeetLinkPublished`.", table_cell_style)],
        [Paragraph("<b>JobActivityLog</b>", table_cell_bold), Paragraph("`id`, FK: `recruiterProfileId`", table_cell_style), Paragraph("`jobId`, `jobTitle`, `action` (`POSTED`, `EDITED`, `PAUSED`, `RESUMED`, `DELETED`), `timestamp`, `details`.", table_cell_style)],
        [Paragraph("<b>RoundMessage</b>", table_cell_bold), Paragraph("`id`, FK: `jobId`, `roundId`", table_cell_style), Paragraph("`senderId`, `senderName`, `content`, `createdAt`.", table_cell_style)]
    ]
    schema_table = Table(schema_table_data, colWidths=[100, 130, 274])
    schema_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(schema_table)

    story.append(Spacer(1, 10))

    # --- SECTION 6: BACKEND API ARCHITECTURE ---
    story.append(Paragraph("6. Backend API Architecture", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.75, color=colors.HexColor("#CBD5E1"), spaceAfter=6))

    story.append(Paragraph("FastAPI Router Endpoints Summary:", h2_style))

    api_table_data = [
        [Paragraph("Method", table_header_style), Paragraph("Endpoint Path", table_header_style), Paragraph("Auth & Scope", table_header_style), Paragraph("Description", table_header_style)],
        [Paragraph("POST", table_cell_bold), Paragraph("/api/auth/signup", table_cell_style), Paragraph("Public", table_cell_style), Paragraph("Registers User + Student or Recruiter Profile.", table_cell_style)],
        [Paragraph("POST", table_cell_bold), Paragraph("/api/auth/login", table_cell_style), Paragraph("Public", table_cell_style), Paragraph("Authenticates credentials & returns JWT token.", table_cell_style)],
        [Paragraph("GET", table_cell_bold), Paragraph("/api/auth/profile", table_cell_style), Paragraph("Authenticated", table_cell_style), Paragraph("Fetches authenticated user & profile details.", table_cell_style)],
        [Paragraph("PUT", table_cell_bold), Paragraph("/api/auth/profile", table_cell_style), Paragraph("Authenticated", table_cell_style), Paragraph("Updates candidate skills or recruiter company info.", table_cell_style)],
        [Paragraph("GET", table_cell_bold), Paragraph("/api/jobs/", table_cell_style), Paragraph("Public", table_cell_style), Paragraph("Lists all active/open jobs for candidate view.", table_cell_style)],
        [Paragraph("GET", table_cell_bold), Paragraph("/api/jobs/me", table_cell_style), Paragraph("RECRUITER", table_cell_style), Paragraph("Fetches recruiter's posted jobs with application counts.", table_cell_style)],
        [Paragraph("GET", table_cell_bold), Paragraph("/api/jobs/history", table_cell_style), Paragraph("RECRUITER", table_cell_style), Paragraph("Fetches recruiter's activity audit logs.", table_cell_style)],
        [Paragraph("POST", table_cell_bold), Paragraph("/api/jobs/", table_cell_style), Paragraph("RECRUITER", table_cell_style), Paragraph("Posts new job opportunity and logs POSTED event.", table_cell_style)],
        [Paragraph("GET", table_cell_bold), Paragraph("/api/jobs/{id}", table_cell_style), Paragraph("Public", table_cell_style), Paragraph("Gets job details with screening questions & rounds.", table_cell_style)],
        [Paragraph("PUT", table_cell_bold), Paragraph("/api/jobs/{id}", table_cell_style), Paragraph("RECRUITER", table_cell_style), Paragraph("Updates job info or toggles open/paused state.", table_cell_style)],
        [Paragraph("DELETE", table_cell_bold), Paragraph("/api/jobs/{id}", table_cell_style), Paragraph("RECRUITER", table_cell_style), Paragraph("Deletes job posting with cascade cleanup.", table_cell_style)],
        [Paragraph("POST", table_cell_bold), Paragraph("/api/jobs/{id}/rounds", table_cell_style), Paragraph("RECRUITER", table_cell_style), Paragraph("Saves interview round pipeline definitions.", table_cell_style)],
        [Paragraph("GET / POST", table_cell_bold), Paragraph("/api/jobs/{id}/messages", table_cell_style), Paragraph("Authenticated", table_cell_style), Paragraph("Fetches and posts in-app candidate messages.", table_cell_style)],
        [Paragraph("POST", table_cell_bold), Paragraph("/api/applications/{jobId}", table_cell_style), Paragraph("STUDENT", table_cell_style), Paragraph("Submits application with cover letter & answers.", table_cell_style)],
        [Paragraph("GET", table_cell_bold), Paragraph("/api/applications/me", table_cell_style), Paragraph("STUDENT", table_cell_style), Paragraph("Gets candidate application tracking history.", table_cell_style)],
        [Paragraph("GET", table_cell_bold), Paragraph("/api/applications/job/{id}", table_cell_style), Paragraph("RECRUITER", table_cell_style), Paragraph("Gets all candidate applications submitted for a job.", table_cell_style)],
        [Paragraph("PATCH", table_cell_bold), Paragraph("/api/applications/{id}/status", table_cell_style), Paragraph("RECRUITER", table_cell_style), Paragraph("Updates candidate status (SHORTLISTED, OFFERED).", table_cell_style)],
        [Paragraph("PATCH", table_cell_bold), Paragraph("/api/applications/{id}/respond", table_cell_style), Paragraph("STUDENT", table_cell_style), Paragraph("Student accepts or declines active offer.", table_cell_style)],
        [Paragraph("POST", table_cell_bold), Paragraph("/api/applications/job/{id}/ai-screen", table_cell_style), Paragraph("RECRUITER", table_cell_style), Paragraph("Executes AI keyword screening on applicants.", table_cell_style)],
        [Paragraph("GET", table_cell_bold), Paragraph("/api/analytics/student", table_cell_style), Paragraph("STUDENT", table_cell_style), Paragraph("Student metrics & active job counts.", table_cell_style)],
        [Paragraph("GET", table_cell_bold), Paragraph("/api/analytics/recruiter", table_cell_style), Paragraph("RECRUITER", table_cell_style), Paragraph("Recruiter jobs chart data & status counts.", table_cell_style)],
        [Paragraph("GET", table_cell_bold), Paragraph("/api/analytics/admin", table_cell_style), Paragraph("ADMIN", table_cell_style), Paragraph("System-wide metrics & placement rate %.", table_cell_style)]
    ]
    api_table = Table(api_table_data, colWidths=[55, 145, 85, 219])
    api_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 4.5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4.5),
    ]))
    story.append(api_table)

    story.append(Spacer(1, 10))

    # --- SECTION 7: REPOSITORY STRUCTURE ---
    story.append(Paragraph("7. Repository Structure", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.75, color=colors.HexColor("#CBD5E1"), spaceAfter=6))

    repo_structure = """PlacementIQ/
├── backend/
│   ├── venv/                   # Python 3.13 Virtual Environment
│   ├── models.py               # SQLAlchemy ORM Database Models (User, Job, Application, etc.)
│   ├── database.py             # Database engine & SessionLocal provider
│   ├── auth.py                 # JWT token generation, verification & bcrypt password utilities
│   ├── main.py                 # FastAPI application entry point & CORS configuration
│   ├── routes/
│   │   ├── auth.py             # Auth & profile management routes
│   │   ├── jobs.py             # Jobs CRUD, rounds config, activity history & messaging
│   │   ├── applications.py     # Job applications, recruiter candidate management & AI screening
│   │   ├── analytics.py        # Real-time metrics for Student, Recruiter & Admin
│   │   ├── rounds.py           # Evaluation round management
│   │   └── admin.py            # Admin profile approvals & system controls
│   └── .env                    # Environment variables (DB Connection: localhost:5431/steps_db)
│
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable UI components & modals
│   │   ├── pages/              # View pages (StudentDashboard, RecruiterDashboard, AdminDashboard, Auth)
│   │   ├── services/
│   │   │   └── api.ts          # Axios API service encapsulation layer
│   │   ├── App.tsx             # Main React Router setup
│   │   └── main.tsx            # React application entry point
│   ├── package.json            # Node.js dependencies (React, Vite, Lucide Icons, Axios)
│   └── .env                    # Frontend environment variables (VITE_API_URL=http://127.0.0.1:8000/api)
│
└── README.md                   # Project setup & usage instructions"""

    story.append(Paragraph(repo_structure.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style))

    doc.build(story, canvasmaker=NumberedCanvas)
    print("PDF build complete:", filename)

if __name__ == "__main__":
    out_pdf = "/Users/rahul/.gemini/antigravity/brain/b6abab57-fc85-44e6-8d9a-40a73f49560e/PlacementIQ_System_Documentation.pdf"
    build_pdf(out_pdf)
