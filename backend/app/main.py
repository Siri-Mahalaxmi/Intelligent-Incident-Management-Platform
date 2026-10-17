# ---------------------------------------------------------------------------
# Load .env FIRST — before any other import.
# ---------------------------------------------------------------------------
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware

from app.routes import analysis, incidents, similarity, rca, report
from app.routes import admin, profile

app = FastAPI(
    title="Intelligent Incident Management Platform",
    description="Multi-tenant backend API for managing and AI-analysing operational incidents.",
    version="2.0.0",
)


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


# ---------------------------------------------------------------------------
# CORS — allow frontend origins
# ---------------------------------------------------------------------------
_allowed_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8080",
]
# Add production origin from env if set
_prod_origin = os.environ.get("FRONTEND_ORIGIN")
if _prod_origin:
    _allowed_origins.append(_prod_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(profile.router)
app.include_router(incidents.router)
app.include_router(analysis.router)
app.include_router(similarity.router)
app.include_router(rca.router)
app.include_router(report.router)
app.include_router(admin.router)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@app.get("/health", tags=["Health"])
def health_check():
    """Liveness probe — returns 200 when the server is up."""
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Startup: backfill embeddings for any incidents missing one
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def backfill_embeddings():
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
