"""
Similarity routes — protected by JWT authentication.

POST /incidents/{incident_id}/embed
POST /incidents/{incident_id}/similar
POST /embed-all
"""

from fastapi import APIRouter, Depends, Query

from app.auth import get_current_user
from app.models.incident import SimilarIncidentsResponse
from app.services.embedding_service import (
    find_similar_incidents,
    generate_and_store_embedding,
)
from app.services.profile_service import UserProfile

router = APIRouter(prefix="/incidents", tags=["Similarity"])


@router.post("/{incident_id}/embed", status_code=200)
def embed_incident(
    incident_id: str,
    user: UserProfile = Depends(get_current_user),
):
    """Generate and persist a vector embedding for the given incident."""
    generate_and_store_embedding(incident_id)
    return {"incident_id": incident_id, "status": "embedding stored"}


@router.post("/embed-all", status_code=200, tags=["Similarity"])
def embed_all_incidents(user: UserProfile = Depends(get_current_user)):
    """
    Backfill embeddings for every incident that does not have one yet.
    central_admin only.
    """
    from app.auth import require_central_admin
    require_central_admin(user)

    from app.database import supabase_client
    response = (
        supabase_client.table("incidents")
        .select("incident_id, embedding")
        .execute()
    )

    rows = response.data or []
    missing = [r["incident_id"] for r in rows if not r.get("embedding")]

    results = {
        "embedded": [],
        "failed": [],
        "already_had_embedding": len(rows) - len(missing),
    }

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
    user: UserProfile = Depends(get_current_user),
    threshold: float = Query(default=0.5, ge=0.0, le=1.0),
    limit: int = Query(default=3, ge=1, le=10),
):
    """
    Find past incidents semantically similar to the given incident.
    Org users only see similar incidents within their own organization.
    """
    org_id = None if user.is_central_admin else user.organization_id
    similar = find_similar_incidents(
        incident_id=incident_id,
        match_threshold=threshold,
        match_count=limit,
        organization_id=org_id,
    )
    return SimilarIncidentsResponse(incident_id=incident_id, similar=similar)
