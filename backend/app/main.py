# ---------------------------------------------------------------------------
# Load .env FIRST — before any other import.
# ai/log_analysis_agent.py executes os.environ["GEMINI_API_KEY"] at module
# level when it is first imported, so the env must be populated before any
# import chain reaches that module.
# ---------------------------------------------------------------------------
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

# ---------------------------------------------------------------------------
# All application imports come after the env is loaded.
# ---------------------------------------------------------------------------
from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware

from app.routes import analysis, incidents

app = FastAPI(
    title="Intelligent Incident Management Platform",
    description="Backend API for managing and AI-analysing operational incidents.",
    version="1.0.0",
)


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(incidents.router)
app.include_router(analysis.router)


@app.get("/health", tags=["Health"])
def health_check():
    """Liveness probe — returns 200 when the server is up."""
    return {"status": "ok"}