from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="PlacementIQ API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Update this to the specific frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to PlacementIQ Python Backend API"}

from routes import auth
app.include_router(auth.router)
from routes import jobs
app.include_router(jobs.router)
from routes import applications, rounds, admin, analytics
app.include_router(applications.router)
app.include_router(rounds.router)
app.include_router(admin.router)
app.include_router(analytics.router)
