# PlacementIQ

PlacementIQ is a comprehensive campus placement management platform. It bridges the gap between students and recruiters by providing a seamless interface to handle job applications, coding assessments, multiple-choice questions (MCQs), and robust administrator analytics.

## Tech Stack

**Frontend:**
- React 19
- Vite
- Tailwind CSS v4
- React Router DOM
- Lucide React (Icons)
- Axios

**Backend:**
- Node.js & Express.js
- Prisma (ORM)
- PostgreSQL
- JWT Authentication & bcrypt

---

## Features

- **Student Dashboard:** Browse job openings, apply with custom questionnaires/cover letters, take integrated MCQ and Coding assessments, and chat directly with recruiters.
- **Recruiter Dashboard:** Post new job openings, manage multiple interview rounds (MCQ & Coding), review student applications, approve/reject candidates, and track hiring analytics.
- **Admin Dashboard:** Monitor overall platform activity, review key placement metrics (placement rate, active jobs, top recruiters), and approve/reject recruiter accounts.
- **Assessments:** Built-in IDE for coding assessments featuring custom test cases and a seamless MCQ runner with timer configurations.

---

## Local Development Setup

To run this project locally, you will need Node.js and PostgreSQL installed.

### 1. Database Setup
1. Make sure you have a PostgreSQL database running.
2. Create a new database for the project (e.g., `placementiq`).

### 2. Backend Setup
Navigate to the `backend` directory:
```bash
cd backend
```

Install the dependencies:
```bash
npm install
```

Configure your environment variables by creating a `.env` file in the `backend` folder:
```env
# Example .env file
PORT=3000
DATABASE_URL="postgresql://username:password@localhost:5432/placementiq"
JWT_SECRET="your-super-secret-jwt-key"
FRONTEND_URL="http://localhost:5173"
```

Push the Prisma schema to your database to create the necessary tables:
```bash
npx prisma db push
```

Start the backend development server:
```bash
npm run dev
```

### 3. Frontend Setup
Open a new terminal window and navigate to the `frontend` directory:
```bash
cd frontend
```

Install the dependencies:
```bash
npm install
```

Configure your environment variables by creating a `.env` file in the `frontend` folder:
```env
VITE_API_URL=http://localhost:3000/api
```

Start the frontend Vite server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

---

## Deployment Information

- **Frontend:** Typically deployed on Vercel. Make sure to configure `VITE_API_URL` to point to your live backend server. The repository includes a `vercel.json` file designed for React Router Single Page Application (SPA) redirects.
- **Backend:** Typically deployed on Render or Heroku. Ensure you configure your production `DATABASE_URL`, `JWT_SECRET`, and set the `FRONTEND_URL` to your live Vercel domain to avoid CORS issues. Ensure the build command runs `prisma generate && tsc`.

---

## License
Private / Proprietary.
