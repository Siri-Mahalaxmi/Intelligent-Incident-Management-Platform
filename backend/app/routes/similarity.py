"""
Similarity routes.

POST /incidents/{incident_id}/embed   — generate & store embedding for one incident
POST /incidents/{incident_id}/similar — find semantically similar past incidents
POST /embed-all                        — backfill embeddings for all incidents missing one
"""

from fastapi import APIRouter, Query

from app.models.incident import SimilarIncidentsResponse
from app.services.embedding_service import (
    find_similar_incidents,
    generate_and_store_embedding,
)

router = APIRouter(prefix="/incidents", tags=["Similarity"])


@router.post("/{incident_id}/embed", status_code=200)
def embed_incident(incident_id: str):
    """
    Generate and persist a vector embedding for the given incident.

    Call this once per incident before using the /similar endpoint.
    The /analyze endpoint calls this automatically, so manual calls
    are only needed when backfilling existing incidents.

    - **incident_id**: human-readable ID, e.g. `INC-1001`
    """
    generate_and_store_embedding(incident_id)
    return {"incident_id": incident_id, "status": "embedding stored"}


@router.post("/embed-all", status_code=200, tags=["Similarity"])
def embed_all_incidents():
    """
    Backfill embeddings for every incident that does not have one yet.

    Safe to call multiple times — skips incidents that already have embeddings.
    Useful after seeding new historical incidents (e.g. INC-1004, INC-1005).
    """
    from app.database import supabase_client

    # Fetch all incidents that have no embedding
    response = (
        supabase_client.table("incidents")
        .select("incident_id, embedding")
        .execute()
    )

    rows = response.data or []
    missing = [r["incident_id"] for r in rows if not r.get("embedding")]

    results = {"embedded": [], "failed": [], "already_had_embedding": len(rows) - len(missing)}

    for incident_id in missing:
        try:
            generate_and_store_embedding(incident_id)
            results["embedded"].append(incident_id)
        except Exception as exc:
            results["failed"].append({"incident_id": incident_id, "error": str(exc)})

    return results


@router.post("/{incident_id}/similar", response_model=SimilarIncidentsResponse)
def similar_incidents(
    incident_id: str,
    threshold: float = Query(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Minimum cosine similarity score (0–1). Higher = stricter match.",
    ),
    limit: int = Query(
        default=3,
        ge=1,
        le=10,
        description="Maximum number of similar incidents to return.",
    ),
):
    """
    Find past incidents semantically similar to the given incident.

    Uses pgvector cosine similarity on pre-computed Gemini embeddings.
    If the incident has no embedding yet, one is generated on the fly.

    Returns up to `limit` results with similarity >= `threshold`,
    ordered from most to least similar.

    - **incident_id**: human-readable ID, e.g. `INC-1001`
    - **threshold**: minimum similarity score (default 0.5)
    - **limit**: max results to return (default 3, max 10)
    """
    similar = find_similar_incidents(
        incident_id=incident_id,
        match_threshold=threshold,
        match_count=limit,
    )
    return SimilarIncidentsResponse(
        incident_id=incident_id,
        similar=similar,
    )
