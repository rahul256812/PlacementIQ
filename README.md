# PlacementIQ — Campus Placement & Recruitment Management System

PlacementIQ is a high-performance, automated Campus Placement and Recruitment Management Platform. It bridges the gap between university placement cells, corporate recruiters, and student candidates by offering streamlined job postings, multi-stage evaluation pipelines, AI-assisted keyword screening, real-time activity logging, and role-based analytics.

---

## 🛠️ Tech Stack

### **Frontend**
* **Framework:** React 18 with Vite (TypeScript)
* **Styling:** Tailwind CSS, Lucide Icons
* **API Client:** Axios (Modular API Service Layer)

### **Backend (Python FastAPI)**
* **Language & Framework:** Python 3.13 + FastAPI (ASGI)
* **Database ORM:** SQLAlchemy 2.0 (Mapped to PostgreSQL)
* **Data Validation:** Pydantic v2
* **Authentication:** Stateless JWT (`PyJWT`) + Salted Password Hashing (`Bcrypt`)
* **ASGI Server:** Uvicorn

### **Database**
* **Database Engine:** PostgreSQL (`steps_db`)

---

## ✨ Features

### 🎓 **Student / Candidate Portal**
* **Job Discovery:** View open corporate job opportunities with complete requirement breakdowns.
* **Streamlined Applications:** Submit applications with custom cover letters and recruiter screening questions.
* **Application Tracker:** Monitor application status in real-time (`APPLIED`, `SHORTLISTED`, `OFFERED`, `REJECTED`).
* **Offer Management:** Accept or decline job offers directly from the dashboard.
* **Profile Management:** Maintain academic history, skills, CGPA, graduation year, and project portfolios.

### 🏢 **Recruiter Dashboard**
* **Job Posting & Custom Questions:** Create job openings with custom candidate screening questionnaires.
* **Multi-Stage Evaluation Pipelines:** Build customized interview rounds (MCQ, Coding, Technical, HR).
* **AI Candidate Screening:** Automatically calculate resume and skill keyword match scores (0–100%) against job descriptions.
* **Applicant Tracking & Shortlisting:** Review applications, assess candidate profiles, and advance top candidates.
* **Lifecycle & Audit Logging:** Pause, resume, edit, or delete job postings with automated activity logging.
* **In-App Messaging:** Communicate directly with candidates per job listing.

### 📊 **Administrator Control Panel**
* **System-Wide Analytics:** Monitor placement rates (%), total placements, open vs closed jobs, and status breakdowns.
* **Recruiter Verification:** Review and approve pending recruiter account registrations.

---

## ⚡ Local Development Setup

### **Prerequisites**
* Python 3.11+
* Node.js 18+
* PostgreSQL running locally (e.g. port `5431` with database `steps_db`)

---

### **1. Backend Setup (FastAPI)**

Navigate to the `backend` directory:
```bash
cd backend
```

Create and activate a Python virtual environment:
```bash
# macOS/Linux
python3 -m venv venv
source venv/bin/activate

# Windows
python -m venv venv
venv\Scripts\activate
```

Install Python dependencies:
```bash
pip install -r requirements.txt
```

Create a `.env` file inside the `backend` folder:
```env
DATABASE_URL=postgresql://username:password@localhost:5431/steps_db
JWT_SECRET=supersecret_jwt_key_for_steps_app
```

Start the FastAPI ASGI development server:
```bash
uvicorn main:app --port 8000 --reload
```

* **Backend API Base:** `http://127.0.0.1:8000`
* **Swagger Interactive Docs:** `http://127.0.0.1:8000/docs`

---

### **2. Frontend Setup (React + Vite)**

Open a new terminal window and navigate to the `frontend` directory:
```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend` folder:
```env
VITE_API_URL=http://127.0.0.1:8000/api
```

Start the Vite development server:
```bash
npm run dev
```

The frontend application will be running at `http://localhost:5173`.

---

## 🚀 Deployment Guide

### **Frontend (Vercel)**
1. Connect the GitHub repository to **Vercel**.
2. Set Environment Variable: `VITE_API_URL=https://your-backend-render-url.onrender.com/api`
3. Vercel uses the included `vercel.json` for React Router single-page application (SPA) rewrite handling.

### **Backend (Render)**
1. Connect the GitHub repository to **Render** as a Web Service.
2. Configure settings:
   * **Language:** `Python 3`
   * **Root Directory:** `backend`
   * **Build Command:** `pip install -r requirements.txt`
   * **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. Add Environment Variables:
   * `DATABASE_URL` (Hosted PostgreSQL string)
   * `JWT_SECRET`

*(Note: The repository also includes a `render.yaml` Blueprint for automatic configuration on Render).*

---

## 📁 Repository Structure

```
PlacementIQ/
├── backend/
│   ├── models.py               # SQLAlchemy ORM Database Models
│   ├── database.py             # DB Engine & Session provider
│   ├── auth.py                 # JWT issuance, decoding & bcrypt utilities
│   ├── main.py                 # FastAPI application entry point & CORS
│   ├── requirements.txt        # Python package requirements
│   └── routes/
│       ├── auth.py             # Authentication & profile routes
│       ├── jobs.py             # Job CRUD, round pipelines, logs & messages
│       ├── applications.py     # Application processing & AI screening
│       ├── analytics.py        # Student, Recruiter & Admin metrics
│       ├── rounds.py           # Interview round management
│       └── admin.py            # Admin profile approvals
│
├── frontend/
│   ├── src/
│   │   ├── components/         # Modals, UI layouts & cards
│   │   ├── pages/              # Dashboards (Student, Recruiter, Admin)
│   │   ├── services/api.ts     # Axios API service layer
│   │   ├── App.tsx             # Main React Router
│   │   └── main.tsx            # React entry
│   ├── vercel.json             # SPA router rewrite config
│   └── package.json
│
├── render.yaml                 # Render infrastructure-as-code configuration
├── PlacementIQ_System_Documentation.pdf
└── README.md
```

---

## 📄 License
Private / Proprietary.
