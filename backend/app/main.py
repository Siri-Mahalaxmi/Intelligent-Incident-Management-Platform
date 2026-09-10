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

from app.routes import analysis, incidents, similarity, rca, report

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
app.include_router(similarity.router)
app.include_router(rca.router)
app.include_router(report.router)


@app.on_event("startup")
async def backfill_embeddings():
    """
    On startup, silently generate embeddings for any incidents that don't
    have one yet (e.g. INC-1004, INC-1005 which were seeded without /analyze).
    Runs in the background so it doesn't delay server startup.
    """
    import asyncio

    async def _run():
        try:
            from app.database import supabase_client
            from app.services.embedding_service import generate_and_store_embedding

            response = (
                supabase_client.table("incidents")
                .select("incident_id, embedding")
                .execute()
            )
            rows = response.data or []
            missing = [r["incident_id"] for r in rows if not r.get("embedding")]

            if missing:
                print(f"[startup] Backfilling embeddings for: {missing}")
                for incident_id in missing:
                    try:
                        generate_and_store_embedding(incident_id)
                        print(f"[startup] Embedded {incident_id}")
                    except Exception as exc:
                        print(f"[startup] Failed to embed {incident_id}: {exc}")
            else:
                print("[startup] All incidents already have embeddings.")
        except Exception as exc:
            print(f"[startup] Embedding backfill skipped: {exc}")

    asyncio.create_task(_run())


@app.get("/health", tags=["Health"])
def health_check():
    """Liveness probe — returns 200 when the server is up."""
    return {"status": "ok"}